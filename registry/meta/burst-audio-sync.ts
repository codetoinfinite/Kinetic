import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'burst-audio-sync',
  title: 'Chord-Synced Particle Burst',
  category: 'primitive',
  tags: ['web-audio', 'scheduling', 'audio-visual', 'raf', 'clock-sync'],
  blurb: 'Fires an arpeggio and its visual flares off one schedule, so each flash lands on its own note.',
  cost: 'dom',
  motif: 'wave',

  files: [{ path: 'registry/ui/burst-audio-sync.tsx', type: 'registry:ui', role: 'hook' }],
  dependencies: [],

  summary:
    'A burst is N notes a fixed interval apart, each with a visual flare that has to appear on the same beat as its note. Audio is scheduled on `AudioContext.currentTime`, which is sample-accurate; the flares are driven by a rAF loop, which is not. This hook schedules both from one set of offsets and converts the audio times into wall-clock times via `getOutputTimestamp()`, so a flare is never more than one frame from its note however long the burst runs.',

  mechanism: [
    'Notes are scheduled ahead of time on the audio clock: for step `i`, `at = ctx.currentTime + LEAD + step * i`, then `gain.setValueAtTime(peak, at)` and `gain.exponentialRampToValueAtTime(0.001, at + decay)`. Nothing is timed by `setTimeout`, so a busy main thread cannot skew a note.',
    '`audibleAt(ctx, at)` converts that audio time into a `performance.now()` millisecond value. `ctx.getOutputTimestamp()` returns a matched pair — the sample frame currently leaving the output device and the wall-clock instant it left — so the mapping is `ts.performanceTime + (at - ts.contextTime) * 1000`. Hardware output latency is already inside that pair; adding `outputLatency` on top double-counts it.',
    'When `getOutputTimestamp` is unavailable, or has not rendered a frame yet and returns `contextTime: 0`, the fallback is `performance.now() + (at - ctx.currentTime) * 1000 + min(outputLatency, 0.05) * 1000`. `currentTime` is the write head, not the speaker, so the latency has to be added back in this branch only.',
    'Each step is pushed onto a queue sorted by wall-clock time, and a rAF loop pops every entry whose time has passed and calls `onStep(index, total)`. Overlapping bursts merge into one sorted queue rather than one loop per burst.',
    'The loop is subscribed only while the queue is non-empty — `useRaf(tick, running)` — and unsubscribes itself on the frame it drains the last step, so an idle instrument holds no animation frame.',
    'The `AudioContext` is constructed inside `fire()`, which the caller invokes from a click handler, and `resume()` is called if the browser still hands it back suspended. Constructing it at mount produces a suspended context whose scheduled notes are silently discarded.',
    '`fire(steps)` caps at `chord.length` and returns the count actually scheduled, so a caller that has fewer flares available than the chord has notes hears exactly as many notes as it shows.',
  ],

  constants: [
    {
      name: 'step',
      value: '0.46',
      why: 'Seconds between notes, and the same number the visuals use. Around 130 bpm in eighths — fast enough to read as one gesture rather than four separate events, slow enough that each flare is individually visible. Below ~0.2s the flares smear into one flash; above ~0.7s the burst stops sounding like a chord and starts sounding like four taps.',
    },
    {
      name: 'gain',
      value: '0.15',
      why: 'Peak amplitude of a single sine. Four notes overlapping at 1.0 would sum past full scale and hard-clip the destination; 0.15 leaves headroom for the tails of earlier notes still decaying under later ones.',
    },
    {
      name: 'SILENCE',
      value: '0.001',
      why: '-60 dB, the ramp target. `exponentialRampToValueAtTime` is mathematically undefined at 0 and throws; ramping to a literal 0 is the single most common Web Audio error. -60 dB is inaudible.',
    },
    {
      name: 'decay',
      value: '0.4',
      why: 'Seconds from peak to silence. Slightly shorter than the 0.46s step so a note has essentially finished before the next arrives — overlap past about 0.6s turns the arpeggio into a chord and the individual attacks stop being audible.',
    },
    {
      name: 'TAIL',
      value: '0.1',
      why: 'Extra seconds before `osc.stop()`. Stopping an oscillator exactly at the end of its ramp truncates the last samples and can produce a faint click; 0.1s of -60 dB signal costs nothing and guarantees the stop is inaudible.',
    },
    {
      name: 'LEAD',
      value: '0.02',
      why: 'Seconds of lead before the first note. One render quantum at 44.1 kHz is 128 samples, about 2.9 ms; 20 ms covers several quanta plus the jitter in getting from the click to the scheduling call. Scheduling at exactly `currentTime` means the first note is already partly in the past and its attack is clipped.',
    },
    {
      name: 'MAX_LATENCY',
      value: '0.05',
      why: 'Ceiling on the fallback latency compensation, in seconds. Bluetooth output can report 150-300 ms; delaying the visual by that much to match makes the click itself feel broken. Capping trades exact sync on pathological hardware for a UI that still responds.',
    },
  ],

  pitfalls: [
    'Constructing the `AudioContext` at mount. Outside a user gesture the browser hands back a `suspended` context; `osc.start(at)` on it neither throws nor plays, so the bug presents as "audio just does not work" with a clean console.',
    'Ramping the gain to 0. `exponentialRampToValueAtTime(0, t)` throws a `RangeError` — the target must be strictly positive. Ramp to 0.001 instead.',
    'Using `setTimeout` for the notes so audio and visuals share a timer. Both then inherit the main thread\'s jitter, and on a frame that takes 80 ms the note lands 80 ms late while the sample-accurate alternative would not have moved.',
    'Adding `outputLatency` on top of a `getOutputTimestamp()` mapping. That pair is measured at the output device and already contains the latency, so adding it again pushes every flare a full hardware buffer behind its note — the exact defect the conversion exists to prevent.',
    'Trusting `getOutputTimestamp()` immediately after construction. Before the graph has rendered a quantum both fields read 0, which maps every future note to wall-clock zero and dumps the entire burst onto the next frame.',
    'Never disconnecting the oscillator and gain. Both stay attached to the destination after the note ends; a few hundred bursts in one session and the graph is carrying hundreds of dead nodes, which shows up as rising CPU and eventually distortion.',
    'Keeping a rAF loop running so the flare queue can be polled. The queue is empty almost all the time — subscribe on `fire`, unsubscribe on the frame the last step drains.',
    'Letting the notes overlap at full gain when reduced motion collapses the stagger. Four sines at 0.15 sum to 0.6 and the summed peak clips; the per-note gain has to be divided by the note count in the collapsed case.',
    'Forgetting `ctx.close()` on unmount. Chrome allows roughly six live `AudioContext` objects per document and throws on the next one, so a page that mounts this in a list silently stops producing sound after the sixth item.',
  ],

  notes: [
    'The hook deliberately exposes no `play()` that can be called from an effect. `fire` is the only entry point and its contract is "call me from a gesture handler" — encoding the autoplay policy in the API rather than in a comment.',
    'Two clocks, two policies. Reduced motion collapses the stagger but does not mute anything: the sound is feedback for a click the user made, not ambient decoration, and silencing it removes information.',
    '`chord` is any frequency list. A minor triad is `[261.63, 311.13, 392]`; a single frequency makes it a one-shot tick with the same scheduling guarantees.',
  ],

  apiSignature:
    'function useBurstAudioSync(options?: { chord?: readonly number[]; step?: number; gain?: number; decay?: number; onStep?: (index: number, total: number) => void; muted?: boolean }): { fire: (steps?: number) => number; unlocked: boolean }',

  props: [
    { name: 'chord', type: 'readonly number[]', default: '[261.63, 329.63, 392, 523.25]', description: 'One frequency in Hz per step. Caps how many notes a single `fire` can schedule.' },
    { name: 'step', type: 'number', default: '0.46', description: 'Seconds between steps. Shared by the audio schedule and the visual queue.' },
    { name: 'gain', type: 'number', default: '0.15', description: 'Peak gain of one note. Divided by the note count when the stagger collapses.' },
    { name: 'decay', type: 'number', default: '0.4', description: 'Seconds for the exponential ramp from `gain` down to -60 dB.' },
    { name: 'onStep', type: '(index: number, total: number) => void', description: 'Called on the frame nearest each note. `index` is the position in the chord.' },
    { name: 'muted', type: 'boolean', default: 'false', description: 'Skips audio entirely. Visual steps still fire on the same schedule, so the UI is unchanged.' },
  ],

  reducedMotion:
    'The stagger collapses to zero: all notes are scheduled at the same audio time and every `onStep` fires on one frame, so the burst is a chord rather than a sequence travelling across the screen. Audio is not muted — it is direct feedback for a click, not ambient motion — but the per-note gain is divided by the note count because the notes now overlap.',

  cleanup:
    'The unmount cleanup empties the pending-step queue and calls `ctx.close()`, which cancels every note still scheduled in the future and releases the hardware. The rAF subscription is owned by `useRaf` and released when `running` goes false or the component unmounts. Each oscillator disconnects itself and its gain node in `onended`.',

  acceptance:
    'Click a string: four flares appear 0.46s apart and each one coincides with a note — watch the fourth flare and hear the fourth note land together, not a beat apart. Click a string at either end and only one flare appears and only one note sounds. Nothing plays before the first click. Toggle sound off and the flares keep exactly the same timing. With reduced motion on, all four strings light in the same frame and you hear a chord. Unmount mid-burst and the remaining notes do not play.',

  criticalRegion: 'critical',
};

export default meta;
