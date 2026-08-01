'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { wrapIndex } from '@/registry/lib/wrap';
import { clamp } from '@/registry/lib/damp';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Web Audio Scheduling Kit
   --------------------------------------------------------------------------
   A sequencer has two clocks and neither one can do the other's job.

   `AudioContext.currentTime` is exact — it is a sample counter, it never
   drifts, and anything you schedule against it is rendered on the audio
   thread whatever the main thread is doing. But you cannot be *notified* by
   it; there is no "wake me at 1.75 seconds".

   `setInterval` can notify you, but its accuracy is whatever the main thread
   has left over. A single 90 ms layout pass is enough to put a note audibly
   off the beat, and a hidden tab clamps it to one call per second.

   Lookahead is the resolution. The timer runs far more often than the tempo
   and its only job is to ask "which beats fall inside the next `lookahead`
   seconds?" — every one of those is scheduled onto the audio clock with an
   exact time. The timer may fire early, late, or twice in a row; the notes
   land in the same place regardless, because the timer never decides *when*
   a note plays, only *when it is queued*.

   Nothing starts until `start()` is called, and `start()` must be called
   from a user gesture: an `AudioContext` constructed outside one is
   `suspended`, and notes scheduled on a suspended context are discarded
   without an error.
   ========================================================================== */

export interface ScheduledBeat {
  /** Exact audio-clock time, in seconds. Pass this straight to `osc.start`. */
  time: number;
  /** Monotonic beat count since `start()`. */
  beat: number;
  /** `beat` wrapped into `[0, steps)`. */
  step: number;
  ctx: AudioContext;
}

export interface UseWebAudioSchedulerOptions {
  bpm?: number;
  /** Beats per bar. Only affects the wrapped `step` index. */
  steps?: number;
  /** Seconds of lookahead. Must exceed the worst-case timer gap. */
  lookahead?: number;
  /** How often the scheduling timer runs, in milliseconds. */
  intervalMs?: number;
  /**
   * Called once per beat, `lookahead` seconds early, on the timer. Schedule
   * audio here against `beat.time` — never against `Date.now()`.
   */
  onBeat?: (beat: ScheduledBeat) => void;
}

export interface WebAudioScheduler {
  /** Constructs and resumes the context, then starts the timer. Gesture only. */
  start: () => void;
  stop: () => void;
  running: boolean;
  /** The step that is audible right now, or `null` before the first beat. */
  step: number | null;
  /** Progress through the current beat, 0-1. Pinned at 0 for reduced motion. */
  phase: RefObject<number>;
}

export interface ToneOptions {
  frequency: number;
  /** Audio-clock time to sound, from `ScheduledBeat.time`. */
  at: number;
  gain?: number;
  /** Seconds from peak to -60 dB. */
  decay?: number;
  type?: OscillatorType;
}

// #region critical
/** `exponentialRampToValueAtTime` is undefined at 0, so silence is -60 dB. */
const SILENCE = 0.001;
/** Seconds after the ramp before `stop()`, so the cut is inaudible. */
const TAIL = 0.05;
/** Seconds before the first beat, absorbing the cost of `start()` itself. */
const START_LEAD = 0.08;
/** Lookahead used while the tab is hidden, in seconds. */
const HIDDEN_LOOKAHEAD = 1.5;

interface QueuedBeat {
  time: number;
  step: number;
}

/**
 * One decaying tone, scheduled and self-disposing.
 *
 * The oscillator and its gain node disconnect themselves in `onended`. A
 * sequencer that omits that leaks two nodes per beat — at 120 bpm that is
 * 7200 dead nodes an hour, all still attached to the destination.
 */
export function scheduleTone(ctx: AudioContext, options: ToneOptions): void {
  const { frequency, at, gain = 0.14, decay = 0.28, type = 'triangle' } = options;

  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  env.gain.setValueAtTime(gain, at);
  env.gain.exponentialRampToValueAtTime(SILENCE, at + decay);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + decay + TAIL);
  osc.onended = () => {
    osc.disconnect();
    env.disconnect();
  };
}

