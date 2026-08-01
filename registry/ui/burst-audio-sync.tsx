'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Chord-Synced Particle Burst
   --------------------------------------------------------------------------
   One schedule, two clocks. A burst is an arpeggio: N notes, `step` seconds
   apart, each with a visual flare that has to land on the same beat as its
   note. The naive version schedules the notes with `setTimeout` and the
   flares with the same timeouts, and the two drift apart within a second
   because `setTimeout` is a best-effort main-thread timer while audio is
   rendered by a separate, sample-accurate thread.

   The fix is to schedule the audio on `AudioContext.currentTime` — which is
   exact — and then *convert* each note's audio time into a wall-clock time
   the rAF loop can compare against. `getOutputTimestamp()` is the conversion:
   it hands back a matched pair of (sample being played, `performance.now()`
   when it reached the speaker), which is the only honest bridge between the
   two clocks. Everything visual is then driven off one rAF loop that pops a
   sorted queue, so a flare is at worst one frame away from its note.

   Nothing here runs until `fire()` is called. `fire()` must be called from
   inside a user gesture: constructing an `AudioContext` outside one leaves it
   `suspended`, and every note you then schedule is silently swallowed.
   ========================================================================== */

/** C major, ascending: C4 E4 G4 C5. */
const C_MAJOR: readonly number[] = [261.63, 329.63, 392, 523.25];

interface QueuedStep {
  /** `performance.now()` milliseconds at which the flare should appear. */
  at: number;
  index: number;
  total: number;
}

export interface UseBurstAudioSyncOptions {
  /** One frequency in Hz per step. Defaults to a C major arpeggio. */
  chord?: readonly number[];
  /** Seconds between steps. The visual and the note share this number. */
  step?: number;
  /** Peak gain of a single note, before any reduced-motion collapse. */
  gain?: number;
  /** Seconds the exponential decay takes to fall from `gain` to silence. */
  decay?: number;
  /** Fired once per step, on the frame nearest that step's note. */
  onStep?: (index: number, total: number) => void;
  /** Skips all audio. Visual steps still fire on the same schedule. */
  muted?: boolean;
}

export interface BurstAudioSync {
  /**
   * Schedules `steps` notes and `steps` visual callbacks. Returns how many
   * actually fired — capped at `chord.length`, so you never hear more notes
   * than you see flares. MUST be called from a user gesture handler.
   */
  fire: (steps?: number) => number;
  /** True once an AudioContext has been constructed and allowed to start. */
  unlocked: boolean;
}

// #region critical
/** `exponentialRampToValueAtTime` is undefined at 0, so silence is -60 dB. */
const SILENCE = 0.001;
/** Seconds of dead air after the ramp before the oscillator is stopped. */
const TAIL = 0.1;
/** Seconds of lead before the first note. Absorbs one graph render quantum. */
const LEAD = 0.02;
/** Ceiling on latency compensation, in seconds. */
const MAX_LATENCY = 0.05;

/**
 * Wall-clock time at which a sample scheduled at `contextTime` is heard.
 *
 * The `getOutputTimestamp()` pair is measured *at the output device*, so the
 * hardware latency is already folded into it — adding `outputLatency` on top
 * would double-count it and push every flare late.
 */
function audibleAt(ctx: AudioContext, contextTime: number): number {
  if (typeof ctx.getOutputTimestamp === 'function') {
    const ts = ctx.getOutputTimestamp();
    // Before the graph has rendered anything both fields are 0. Trusting that
    // pair maps every future note to wall-clock zero, and the whole burst
    // flashes at once on the very next frame.
    if (
      ts.contextTime !== undefined &&
      ts.performanceTime !== undefined &&
      ts.contextTime > 0
    ) {
      return ts.performanceTime + (contextTime - ts.contextTime) * 1000;
    }
  }
  // Fallback. `currentTime` is the time of the sample being *written*, which
  // runs ahead of the speaker by roughly the output latency, so add it back.
  const reported = Number.isFinite(ctx.outputLatency)
    ? ctx.outputLatency
    : ctx.baseLatency;
  const latency = Number.isFinite(reported) ? Math.min(reported, MAX_LATENCY) : 0;
  return performance.now() + (contextTime - ctx.currentTime) * 1000 + latency * 1000;
}

