# Build: Web Audio Scheduling Kit

Two clocks, one job each. `AudioContext.currentTime` is a sample counter and never drifts, but it cannot wake you up; `setInterval` can wake you up, but only when the main thread is free. The scheduler runs a 90 ms timer whose only responsibility is to ask which beats fall inside the next 300 ms and hand each one an exact audio time. The timer can fire late, early, or twice in a row and the notes still land in the same place.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A lookahead sequencer: a coarse timer queues beats onto the sample-accurate audio clock, so tempo never drifts.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. `nextTime` holds the audio-clock time of the next unqueued beat, initialised to `ctx.currentTime + START_LEAD` when `start()` runs. Every timer tick loops `while (nextTime < ctx.currentTime + lookahead)`, calls `onBeat({ time: nextTime, beat, step, ctx })`, and advances `nextTime += 60 / bpm`.
2. The advance accumulates from the previous beat time, never from `ctx.currentTime`. Re-basing on the clock each pass folds the timer's jitter into the tempo, and a sequence that re-bases runs measurably sharp inside a minute.
3. It is a `while` and not an `if` because one tick may have to cover several beats — the timer was throttled, the tempo is faster than the interval, or the tab just came back to the foreground.
4. `scheduleTone` builds an oscillator and a gain node per beat, ramps `gain` from its peak to 0.001 over `decay`, stops the oscillator `TAIL` seconds after the ramp ends, and disconnects both nodes in `onended` so the graph does not accumulate dead nodes.
5. The visual step index comes from a second, independent pass: a rAF loop reads `ctx.currentTime` once per frame and pops every queued beat whose time has passed, so the highlighted step is the step you can hear rather than the step that was most recently queued 300 ms ago.
6. `phase` is derived in the same loop as `1 - (nextQueuedBeat.time - now) / secondsPerBeat`, clamped to 0-1, and written to a ref rather than to state — a playhead needs a value every frame and state would re-render the whole sequencer 60 times a second.
7. On `visibilitychange` to hidden the lookahead widens to 1.5s, because a hidden tab clamps `setInterval` to roughly one call per second and a 0.3s window would leave gaps of missed beats.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `intervalMs = 90`
  How often the scheduler wakes. It only has to beat the lookahead window, not the tempo — at 96 bpm a beat is 625 ms, so the timer gets about seven chances to queue each one. Dropping to ~10 ms burns main-thread time for nothing; going past ~250 ms leaves too few chances inside a 300 ms window.
- `lookahead = 0.3`
  Seconds queued in advance. Must exceed the worst-case gap between timer calls, which under main-thread contention is several times `intervalMs` — 0.3s over a 0.09s interval is a 3x margin. Larger windows make a tempo or pattern change take longer to take effect, because beats already queued cannot be un-queued.
- `HIDDEN_LOOKAHEAD = 1.5`
  Seconds queued while the tab is hidden. Chrome and Firefox clamp background timers to about one call per second, so the window has to be over 1s or the sequence develops audible holes; 1.5s leaves margin over the clamp.
- `START_LEAD = 0.08`
  Seconds before the first beat. Covers constructing the context, resuming it, and the first `drain()` — all of which happen inside the click handler. Scheduling the downbeat at exactly `currentTime` means its attack is already partly in the past.
- `SILENCE = 0.001`
  The ramp target, -60 dB. `exponentialRampToValueAtTime` is undefined at 0 and throws a RangeError; ramping to a literal 0 is the single most common Web Audio mistake.
- `TAIL = 0.05`
  Seconds between the end of the decay ramp and `osc.stop()`. Stopping exactly at the end of the ramp truncates the waveform mid-cycle, which is an audible click on a triangle or square wave.
- `gain default = 0.14`
  Peak per tone. Three simultaneous rows sum to 0.42, which leaves headroom for their overlapping tails; at 0.4 each the same chord clips the destination.

## API

```ts
function useWebAudioScheduler(options?: { bpm?: number; steps?: number; lookahead?: number; intervalMs?: number; onBeat?: (beat: { time: number; beat: number; step: number; ctx: AudioContext }) => void }): { start: () => void; stop: () => void; running: boolean; step: number | null; phase: RefObject<number> }
function scheduleTone(ctx: AudioContext, options: { frequency: number; at: number; gain?: number; decay?: number; type?: OscillatorType }): void
```