export function useWebAudioScheduler(
  options: UseWebAudioSchedulerOptions = {},
): WebAudioScheduler {
  const { bpm = 96, steps = 8, lookahead = 0.3, intervalMs = 90 } = options;
  const reduced = useReducedMotion();

  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const phase = useRef(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const timer = useRef<number | null>(null);
  const queue = useRef<QueuedBeat[]>([]);
  /** Audio time of the next beat to be scheduled. */
  const nextTime = useRef(0);
  /** Monotonic beat counter, so `step` survives a change of `steps`. */
  const counter = useRef(0);
  /** Widened while the tab is hidden, where timers are clamped to ~1 Hz. */
  const window_ = useRef(lookahead);

  const config = useRef({ bpm, steps, lookahead, intervalMs, reduced, options });
  config.current = { bpm, steps, lookahead, intervalMs, reduced, options };

  /** Queue every beat that falls inside the lookahead window. */
  const drain = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const cfg = config.current;
    const secondsPerBeat = 60 / cfg.bpm;
    const horizon = ctx.currentTime + window_.current;

    // A `while`, not an `if`: one call may have to cover several beats when the
    // timer was throttled, and a fast tempo can put two beats in one window.
    while (nextTime.current < horizon) {
      const beat = counter.current;
      const at = nextTime.current;
      const index = wrapIndex(beat, cfg.steps);

      cfg.options.onBeat?.({ time: at, beat, step: index, ctx });
      queue.current.push({ time: at, step: index });

      // Accumulate from the previous beat time, never from `currentTime`.
      // Re-basing on the clock each pass folds the timer's jitter into the
      // tempo and the sequence drifts sharp within a minute.
      nextTime.current = at + secondsPerBeat;
      counter.current = beat + 1;
    }
  }, []);

  const stop = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current);
      timer.current = null;
    }
    queue.current.length = 0;
    phase.current = 0;
    setRunning(false);
    setStep(null);
  }, []);

  const start = useCallback(() => {
    if (timer.current !== null) return;
    const cfg = config.current;

    let ctx = ctxRef.current;
    if (!ctx) {
      // Built inside the gesture handler that called `start`. Anywhere else
      // and the autoplay policy hands back a suspended context whose notes
      // are dropped silently.
      ctx = new AudioContext();
      ctxRef.current = ctx;
    }
    if (ctx.state === 'suspended') void ctx.resume();

    counter.current = 0;
    queue.current.length = 0;
    window_.current = document.visibilityState === 'hidden' ? HIDDEN_LOOKAHEAD : cfg.lookahead;
    nextTime.current = ctx.currentTime + START_LEAD;

    setRunning(true);
    drain();
    timer.current = window.setInterval(drain, cfg.intervalMs);
  }, [drain]);

  // The visual clock. Reading `ctx.currentTime` once per frame and popping the
  // beats that have passed keeps the highlight on the note you can hear; a
  // separate rAF counter of its own would slide out of step over a few bars.
  useRaf(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const q = queue.current;

    let current: QueuedBeat | null = null;
    while (q.length > 0) {
      const head = q[0];
      if (head === undefined || head.time > now) break;
      q.shift();
      current = head;
    }
    if (current) setStep(current.step);

    if (config.current.reduced) {
      phase.current = 0;
      return;
    }
    const secondsPerBeat = 60 / config.current.bpm;
    const head = q[0];
    // Time until the next queued beat, turned into progress through this one.
    phase.current =
      head === undefined ? 0 : clamp(1 - (head.time - now) / secondsPerBeat, 0, 1);
  }, running);

  useEffect(() => {
    if (!running) return;
    // A hidden tab clamps `setInterval` to roughly one call per second, so a
    // 0.3s window drops entire bars. Widening the window instead of stopping
    // means the bar plays through unbroken while the tab is in the background.
    const onVisibility = () => {
      window_.current =
        document.visibilityState === 'hidden' ? HIDDEN_LOOKAHEAD : config.current.lookahead;
      drain();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [running, drain]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearInterval(timer.current);
      timer.current = null;
      queue.current.length = 0;
      const ctx = ctxRef.current;
      ctxRef.current = null;
      // close() cancels every note already scheduled in the future. Without
      // it a bar keeps playing after the component has gone.
      if (ctx && ctx.state !== 'closed') void ctx.close();
    },
    [],
  );
  // #endregion critical

  return { start, stop, running, step, phase };
}
