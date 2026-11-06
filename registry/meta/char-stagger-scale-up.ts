import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'char-stagger-scale-up',
  title: 'Char Stagger Then Scale-Up',
  category: 'text',
  tags: ['gsap', 'split', 'stagger', 'timeline', 'headline'],
  blurb:
    'Characters resolve left to right, then the whole word scales up with an overshoot as the last one lands.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/char-stagger-scale-up.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'The headline is on screen from the first frame — small and ghosted, reading as a label. Characters resolve one at a time from left to right, and just before the last one lands the whole word scales to full size with a `back.out` overshoot. It assembles itself, then it asserts itself. Supporting copy fades up a quarter of a second into the scale, so the page is never doing only one thing at a time.',

  mechanism: [
    'The text is split in JSX, not in the DOM: `text.split(" ")` gives word boxes, `Array.from(word)` gives one `inline-block` span per character. React owns every node, so no library mutates the tree and no `revert()` is needed to restore it.',
    'The idle state — `opacity: dimOpacity` per character and `transform: scale(scaleFrom)` on the word — is written as inline JSX styles, not by GSAP. That makes the server-rendered markup and the no-JS render identical to the pre-animation frame, and it means a parent re-render cannot wipe out what GSAP wrote, because React only ever diffs props against props.',
    'A `gsap.timeline` first tweens `[data-char]` to `opacity: 1` with `stagger: 0.07` and `duration: 0.28` on `power1.out`.',
    'The word scale is appended at position `">-0.05"` — 50 ms *before* the character stagger ends. The overlap is what fuses two phases into one gesture; at `">"` they read as two separate animations queued back to back.',
    'Supporting copy (`[data-fade]`) is appended at `"<0.25"` — 250 ms after the *scale started*, not after it finished. Relative-to-previous-start positioning is what keeps the choreography overlapping rather than sequential.',
    '`transformOrigin: "50% 50%"` is set explicitly on the scale tween even though it is the default: a heading inside a flex column can inherit an origin from an earlier transform on an ancestor, and the word then grows out of one corner.',
  ],

  constants: [
    {
      name: 'SCALE_FROM',
      value: '0.42',
      why: 'Starting scale of the word. Around 0.4 the text reads as a caption; past ~0.65 the growth is not large enough to register as a change of role, and below ~0.3 the characters are illegible while they stagger, so the first half of the animation is wasted.',
    },
    {
      name: 'DIM_OPACITY',
      value: '0.24',
      why: 'Resting strength of an unresolved character, as opacity on `currentColor`. Zero would make the reveal a pop-in and lose the ghosted-label reading; above ~0.4 there is not enough contrast between resolved and unresolved for the sweep to be visible.',
    },
    {
      name: 'CHAR_STAGGER',
      value: '0.07',
      why: 'Seconds between adjacent characters. A ten-character word takes 0.7s to sweep. Below ~0.04 the characters resolve as a block; above ~0.12 a long headline outlasts the reader\'s patience.',
    },
    {
      name: 'CHAR_DURATION',
      value: '0.28',
      why: 'Seconds for one character. Deliberately four times the stagger, so several characters are always mid-resolve — that overlap is what makes it a sweep rather than a sequence of individual pops.',
    },
    {
      name: 'SCALE_DURATION',
      value: '0.9',
      why: 'Seconds for the scale-up. `back.out` spends most of its curve on the settle, so a shorter duration compresses the overshoot into something that reads as a bounce artefact.',
    },
    {
      name: 'OVERSHOOT',
      value: '1.3',
      why: 'The `back.out(n)` parameter. Around 1.3 the word passes a few percent beyond full size and returns. At 1.7 (GSAP\'s default) the overshoot on large type is tens of pixels and reads as a wobble.',
    },
    {
      name: 'FADE_STAGGER / FADE_DURATION / FADE_Y',
      value: '0.12 / 0.7 / 18',
      why: 'Supporting copy rises 18px over 0.7s, 0.12s apart. The travel is small on purpose — body copy that moves as far as the headline competes with it.',
    },
    {
      name: 'VIEW_THRESHOLD',
      value: '0.35',
      why: 'Fraction visible before the timeline runs. A headline is tall; requiring more than about a third means it has to be nearly centred before anything happens, and requiring less starts it while it is still a sliver at the bottom edge.',
    },
  ],

  pitfalls: [
    'Splitting text before the webfont has loaded. Character and word boxes are measured against the fallback face, so widths and line breaks are wrong and never re-flow once the real font arrives — see `font-safe-text-split` for the gating and re-split lifecycle this class of component needs.',
    'Letting a splitting library mutate the DOM under React. React has no record of the injected spans, so the next parent render replaces the whole subtree and the animation targets nodes that are no longer in the document. Splitting in JSX avoids the problem entirely.',
    'Writing the idle state with `gsap.set` in the effect. The first paint then shows the finished headline at full size before the effect runs, and it visibly snaps down before animating up.',
    'Splitting straight to characters without word boxes. A line break can then land between two letters of the same word.',
    'Hardcoding the dim colour as a hex value. `#3d3d3d` is invisible on a light background; opacity on `currentColor` composites correctly against any theme.',
    'Queuing the scale at `">"` instead of `">-0.05"`. The two phases stop overlapping and the headline reads as "characters appear… then a separate thing happens".',
    'Cleaning up with `kill()` rather than `revert()`. `kill()` stops the tweens but leaves GSAP\'s inline `transform` and `opacity` on the nodes, so a remount starts from the finished state.',
  ],

  notes: [
    'No text-splitting dependency: the split is declarative JSX. GSAP `SplitText` is reserved for the two components whose subject *is* SplitText (`nested-splittext-restore`, `font-safe-text-split`); everything else here splits in React so consumers are not forced to adopt a DOM-mutating splitter for a per-character stagger.',
    'Each word is one `inline-block whitespace-nowrap` box with a real text node for the space between words, so lines still wrap normally between words.',
  ],

  apiSignature:
    'function CharStaggerScaleUp(props: { text: string; children?: ReactNode; scaleFrom?: number; dimOpacity?: number; charStagger?: number; charDuration?: number; scaleDuration?: number; overshoot?: number; delay?: number; startOnView?: boolean; className?: string; textClassName?: string }): JSX.Element',

  props: [
    { name: 'text', type: 'string', description: 'The headline. Split per word and per character in JSX.' },
    { name: 'children', type: 'ReactNode', description: 'Supporting copy. Fades up after the scale has begun.' },
    { name: 'scaleFrom', type: 'number', default: '0.42', description: 'Starting scale of the whole word.' },
    { name: 'dimOpacity', type: 'number', default: '0.24', description: 'Starting opacity of each character.' },
    { name: 'charStagger', type: 'number', default: '0.07', description: 'Seconds between character reveals.' },
    { name: 'charDuration', type: 'number', default: '0.28', description: 'Seconds for one character to resolve.' },
    { name: 'scaleDuration', type: 'number', default: '0.9', description: 'Seconds for the scale-up.' },
    { name: 'overshoot', type: 'number', default: '1.3', description: 'The `back.out(n)` parameter — how far past 100% the word travels.' },
    { name: 'delay', type: 'number', default: '0', description: 'Seconds before the timeline starts.' },
    { name: 'startOnView', type: 'boolean', default: 'true', description: 'Run when scrolled into view rather than on mount.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper via `cn`.' },
    { name: 'textClassName', type: 'string', description: 'Merged onto the headline span — this is where type size and tracking go.' },
  ],

  reducedMotion:
    'The idle inline styles collapse to the finished state (`scale(1)`, `opacity: 1`, no translate) and the effect returns before building a timeline. The headline and its supporting copy are fully rendered at full size on first paint — nothing is hidden and nothing waits for a trigger.',

  cleanup:
    'The timeline is built inside a `gsap.context` scoped to the root, and teardown calls `ctx.revert()`. That kills the tweens and strips the inline `transform` and `opacity` GSAP wrote, handing the nodes back in exactly the state React rendered — which matters under React 19 StrictMode, where the effect runs twice on mount.',

  acceptance:
    'On entering the viewport the characters brighten one at a time from left to right, and the word begins growing before the last character has finished. The word overshoots full size once and settles. Supporting copy starts rising while the word is still growing, not after. Unmount mid-animation and the nodes carry no inline `transform` or `opacity`. With reduced motion enabled the finished headline is present on first paint.',

  criticalRegion: 'critical',
};

export default meta;
