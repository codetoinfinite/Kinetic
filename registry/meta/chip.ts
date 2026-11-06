import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'chip',
  title: 'Chip',
  category: 'display',
  kit: 'boardui',
  tags: ['chip', 'status', 'label', 'delta', 'badge', 'boardui'],
  blurb: 'Coloured status, delta and role chips in three emphasis levels and ten theme-aware colour pairs on a 6px radius.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/chip.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A single `<span>` label with a tinted background and a matching text colour, used for statuses ("Completed", "Waiting"), percentage deltas, prices and role tags. Three variants change only the vertical padding and type style, and ten colours map to semantic background/text pairs, so a chip follows light and dark mode without any `dark:` classes. The colour map is exported as `CHIP_COLORS` and reused by Tag Group.',

  mechanism: [
    'Export `CHIP_COLORS`, a `Record<ChipColor, string>` of background + text pairs. The seven hues use `bg-status-<hue>-background text-status-<hue>-text`. `neutral`, `gray` and `soft` reuse surface tokens (`bg-background-tertiary-default` / `bg-background-secondary-default` with `text-text-secondary` or `text-text-primary`).',
    'Build the style map with `sortCx`: `base` is `inline-flex items-center justify-center rounded-md px-1.5 whitespace-nowrap`, and `variant` sets `py-0.5 text-body-medium` (bold), `py-1 text-body-medium` (subtle) or `py-1 text-caption-1-medium` (caption).',
    'Define the status tokens per theme. Light pairs the 200 step background with 800 text (purple: 100 with 600). Dark mixes the 950 step at 60% with `transparent` behind 500/400/300 text (purple: 900 at 50% behind 300), so chips glow softly on dark cards instead of sitting as bright blocks.',
    'Render one `<span>` whose classes are `cx(base, variant, color, className)`. `cx` is the kit\'s `tailwind-merge`, so a caller `px-2` or `rounded-full` replaces the default instead of fighting it.',
    'Add `transition-[padding,font-size] duration-200` to the base, so a chip that changes variant in place (for example when a table switches density) eases its size instead of jumping.',
  ],

  constants: [
    {
      name: 'horizontal padding / radius',
      value: 'px-1.5 (6px), rounded-md (6px)',
      why: 'Shared by every variant so chips of different emphasis line up on their left edges in a column and keep the same corner.',
    },
    {
      name: 'variant padding',
      value: 'bold py-0.5 (2px), subtle py-1 (4px), caption py-1 (4px)',
      why: 'Bold is the dense status chip that fits a 32px table row (20px line + 4px). Subtle is the roomier price chip. Caption pairs 4px padding with the 12px type style for role tags.',
    },
    {
      name: 'type',
      value: 'text-body-medium (14/20, 500) or text-caption-1-medium (12/16, 500)',
      why: 'Medium weight keeps the coloured text readable on a tinted fill; the caption tier exists for secondary tags that must not compete with the row\'s main label.',
    },
    {
      name: 'dark status fill',
      value: 'color-mix(in srgb, <hue>-950 60%, transparent)',
      why: 'A translucent fill takes on the colour of whatever card it sits on, so the same chip works on primary and secondary dark surfaces.',
    },
  ],

  pitfalls: [
    'Do not hard-code palette classes such as `bg-lime-200 text-lime-800` on a chip. The semantic `status-*` tokens are what switch to the translucent dark-mode pair.',
    'Do not remove `whitespace-nowrap`. A two-word status such as "In review" wraps inside a narrow table cell and doubles the row height.',
    'Do not encode meaning in colour alone. A rose chip still needs its "Failed" or "-3.2%" text.',
    'Do not add a new colour only to `ChipColor`. It has to exist in `CHIP_COLORS` and as a token in both themes, or the chip renders with no fill.',
  ],

  notes: [
    '`CHIP_COLORS` is imported by `tag-group`, so its tags share the exact chip palette.',
    'The default is `variant="bold"` and `color="neutral"`.',
  ],

  apiSignature:
    'type ChipColor = "orange" | "lime" | "rose" | "yellow" | "cyan" | "blue" | "purple" | "neutral" | "gray" | "soft"\nconst CHIP_COLORS: Record<ChipColor, string>\ninterface ChipProps extends HTMLAttributes<HTMLSpanElement> { variant?: "bold" | "subtle" | "caption"; color?: ChipColor; ref?: Ref<HTMLSpanElement> }\nfunction Chip(props: ChipProps): JSX.Element',

  props: [
    { name: 'variant', type: '"bold" | "subtle" | "caption"', default: '"bold"', description: 'Vertical padding and type style: 2px + 14px, 4px + 14px, or 4px + 12px.' },
    { name: 'color', type: 'ChipColor', default: '"neutral"', description: 'One of ten background/text pairs from `CHIP_COLORS`.' },
    { name: 'className', type: 'string', description: 'Merged last through `tailwind-merge`.' },
    { name: 'ref', type: 'Ref<HTMLSpanElement>', description: 'Forwarded to the span (React 19 ref-as-prop).' },
  ],

  reducedMotion:
    'The only motion is a 200ms padding/font-size transition when a chip changes variant in place. It is not disabled under `prefers-reduced-motion`, since it is a size change, not movement across the screen.',

  cleanup: 'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    'Twelve chips across all three variants and the ten colours wrap into a ragged cloud. Bold chips are 24px tall, subtle 28px and caption 24px, all with 6px side padding and 6px corners. In light mode the hue chips show a pale fill with dark text; in dark mode the same chips show a translucent dark fill with lighter text. Text never wraps inside a chip.',

  criticalRegion: 'critical',
};

export default meta;
