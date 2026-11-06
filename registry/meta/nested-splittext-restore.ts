import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'nested-splittext-restore',
  title: 'Nested Split With True Restore',
  category: 'text',
  tags: ['gsap', 'splittext', 'lines', 'mask', 'revert'],
  blurb:
    'Splits rich markup into masked lines and restores the original innerHTML byte-for-byte on teardown.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/nested-splittext-restore.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'Splitting text destroys the markup inside it: a paragraph containing an `<em>` and an `<a>` goes into SplitText as semantic HTML and comes out as a flat pile of divs. This component splits into masked lines that rise into view, preserves each child element\'s own tag through the split, and on teardown restores the container\'s `innerHTML` byte-identically to what it was before anything touched it.',

  mechanism: [
    '`const originalHTML = el.innerHTML` is captured **before** any pre-processing. This string is the contract — everything else is arranged so it can be reapplied exactly.',
    'The nested pre-pass walks the container\'s element children. Each child is split to lines on its own with a throwaway `new SplitText(child, { type: "lines" })`; the line markup is read while that split is live, the split is reverted, and each line is re-emitted inside a **shallow clone** of the child (`child.cloneNode(false)`) before the child is removed. A shallow clone carries the tag and every attribute and none of the content — `cloneNode(true)` would duplicate the child\'s entire text into every line.',
    'The container is then split for real with `new SplitText(el, { type, mask: "lines", linesClass, aria: "auto" })`, and `gsap.from(split.lines, { yPercent: 110, duration: 0.9, stagger: 0.08, ease: "power3.out" })` runs inside a `gsap.context` scoped to the element.',
    'The build is deferred behind `document.fonts.ready`, because line boxes measured against the fallback face break in the wrong places and never re-flow when the real font arrives. A `cancelled` flag closes the async gap so a build cannot start after unmount.',
    'Teardown runs in a fixed order: `ctx.revert()` first, so the tween\'s inline styles are removed while the split nodes still exist; then `split.revert()`; then `if (el.innerHTML !== originalHTML) el.innerHTML = originalHTML`.',
    'That last line is the whole point. GSAP\'s `revert()` restores the string SplitText itself captured at construction time — which, after a nested pre-pass, is the *intermediate* markup, not the original. The explicit restore is what makes the guarantee real.',
  ],

  constants: [
    {
      name: 'Y',
      value: '110',
      why: 'Percent of a line\'s own height it starts below the mask. Past 100 rather than at it, because `mask: "lines"` clips to the line box and descenders on the first frame otherwise peek below the mask edge on tall faces.',
    },
    {
      name: 'DURATION',
      value: '0.9',
      why: 'Seconds per line. Long enough that `power3.out` has room for its deceleration; below ~0.5s the ease flattens and the lines read as snapping into place.',
    },
    {
      name: 'STAGGER',
      value: '0.08',
      why: 'Seconds between lines. About a tenth of the duration, so five or six lines are always in motion together and the block reads as one rising mass rather than as a queue.',
    },
    {
      name: 'VIEW_THRESHOLD',
      value: '0.25',
      why: 'Fraction of the block visible before splitting and revealing. A paragraph is tall, so requiring more than about a quarter means it must be nearly centred before anything happens.',
    },
    {
      name: 'cloneNode(false)',
      value: 'false',
      why: 'Shallow, always. `true` copies the child\'s descendants, so every line of a five-line paragraph contains the whole paragraph and the block renders five times its own height.',
    },
  ],

  pitfalls: [
    'Trusting `revert()` to restore the original markup after a nested pre-pass. SplitText snapshots `innerHTML` at construction, which by then is your intermediate line markup — `revert()` faithfully restores the wrong thing, and the `<em>` and `<a>` are gone for good.',
    'Splitting before the webfont loads. Lines are measured against the fallback face, so they break in the wrong places and never re-flow; the mask then clips text that has moved outside its line box. See `font-safe-text-split`.',
    'Using `cloneNode(true)` in the pre-pass. Each line inherits the child\'s full contents and the block explodes to several times its height.',
    'Reading the line markup after reverting the inner split. Revert restores the child to its unsplit state, so you read the whole child back and produce one "line" containing everything.',
    'Reverting the split before the context. GSAP\'s inline styles are then orphaned on nodes the context can no longer find, so a remount starts from a half-animated state.',
    'Letting SplitText\'s line divs into the accessibility tree. Without `aria: "auto"` a screen reader announces one fragment per line, mid-sentence; with it SplitText restores the original text for assistive technology.',
    'Splitting at all under reduced motion. There is nothing to gain and a whole DOM tree to rebuild — the markup React rendered is already the finished state.',
  ],

  notes: [
    'This is one of the two components that deliberately use GSAP `SplitText`, because the technique *is* SplitText: nested splitting and the shortcomings of its `revert()`. `SplitText` ships inside the main `gsap` package and is free to use; it is imported from `gsap/SplitText` rather than vendored, so this is a use grant and no redistribution is involved. The other text components here split declaratively in JSX so consumers are not forced into GSAP for effects that do not need it.',
    'The acceptance criterion is exact and testable: after teardown, `element.innerHTML` is byte-identical to what it was before the split — tags, attributes and whitespace included, not merely visually equivalent.',
    'The `nested` prop can be turned off for a single flat paragraph, in which case the pre-pass is skipped and the restore write never fires because the strings already match.',
  ],

  apiSignature:
    'function NestedSplitRestore(props: { children: ReactNode; type?: string; mask?: boolean; nested?: boolean; y?: number; duration?: number; stagger?: number; delay?: number; startOnView?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Markup to split. Element children keep their own tags and attributes through the pre-pass.' },
    { name: 'type', type: 'string', default: "'lines'", description: 'SplitText `type`. Lines are what the mask and the reveal use.' },
    { name: 'mask', type: 'boolean', default: 'true', description: 'Wrap each line in an overflow-hidden box so it rises out of nothing.' },
    { name: 'nested', type: 'boolean', default: 'true', description: 'Run the per-child pre-pass. Turn off for a single flat paragraph.' },
    { name: 'y', type: 'number', default: '110', description: "Percent of a line's height it starts below the mask." },
    { name: 'duration', type: 'number', default: '0.9', description: 'Seconds per line.' },
    { name: 'stagger', type: 'number', default: '0.08', description: 'Seconds between lines.' },
    { name: 'delay', type: 'number', default: '0', description: 'Seconds before the first line moves.' },
    { name: 'startOnView', type: 'boolean', default: 'true', description: 'Split and reveal when scrolled into view rather than on mount.' },
    { name: 'className', type: 'string', description: 'Merged onto the container via `cn`.' },
  ],

  reducedMotion:
    'No split happens at all — the effect returns before touching the DOM. The markup React rendered is the finished state, so the text is fully visible and fully semantic on first paint, with every `<em>` and `<a>` intact. This is both the accessible answer and the fast one.',

  cleanup:
    'A `cancelled` flag guards the async `document.fonts.ready` boundary. Teardown then runs `ctx.revert()` (kills the tweens and strips their inline styles while the split nodes still exist), `split.revert()`, and finally an explicit `el.innerHTML = originalHTML` when the two differ — the true restore.',

  acceptance:
    'Record `element.innerHTML` before mounting, unmount, and compare: the two strings are byte-identical, including the `<em>` and `<a>` tags and their attributes. Visually, lines rise from behind their own mask edge, staggered, with no character visible below the mask on the first frame. A screen reader reads the paragraph as continuous prose rather than as one fragment per line. With reduced motion enabled the paragraph is fully rendered on first paint and the DOM is never modified.',

  criticalRegion: 'critical',
};

export default meta;