export function useBurstAudioSync(options: UseBurstAudioSyncOptions = {}): BurstAudioSync {
  const { chord = C_MAJOR, step = 0.46, gain = 0.15, decay = 0.4 } = options;
  const reduced = useReducedMotion();

  const [unlocked, setUnlocked] = useState(false);
  const [running, setRunning] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const queue = useRef<QueuedStep[]>([]);

  // Everything `fire` reads lives in one ref, so `fire` keeps a stable
  // identity and can be handed to a memoised child without re-binding it on
  // every render.
  const config = useRef({ chord, step, gain, decay, reduced, options });
  config.current = { chord, step, gain, decay, reduced, options };

  const fire = useCallback((steps?: number): number => {
    const cfg = config.current;
    const wanted = steps ?? cfg.chord.length;
    const total = Math.min(Math.max(Math.trunc(wanted), 0), cfg.chord.length);
    if (total === 0) return 0;

    // Reduced motion collapses the arpeggio into a single chord: the feedback
    // survives — it was asked for by a click, so it is not decoration — but
    // nothing travels across the screen.
    const stagger = cfg.reduced ? 0 : cfg.step;

    let ctx: AudioContext | null = null;
    if (!cfg.options.muted) {
      ctx = ctxRef.current;
      if (!ctx) {
        // Constructed here and only here: we are inside the gesture handler
        // that called `fire`, which is the one moment the autoplay policy
        // lets a context start.
        ctx = new AudioContext();
        ctxRef.current = ctx;
        setUnlocked(true);
      }
      if (ctx.state === 'suspended') void ctx.resume();
    }

    let baseMs = performance.now();

    if (ctx) {
      const start = ctx.currentTime + LEAD;
      // Four sines at full gain sum to 4x the peak and clip the destination.
      // They only ever overlap when the stagger is gone, so divide then.
      const peak = stagger === 0 ? cfg.gain / total : cfg.gain;

      for (let i = 0; i < total; i++) {
        const freq = cfg.chord[i];
        if (freq === undefined) continue;
        const at = start + stagger * i;

        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(peak, at);
        env.gain.exponentialRampToValueAtTime(SILENCE, at + decay);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + decay + TAIL);
        // Without this every burst leaves two live nodes attached to the
        // destination. A few hundred bursts and the graph audibly degrades.
        osc.onended = () => {
          osc.disconnect();
          env.disconnect();
        };
      }

      baseMs = audibleAt(ctx, start);
    }

    const q = queue.current;
    for (let i = 0; i < total; i++) {
      q.push({ at: baseMs + stagger * i * 1000, index: i, total });
    }
    // Two bursts can overlap; the drain below assumes the head is the
    // earliest step, so keep the queue sorted rather than scanning it.
    q.sort((a, b) => a.at - b.at);
    setRunning(true);

    return total;
  }, []);

  // The loop only exists while something is queued. An always-on rAF for a
  // widget that fires twice a minute keeps the browser's animation frame
  // pipeline alive for nothing.
  useRaf(() => {
    const q = queue.current;
    const now = performance.now();
    while (q.length > 0) {
      const head = q[0];
      if (head === undefined || head.at > now) break;
      q.shift();
      config.current.options.onStep?.(head.index, head.total);
    }
    if (q.length === 0) setRunning(false);
  }, running);

  useEffect(
    () => () => {
      queue.current.length = 0;
      const ctx = ctxRef.current;
      ctxRef.current = null;
      // close() stops every scheduled note and releases the hardware. Chrome
      // caps a document at ~6 live contexts and throws on the seventh.
      if (ctx && ctx.state !== 'closed') void ctx.close();
    },
    [],
  );
  // #endregion critical

  return { fire, unlocked };
}
