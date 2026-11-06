# Build: Chord-Synced Particle Burst

A burst is N notes a fixed interval apart, each with a visual flare that has to appear on the same beat as its note. Audio is scheduled on `AudioContext.currentTime`, which is sample-accurate; the flares are driven by a rAF loop, which is not. This hook schedules both from one set of offsets and converts the audio times into wall-clock times via `getOutputTimestamp()`, so a flare is never more than one frame from its note however long the burst runs.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Fires an arpeggio and its visual flares off one schedule, so each flash lands on its own note.

- Category: primitive
- Runtime cost: dom
- Dependencies: none beyond React

## How it works

1. Notes are scheduled ahead of time on the audio clock: for step `i`, `at = ctx.currentTime + LEAD + step * i`, then `gain.setValueAtTime(peak, at)` and `gain.exponentialRampToValueAtTime(0.001, at + decay)`. Nothing is timed by `setTimeout`, so a busy main thread cannot skew a note.
2. `audibleAt(ctx, at)` converts that audio time into a `performance.now()` millisecond value. `ctx.getOutputTimestamp()` returns a matched pair — the sample frame currently leaving the output device and the wall-clock instant it left — so the mapping is `ts.performanceTime + (at - ts.contextTime) * 1000`. Hardware output latency is already inside that pair; adding `outputLatency` on top double-counts it.
3. When `getOutputTimestamp` is unavailable, or has not rendered a frame yet and returns `contextTime: 0`, the fallback is `performance.now() + (at - ctx.currentTime) * 1000 + min(outputLatency, 0.05) * 1000`. `currentTime` is the write head, not the speaker, so the latency has to be added back in this branch only.
4. Each step is pushed onto a queue sorted by wall-clock time, and a rAF loop pops every entry whose time has passed and calls `onStep(index, total)`. Overlapping bursts merge into one sorted queue rather than one loop per burst.
5. The loop is subscribed only while the queue is non-empty — `useRaf(tick, running)` — and unsubscribes itself on the frame it drains the last step, so an idle instrument holds no animation frame.
6. The `AudioContext` is constructed inside `fire()`, which the caller invokes from a click handler, and `resume()` is called if the browser still hands it back suspended. Constructing it at mount produces a suspended context whose scheduled notes are silently discarded.
7. `fire(steps)` caps at `chord.length` and returns the count actually scheduled, so a caller that has fewer flares available than the chord has notes hears exactly as many notes as it shows.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `step = 0.46`
  Seconds between notes, and the same number the visuals use. Around 130 bpm in eighths — fast enough to read as one gesture rather than four separate events, slow enough that each flare is individually visible. Below ~0.2s the flares smear into one flash; above ~0.7s the burst stops sounding like a chord and starts sounding like four taps.
- `gain = 0.15`
  Peak amplitude of a single sine. Four notes overlapping at 1.0 would sum past full scale and hard-clip the destination; 0.15 leaves headroom for the tails of earlier notes still decaying under later ones.
- `SILENCE = 0.001`
  -60 dB, the ramp target. `exponentialRampToValueAtTime` is mathematically undefined at 0 and throws; ramping to a literal 0 is the single most common Web Audio error. -60 dB is inaudible.
- `decay = 0.4`
  Seconds from peak to silence. Slightly shorter than the 0.46s step so a note has essentially finished before the next arrives — overlap past about 0.6s turns the arpeggio into a chord and the individual attacks stop being audible.
- `TAIL = 0.1`
  Extra seconds before `osc.stop()`. Stopping an oscillator exactly at the end of its ramp truncates the last samples and can produce a faint click; 0.1s of -60 dB signal costs nothing and guarantees the stop is inaudible.
- `LEAD = 0.02`
  Seconds of lead before the first note. One render quantum at 44.1 kHz is 128 samples, about 2.9 ms; 20 ms covers several quanta plus the jitter in getting from the click to the scheduling call. Scheduling at exactly `currentTime` means the first note is already partly in the past and its attack is clipped.
- `MAX_LATENCY = 0.05`
  Ceiling on the fallback latency compensation, in seconds. Bluetooth output can report 150-300 ms; delaying the visual by that much to match makes the click itself feel broken. Capping trades exact sync on pathological hardware for a UI that still responds.

## API

```ts
function useBurstAudioSync(options?: { chord?: readonly number[]; step?: number; gain?: number; decay?: number; onStep?: (index: number, total: number) => void; muted?: boolean }): { fire: (steps?: number) => number; unlocked: boolean }
```

