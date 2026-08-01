import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'morphsvg-letter-scramble',
  title: 'Letter Scramble',
  category: 'text',
  tags: ['gsap', 'scramble', 'timeline', 'prng', 'split'],
  blurb:
    'A word assembles out of noise — each character flips through wrong glyphs, decelerating onto the right one.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/morphsvg-letter-scramble.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'Every character flips through a handful of wrong glyphs and then lands on the right one, each character starting a tenth of a second after the one before it, so the resolution sweeps left to right across the word. Each successive flip is held slightly longer than the last, which is what makes it read as settling rather than as a spinner that was switched off. Character widths are frozen to their final glyph before the first substitution, so the word does not breathe while it scrambles.',

  mechanism: [
    'The word is split in JSX to one `inline-block` span per character, each carrying `data-final` with its resolved glyph. React owns every node; nothing is injected into the DOM.',
    'A single `gsap.timeline` schedules `tl.call()` at absolute times. For character `i` the start time is `START_DELAY + i * stagger`; for flip `f` the time advances by `baseFlip + f * flipGrowth`, so hold durations grow 0.08, 0.105, 0.13, 0.155 … That arithmetic progression is the deceleration.',
    'Each `call` assigns `c.textContent = randomGlyph`. After the last flip a final `call` writes `c.dataset.final`, and a `fromTo(c, { opacity: DIM }, { opacity: 1, duration: settle, ease: "power3.out" })` runs at the same time — the fade is what separates "resolved" from "one more wrong glyph".',
    'Glyphs come from a seeded PRNG (`createRng(seed ?? text + ":" + run)` and `randInt`), never `Math.random`. The glyph sequence decides what is painted on the first client frame, and a server/client disagreement about that is a hydration mismatch.',
    'Before the timeline is built, every character box is pinned with `c.style.width = getBoundingClientRect().width + "px"`, measured from the *final* glyph that is currently in the DOM. Proportional type gives `i` and `W` wildly different advance widths, so an unpinned word visibly breathes and every element after it on the line shudders in sympathy. A final `tl.call` at position `">"` clears the widths so the word reflows normally afterwards.',
    'The whole build is deferred behind `document.fonts.ready`, because measuring before the webfont lands pins every box to a fallback-font width.',
    'The real word is rendered once in an `sr-only` span and the animated characters are `aria-hidden`, since mid-flight they are literal garbage.',
  ],

  constants: [
    {
      name: 'GLYPHS',
      value: "'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*'",
      why: 'The substitution pool. Uppercase and figures keep the visual weight even; adding lowercase mixes x-height and cap-height so the word appears to jitter vertically as well as horizontally. The punctuation adds texture without introducing very narrow glyphs.',
    },
    {
      name: 'FLIPS',
      value: '7',
      why: 'Wrong glyphs per character before resolving. Below ~4 there is no sense of searching; past ~10 the tail characters of a long word are still churning after the reader has looked away.',
    },
    {
      name: 'STAGGER',
      value: '0.1',
      why: 'Seconds between adjacent characters starting. Roughly the flip interval, so the sweep front is a couple of characters wide. Much smaller and the whole word scrambles as a block, losing the left-to-right read.',
    },
    {
      name: 'BASE_FLIP',
      value: '0.08',
      why: 'Seconds the first wrong glyph is held. About five frames at 60Hz — fast enough to be a blur, slow enough that the substitution is not skipped entirely on a slow frame.',
    },
    {
      name: 'FLIP_GROWTH',
      value: '0.025',
      why: 'Seconds added to each successive hold. This is the deceleration and it is the whole character of the effect: at 0 the flipping is constant-interval and reads as a slot machine that stopped, rather than as a search converging.',
    },
    {
      name: 'SETTLE',
      value: '0.45',
      why: 'Seconds of the opacity fade landing with the final glyph. Long enough to be a distinct beat after 0.08s flips; a shorter fade is indistinguishable from another substitution.',
    },
    {
      name: 'DIM',
      value: '0.35',
      why: 'Opacity the settle fade starts from. Fading from 0 makes the character disappear for a frame between the last wrong glyph and the right one, which reads as a dropped frame.',
    },
    {
      name: 'START_DELAY',
      value: '0.25',
      why: 'Seconds before the first character begins. Gives the page a moment to settle, so the scramble is not competing with layout for the reader\'s attention.',
    },
    {
      name: 'VIEW_THRESHOLD',
      value: '0.4',
      why: 'Fraction visible before the timeline runs, so a headline low on the page has actually arrived before it scrambles.',
    },
  ],

  pitfalls: [
    'Using `Math.random()` for the glyph sequence. The server and the client pick different glyphs, React reports a hydration mismatch, and the first frame flickers as the tree is patched.',
    'Not freezing the character widths. Every substitution changes the advance width, so the word pulses and everything after it on the line jitters for the whole animation.',
    'Measuring those widths before `document.fonts.ready`. Each box is then pinned to a fallback-font width, and when the real font arrives the glyphs are clipped or swimming inside boxes that are visibly the wrong size — the same failure mode described in `font-safe-text-split`.',
    'Measuring the width of a substituted glyph rather than the final one. The box is locked to the wrong character forever.',
    'Never releasing the frozen widths. The word cannot reflow on a viewport change or a late font swap, so it breaks out of its container at narrow widths.',
    'Constant-interval flipping. Without the growing hold the effect reads as a slot machine that was switched off rather than as a search that converged.',
    'Leaving the scrambling characters in the accessibility tree. A screen reader announces the random glyphs as they change; the real word must be exposed separately and the animated spans hidden.',
    'Re-running the effect from a `Math.random`-seeded value or an inline callback prop. The dependency array must contain only stable values or the scramble restarts on every parent render.',
  ],

  notes: [
    'The original technique used GSAP MorphSVGPlugin to morph hand-drawn letter paths into random variants. MorphSVG is a paid GSAP Club plugin, so this is the dependency-free equivalent: character substitution from a glyph set on a per-character timeline, preserving the two things that actually make the original read the way it does — the 0.1s stagger and the `0.08 + n * 0.025` deceleration.',
    'No text-splitting library either. The split is declarative JSX; `SplitText` is reserved for the components whose subject is SplitText itself.',
    'Hover replay is gated on `(pointer: fine)` and on reduced motion being off — on touch there is no hover, so it would only fire on press and read as a glitch.',
  ],

  apiSignature:
    'function LetterScramble(props: { text: string; glyphs?: string; flips?: number; stagger?: number; baseFlip?: number; flipGrowth?: number; settle?: number; replayOnHover?: boolean; startOnView?: boolean; seed?: number | string; className?: string }): JSX.Element',

  props: [
    { name: 'text', type: 'string', description: 'The resolved word. Rendered as-is for SSR, reduced motion, and assistive technology.' },
    { name: 'glyphs', type: 'string', default: "'A-Z0-9#%&@$*'", description: 'Substitution pool. Keep to glyphs of similar visual weight.' },
    { name: 'flips', type: 'number', default: '7', description: 'Wrong glyphs shown per character before it resolves.' },
    { name: 'stagger', type: 'number', default: '0.1', description: 'Seconds between adjacent characters starting.' },
    { name: 'baseFlip', type: 'number', default: '0.08', description: 'Seconds the first wrong glyph is held.' },
    { name: 'flipGrowth', type: 'number', default: '0.025', description: 'Seconds added to each successive hold. This is the deceleration.' },
    { name: 'settle', type: 'number', default: '0.45', description: 'Seconds of the fade that lands with the final glyph.' },
    { name: 'replayOnHover', type: 'boolean', default: 'true', description: 'Re-run on pointer enter, on fine pointers only.' },
    { name: 'startOnView', type: 'boolean', default: 'true', description: 'Run when scrolled into view rather than on mount.' },
    { name: 'seed', type: 'number | string', description: 'Any string or number. The same seed gives the same sequence on every render.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer span via `cn`.' },
  ],

  reducedMotion:
    'The effect returns before building anything, so the word stays exactly as React rendered it — the resolved text, at full opacity, on first paint. Hover replay is also disabled. Nothing is scrambled, hidden, or left mid-substitution.',

  cleanup:
    'A `cancelled` flag guards the async `document.fonts.ready` boundary so a build cannot start after unmount. Teardown kills the timeline and then restores every character: `textContent` back to `data-final`, and `style.width` and `style.opacity` cleared. Without that restore, unmounting mid-scramble would leave the word frozen as garbage inside pinned boxes.',

  acceptance:
    'On entering the viewport each character flips through several wrong glyphs and lands on the right one, left to right. Time the flips: the last is visibly slower than the first. The word occupies exactly the same width throughout, and nothing on the same line moves. Reload repeatedly with a fixed `seed` and the identical glyph sequence appears every time, with no hydration warning in the console. Unmount mid-scramble and remount, and the word is correct. With reduced motion enabled the resolved word is present on first paint.',

  criticalRegion: 'critical',
};

export default meta;