- `bpm: number` — default `96`
  Tempo. One beat is `60 / bpm` seconds on the audio clock.
- `steps: number` — default `8`
  Beats per bar. Only affects the wrapped `step` index handed to `onBeat`.
- `lookahead: number` — default `0.3`
  Seconds of beats queued in advance. Must exceed the worst-case timer gap.
- `intervalMs: number` — default `90`
  How often the scheduling timer runs. Independent of the tempo.
- `onBeat: (beat: ScheduledBeat) => void`
  Called once per beat, `lookahead` seconds early. Schedule audio against `beat.time`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The unmount cleanup clears the scheduling interval, empties the pending-beat queue, and calls `ctx.close()`, which cancels every note already committed to the audio thread. The `visibilitychange` listener is removed with its effect, and the rAF subscription is released by `useRaf` when `running` goes false. Each tone disconnects its own oscillator and gain node in `onended`.

**Reduced motion.** `step` still advances — a step index is information about the sound, not decoration — but `phase` is pinned to 0, so a playhead bound to it jumps from step to step in place of sliding continuously between them. The demo's playhead therefore renders as a static line on the current step.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Driving the sequence with one `setTimeout` per note. Every note then inherits main-thread jitter, and a single 80 ms layout pass puts that note 80 ms off the beat — clearly audible at any tempo.
- Advancing the beat time from `ctx.currentTime` instead of from the previous beat time. The timer never fires exactly on schedule, so each re-base rounds the interval down and the tempo creeps upward; a sequence started against a metronome is noticeably ahead within a minute.
- Using `if` instead of `while` in the drain. When the tab returns to the foreground, or the tempo is faster than the timer interval, one tick has several beats to queue — an `if` queues one and silently drops the rest.
- Setting the lookahead smaller than the worst-case timer gap. The window is the entire safety margin: at a 0.05s lookahead a single long frame means the beat is already in the past when the timer finally runs, and `osc.start(pastTime)` plays immediately, so the note is late *and* off-grid.
- Constructing the `AudioContext` at mount. The autoplay policy hands back a `suspended` context, `osc.start(at)` neither throws nor sounds, and the failure looks like a silent bug with a clean console.
- Ramping the gain to 0. `exponentialRampToValueAtTime(0, t)` throws — the target must be strictly positive.
- Leaving each beat's oscillator and gain connected. At 120 bpm that is two dead nodes a beat, 7200 an hour, all still attached to the destination; CPU climbs and the output eventually distorts.
- Counting the visual step with its own rAF counter rather than reading `ctx.currentTime`. The two clocks tick at different rates, so the highlight slides out of step with the sound over a few bars — the classic "my metronome light is not on the beat" bug.
- Highlighting the step at the moment it was *queued*. That is `lookahead` seconds before it sounds, so the playhead runs a third of a second ahead of the audio and looks broken.
- Publishing the beat phase as React state. Sixty re-renders a second of the whole sequencer to move one line; a ref plus a rAF write to a CSS custom property costs nothing.
- Never calling `ctx.close()`. Notes already queued keep playing after the component unmounts, and Chrome throws once about six contexts exist in one document.

## Notes

- A change to the pattern takes effect at most `lookahead` seconds later, because beats inside the window are already committed to the audio thread. That is inherent to lookahead scheduling, not a defect — shrink the window if you need a tighter response and accept the reduced timing margin.
- `onBeat` receives the context so the caller schedules its own nodes; the hook deliberately does not own the sound. Sequencing and synthesis are separate concerns and pairing them makes both untestable.
- For sub-millisecond scheduling with no main-thread involvement at all, the same shape moves into an `AudioWorklet` that posts beat messages. The lookahead pattern is identical; only the timer changes.

## Definition of done

Press Play: the highlight lands on a cell at the same instant you hear that cell, and stays in step after a minute of playing. Toggle a cell while it runs and the change is audible on the next pass. Switch to another tab for ten seconds and come back — the pattern is still on the grid with no gap or double-trigger. Press Stop and the step counter clears with no trailing note. Unmount while playing and nothing keeps sounding. With reduced motion on, the playhead line sits still on the current step instead of sweeping.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
