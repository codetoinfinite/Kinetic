import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'web-audio-scheduler',
  title: 'Web Audio Scheduling Kit',
  category: 'primitive',
  tags: ['web-audio', 'lookahead', 'sequencer', 'timing', 'setinterval'],
  blurb: 'A lookahead sequencer: a coarse timer queues beats onto the sample-accurate audio clock, so tempo never drifts.',
  cost: 'dom',
  motif: 'wave',

  files: [{ path: 'registry/ui/web-audio-scheduler.tsx', type: 'registry:ui', role: 'hook' }],
  dependencies: [],
  registryDependencies: [],

  summary:
    'Two clocks, one job each. `AudioContext.currentTime` is a sample counter and never drifts, but it cannot wake you up; `setInterval` can wake you up, but only when the main thread is free. The scheduler runs a 90 ms timer whose only responsibility is to ask which beats fall inside the next 300 ms and hand each one an exact audio time. The timer can fire late, early, or twice in a row and the notes still land in the same place.',

  mechanism: [
    '`nextTime` holds the audio-clock time of the next unqueued beat, initialised to `ctx.currentTime + START_LEAD` when `start()` runs. Every timer tick loops `while (nextTime < ctx.currentTime + lookahead)`, calls `onBeat({ time: nextTime, beat, step, ctx })`, and advances `nextTime += 60 / bpm`.',
    'The advance accumulates from the previous beat time, never from `ctx.currentTime`. Re-basing on the clock each pass folds the timer\'s jitter into the tempo, and a sequence that re-bases runs measurably sharp inside a minute.',
    'It is a `while` and not an `if` because one tick may have to cover several beats — the timer was throttled, the tempo is faster than the interval, or the tab just came back to the foreground.',
    '`scheduleTone` builds an oscillator and a gain node per beat, ramps `gain` from its peak to 0.001 over `decay`, stops the oscillator `TAIL` seconds after the ramp ends, and disconnects both nodes in `onended` so the graph does not accumulate dead nodes.',
    'The visual step index comes from a second, independent pass: a rAF loop reads `ctx.currentTime` once per frame and pops every queued beat whose time has passed, so the highlighted step is the step you can hear rather than the step that was most recently queued 300 ms ago.',
    '`phase` is derived in the same loop as `1 - (nextQueuedBeat.time - now) / secondsPerBeat`, clamped to 0-1, and written to a ref rather than to state — a playhead needs a value every frame and state would re-render the whole sequencer 60 times a second.',
    'On `visibilitychange` to hidden the lookahead widens to 1.5s, because a hidden tab clamps `setInterval` to roughly one call per second and a 0.3s window would leave gaps of missed beats.',
  ],

  constants: [
    {
      name: 'intervalMs',
      value: '90',
      why: 'How often the scheduler wakes. It only has to beat the lookahead window, not the tempo — at 96 bpm a beat is 625 ms, so the timer gets about seven chances to queue each one. Dropping to ~10 ms burns main-thread time for nothing; going past ~250 ms leaves too few chances inside a 300 ms window.',
    },
    {
      name: 'lookahead',
      value: '0.3',
      why: 'Seconds queued in advance. Must exceed the worst-case gap between timer calls, which under main-thread contention is several times `intervalMs` — 0.3s over a 0.09s interval is a 3x margin. Larger windows make a tempo or pattern change take longer to take effect, because beats already queued cannot be un-queued.',
    },
    {
      name: 'HIDDEN_LOOKAHEAD',
      value: '1.5',
      why: 'Seconds queued while the tab is hidden. Chrome and Firefox clamp background timers to about one call per second, so the window has to be over 1s or the sequence develops audible holes; 1.5s leaves margin over the clamp.',
    },
    {
      name: 'START_LEAD',
      value: '0.08',
      why: 'Seconds before the first beat. Covers constructing the context, resuming it, and the first `drain()` — all of which happen inside the click handler. Scheduling the downbeat at exactly `currentTime` means its attack is already partly in the past.',
    },
    {
      name: 'SILENCE',
      value: '0.001',
      why: 'The ramp target, -60 dB. `exponentialRampToValueAtTime` is undefined at 0 and throws a RangeError; ramping to a literal 0 is the single most common Web Audio mistake.',
    },
    {
      name: 'TAIL',
      value: '0.05',
      why: 'Seconds between the end of the decay ramp and `osc.stop()`. Stopping exactly at the end of the ramp truncates the waveform mid-cycle, which is an audible click on a triangle or square wave.',
    },
    {
      name: 'gain default',
      value: '0.14',
      why: 'Peak per tone. Three simultaneous rows sum to 0.42, which leaves headroom for their overlapping tails; at 0.4 each the same chord clips the destination.',
    },
  ],

  pitfalls: [
    'Driving the sequence with one `setTimeout` per note. Every note then inherits main-thread jitter, and a single 80 ms layout pass puts that note 80 ms off the beat — clearly audible at any tempo.',
    'Advancing the beat time from `ctx.currentTime` instead of from the previous beat time. The timer never fires exactly on schedule, so each re-base rounds the interval down and the tempo creeps upward; a sequence started against a metronome is noticeably ahead within a minute.',
    'Using `if` instead of `while` in the drain. When the tab returns to the foreground, or the tempo is faster than the timer interval, one tick has several beats to queue — an `if` queues one and silently drops the rest.',
    'Setting the lookahead smaller than the worst-case timer gap. The window is the entire safety margin: at a 0.05s lookahead a single long frame means the beat is already in the past when the timer finally runs, and `osc.start(pastTime)` plays immediately, so the note is late *and* off-grid.',
    'Constructing the `AudioContext` at mount. The autoplay policy hands back a `suspended` context, `osc.start(at)` neither throws nor sounds, and the failure looks like a silent bug with a clean console.',
    'Ramping the gain to 0. `exponentialRampToValueAtTime(0, t)` throws — the target must be strictly positive.',
    'Leaving each beat\'s oscillator and gain connected. At 120 bpm that is two dead nodes a beat, 7200 an hour, all still attached to the destination; CPU climbs and the output eventually distorts.',
    'Counting the visual step with its own rAF counter rather than reading `ctx.currentTime`. The two clocks tick at different rates, so the highlight slides out of step with the sound over a few bars — the classic "my metronome light is not on the beat" bug.',
    'Highlighting the step at the moment it was *queued*. That is `lookahead` seconds before it sounds, so the playhead runs a third of a second ahead of the audio and looks broken.',
    'Publishing the beat phase as React state. Sixty re-renders a second of the whole sequencer to move one line; a ref plus a rAF write to a CSS custom property costs nothing.',
    'Never calling `ctx.close()`. Notes already queued keep playing after the component unmounts, and Chrome throws once about six contexts exist in one document.',
  ],

  notes: [
    'A change to the pattern takes effect at most `lookahead` seconds later, because beats inside the window are already committed to the audio thread. That is inherent to lookahead scheduling, not a defect — shrink the window if you need a tighter response and accept the reduced timing margin.',
    '`onBeat` receives the context so the caller schedules its own nodes; the hook deliberately does not own the sound. Sequencing and synthesis are separate concerns and pairing them makes both untestable.',
    'For sub-millisecond scheduling with no main-thread involvement at all, the same shape moves into an `AudioWorklet` that posts beat messages. The lookahead pattern is identical; only the timer changes.',
  ],

  apiSignature:
    'function useWebAudioScheduler(options?: { bpm?: number; steps?: number; lookahead?: number; intervalMs?: number; onBeat?: (beat: { time: number; beat: number; step: number; ctx: AudioContext }) => void }): { start: () => void; stop: () => void; running: boolean; step: number | null; phase: RefObject<number> }\nfunction scheduleTone(ctx: AudioContext, options: { frequency: number; at: number; gain?: number; decay?: number; type?: OscillatorType }): void',

  props: [
    { name: 'bpm', type: 'number', default: '96', description: 'Tempo. One beat is `60 / bpm` seconds on the audio clock.' },
    { name: 'steps', type: 'number', default: '8', description: 'Beats per bar. Only affects the wrapped `step` index handed to `onBeat`.' },
    { name: 'lookahead', type: 'number', default: '0.3', description: 'Seconds of beats queued in advance. Must exceed the worst-case timer gap.' },
    { name: 'intervalMs', type: 'number', default: '90', description: 'How often the scheduling timer runs. Independent of the tempo.' },
    { name: 'onBeat', type: '(beat: ScheduledBeat) => void', description: 'Called once per beat, `lookahead` seconds early. Schedule audio against `beat.time`.' },
  ],

  reducedMotion:
    '`step` still advances — a step index is information about the sound, not decoration — but `phase` is pinned to 0, so a playhead bound to it jumps from step to step in place of sliding continuously between them. The demo\'s playhead therefore renders as a static line on the current step.',

  cleanup:
    'The unmount cleanup clears the scheduling interval, empties the pending-beat queue, and calls `ctx.close()`, which cancels every note already committed to the audio thread. The `visibilitychange` listener is removed with its effect, and the rAF subscription is released by `useRaf` when `running` goes false. Each tone disconnects its own oscillator and gain node in `onended`.',

  acceptance:
    'Press Play: the highlight lands on a cell at the same instant you hear that cell, and stays in step after a minute of playing. Toggle a cell while it runs and the change is audible on the next pass. Switch to another tab for ten seconds and come back — the pattern is still on the grid with no gap or double-trigger. Press Stop and the step counter clears with no trailing note. Unmount while playing and nothing keeps sounding. With reduced motion on, the playhead line sits still on the current step instead of sweeping.',

  criticalRegion: 'critical',
};

export default meta;
