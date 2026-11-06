import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'docs-callout',
  title: 'Docs Callout',
  category: 'display',
  kit: 'boardui',
  tags: ['docs', 'callout', 'admonition', 'note', 'boardui'],
  blurb:
    'Docs callout in four variants (note, tip, warning, danger) with a tinted icon chip, title, rich body and an optional collapsing dismiss.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/docs-callout.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'motion preference',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The aside a docs page drops between paragraphs: a softly tinted, bordered box with a coloured icon chip, a bold title and body copy that styles inline `code` and links. Info is blue, tip lime, warning yellow and danger rose, all from the kit status tokens so both themes stay legible. A dismissible callout shows a close button and folds its row shut before it unmounts.',

  mechanism: [
    'Each variant maps to one status token pair: the surface is `bg-status-*-background/45` with a `border-status-*-text/20` hairline, and the 24px icon chip uses the full-strength background with the status text colour. The title defaults to the variant label; a custom title keeps the label for screen readers as an `sr-only` "Warning: " prefix.',
    'The box is `role="note"` labelled by its title, which is the ARIA role for a parenthetical aside; it is never `alert`, because docs callouts are static content.',
    'The body gets descendant styles through arbitrary variants (`[&_code]:`, `[&_a]:`, `[&_p+p]:`), so MDX or plain JSX children pick up code chips, underlined links and paragraph spacing without extra components.',
    'Dismiss runs a three-phase state: pressing close calls `onDismiss` immediately (so the caller can move focus), then the wrapper goes to "leaving": `inert`, `grid-rows-[0fr]`, `opacity-0` and `-translate-y-1` over 200ms. A 200ms timeout in an effect flips it to "gone" and the component returns null. With reduced motion it skips straight to "gone".',
  ],

  constants: [
    { name: 'surface tint', value: 'status background at 45%, border at 20% of status text', why: 'Reads as a coloured note in both themes without competing with the page heading.' },
    { name: 'exit', value: '200ms ease-out, grid rows 1fr to 0fr', why: 'Short enough to feel like a direct response; collapsing the row lets the content below slide up instead of jumping.' },
    { name: 'icon chip', value: '24px, rounded-lg, 16px glyph', why: 'Matches the close button size so the first line aligns on both edges.' },
  ],

  pitfalls: [
    'Using `role="alert"` for danger callouts. Screen readers interrupt to announce static docs text on page load; `role="note"` is the right semantics.',
    'Unmounting on press with no focus plan. The focused close button vanishes and focus falls to `<body>`; use `onDismiss` to move focus to a nearby control.',
    'Animating `height: auto` with JS measurements. Transitioning `grid-template-rows` from 1fr to 0fr collapses to zero with pure CSS.',
    'Relying on colour alone for the variant. The title (or the sr-only prefix) names it in words.',
  ],

  notes: [
    'The callout keeps its own dismissed state. To bring it back, remount it (change its `key`), as the demo\'s Restore button does.',
    '`className` lands on the outer wrapper, so grid placement and margins work; pass `icon={null}` to drop the chip.',
  ],

  apiSignature:
    'function DocsCallout(props: { variant?: "info" | "tip" | "warning" | "danger"; title?: ReactNode; children?: ReactNode; icon?: IconComponent | null; dismissible?: boolean; onDismiss?: () => void; dismissLabel?: string; className?: string }): JSX.Element | null',

  props: [
    { name: 'variant', type: '"info" | "tip" | "warning" | "danger"', default: '"info"', description: 'Colour, icon and default title.' },
    { name: 'title', type: 'ReactNode', default: '"Note" / "Tip" / "Warning" / "Danger"', description: 'Heading; a custom one keeps the variant name as an sr-only prefix.' },
    { name: 'children', type: 'ReactNode', description: 'Body copy; inline `code`, links and paragraphs are styled.' },
    { name: 'icon', type: 'IconComponent | null', description: 'Replaces the variant icon; `null` hides the chip.' },
    { name: 'dismissible', type: 'boolean', default: 'false', description: 'Shows a close button that collapses and unmounts the callout.' },
    { name: 'onDismiss', type: '() => void', description: 'Called on press, before the exit animation; move focus here.' },
    { name: 'dismissLabel', type: 'string', default: '"Dismiss <variant>"', description: 'Accessible name of the close button.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer wrapper.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion` the component skips the leaving phase and unmounts at once (`useReducedMotion`), and the wrapper transition carries `motion-reduce:transition-none`.',

  cleanup:
    'The only timer is the 200ms leaving timeout, set in an effect keyed on the phase and cleared in its cleanup, so unmounting mid-exit leaves nothing running.',

  acceptance:
    'The demo shows Note, Tip, "Captions are for labels" (warning) and Danger callouts in a two-column grid that stacks to one column on phones. Each is a `role="note"` named by its title. Pressing "Dismiss tip" moves focus to Restore, the tip folds away within about 200ms and Restore reads "Restore (1)"; dismissing the warning makes it "Restore (2)". Pressing Restore brings both back and the button returns to "Restore", aria-disabled.',

  criticalRegion: 'critical',
};

export default meta;