- `chord: readonly number[]` — default `[261.63, 329.63, 392, 523.25]`
  One frequency in Hz per step. Caps how many notes a single `fire` can schedule.
- `step: number` — default `0.46`
  Seconds between steps. Shared by the audio schedule and the visual queue.
- `gain: number` — default `0.15`
  Peak gain of one note. Divided by the note count when the stagger collapses.
- `decay: number` — default `0.4`
  Seconds for the exponential ramp from `gain` down to -60 dB.
- `onStep: (index: number, total: number) => void`
  Called on the frame nearest each note. `index` is the position in the chord.
- `muted: boolean` — default `false`
  Skips audio entirely. Visual steps still fire on the same schedule, so the UI is unchanged.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
        // `cfg.decay`, not the closed-over `decay`. This callback is memoised
        // with an empty dep array — deliberately, so a parent re-render never
        // changes its identity — which freezes every prop it closes over at
        // first render. Every other value here already comes through the ref;
        // these two lines read the prop directly, so changing `decay` after
        // mount left the envelope on whatever the first render happened to be.
        env.gain.exponentialRampToValueAtTime(SILENCE, at + cfg.decay);
        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + cfg.decay + TAIL);
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The unmount cleanup empties the pending-step queue and calls `ctx.close()`, which cancels every note still scheduled in the future and releases the hardware. The rAF subscription is owned by `useRaf` and released when `running` goes false or the component unmounts. Each oscillator disconnects itself and its gain node in `onended`.

**Reduced motion.** The stagger collapses to zero: all notes are scheduled at the same audio time and every `onStep` fires on one frame, so the burst is a chord rather than a sequence travelling across the screen. Audio is not muted — it is direct feedback for a click, not ambient motion — but the per-note gain is divided by the note count because the notes now overlap.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Constructing the `AudioContext` at mount. Outside a user gesture the browser hands back a `suspended` context; `osc.start(at)` on it neither throws nor plays, so the bug presents as "audio just does not work" with a clean console.
- Ramping the gain to 0. `exponentialRampToValueAtTime(0, t)` throws a `RangeError` — the target must be strictly positive. Ramp to 0.001 instead.
- Using `setTimeout` for the notes so audio and visuals share a timer. Both then inherit the main thread's jitter, and on a frame that takes 80 ms the note lands 80 ms late while the sample-accurate alternative would not have moved.
- Adding `outputLatency` on top of a `getOutputTimestamp()` mapping. That pair is measured at the output device and already contains the latency, so adding it again pushes every flare a full hardware buffer behind its note — the exact defect the conversion exists to prevent.
- Trusting `getOutputTimestamp()` immediately after construction. Before the graph has rendered a quantum both fields read 0, which maps every future note to wall-clock zero and dumps the entire burst onto the next frame.
- Never disconnecting the oscillator and gain. Both stay attached to the destination after the note ends; a few hundred bursts in one session and the graph is carrying hundreds of dead nodes, which shows up as rising CPU and eventually distortion.
- Keeping a rAF loop running so the flare queue can be polled. The queue is empty almost all the time — subscribe on `fire`, unsubscribe on the frame the last step drains.
- Letting the notes overlap at full gain when reduced motion collapses the stagger. Four sines at 0.15 sum to 0.6 and the summed peak clips; the per-note gain has to be divided by the note count in the collapsed case.
- Forgetting `ctx.close()` on unmount. Chrome allows roughly six live `AudioContext` objects per document and throws on the next one, so a page that mounts this in a list silently stops producing sound after the sixth item.

## Notes

- The hook deliberately exposes no `play()` that can be called from an effect. `fire` is the only entry point and its contract is "call me from a gesture handler" — encoding the autoplay policy in the API rather than in a comment.
- Two clocks, two policies. Reduced motion collapses the stagger but does not mute anything: the sound is feedback for a click the user made, not ambient decoration, and silencing it removes information.
- `chord` is any frequency list. A minor triad is `[261.63, 311.13, 392]`; a single frequency makes it a one-shot tick with the same scheduling guarantees.

## Definition of done

Click a string: four flares appear 0.46s apart and each one coincides with a note — watch the fourth flare and hear the fourth note land together, not a beat apart. Click a string at either end and only one flare appears and only one note sounds. Nothing plays before the first click. Toggle sound off and the flares keep exactly the same timing. With reduced motion on, all four strings light in the same frame and you hear a chord. Unmount mid-burst and the remaining notes do not play.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
