import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agent-thinking',
  title: 'Agent Thinking',
  category: 'display',
  kit: 'boardui',
  tags: ['agent', 'ai', 'loader', 'status', 'shimmer', 'boardui'],
  blurb: 'The "thinking" line above a chat composer: dot wave, dot spin, stars or infinity, with a shimmering label and an elapsed timer.',
  cost: 'dom',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/agent-thinking.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'The status line an agent shows while it works on a reply. Four indicators share one layout: a 3×3 dot grid with a diagonal wavefront (`wave`), the same grid with a bright head orbiting it (`spin`), five sparkles twinkling in a stagger (`stars`) and a comet lapping a figure-eight (`infinity`). Each sits next to a label with a travelling text shimmer and an optional elapsed-seconds counter, inside a `role="status"` row whose colour comes from one of four tones.',

  mechanism: [
    'The dot variants are driven from JavaScript. Each of the nine cells gets a scalar in [0, 1) along the direction of travel: for `wave` it is `(col + row) / 4` compressed by 3/4, so the front leaves the grid before the phase wraps; for `spin` it is the cell\'s `atan2` angle around the centre, which is naturally cyclic.',
    'A `setInterval` every 80ms advances the phase by 1/8 (one lap per 640ms) and recomputes opacities as a comet: `behind = (phase - s + 1) % 1`, `lit = max(0, 1 - behind / 0.3) ** 1.5`, mapped onto 0.12–1. A 220ms CSS opacity transition on every cell blends the 80ms steps into a glide.',
    '`stars` is pure CSS: five 4-point sparkle paths placed at fixed percentages and scales, each running the `bui-agent-thinking-star` keyframes (scale 0 → 1 → 0.8 → 0 with fade) over 1.4s, with `animation-delay` staggered by `i × 1.4 × 0.7 / 5`s.',
    '`infinity` draws the figure-eight twice: a 15%-opacity track, and a copy with `pathLength={100}` and `strokeDasharray="11 89"` whose `stroke-dashoffset` animates to -100 every 1.2s, so an 11%-long dash laps the loop at constant speed.',
    'The root sets `color` and `--bui-agent-thinking-tone` to the tone colour. The indicators paint with `currentColor`; the label\'s `.bui-agent-thinking-label` paints a 300%-wide gradient (tone at 55% → 100% → 55%) through `background-clip: text` and slides it with the theme\'s `ai-chat-text-shimmer` keyframes over 2.6s.',
    '`ElapsedTimer` records `performance.now()` on mount and re-renders every 100ms with `elapsed.toFixed(1)` seconds in a tabular mono caption.',
  ],

  constants: [
    {
      name: 'DOTS_GRID / DOTS_SIZE / DOTS_GAP',
      value: '3 / 4px / 2px',
      why: 'Three 4px cells and two 2px gaps make a 16px square indicator beside the label.',
    },
    {
      name: 'DOTS_TICK_MS / DOTS_PHASE_STEP',
      value: '80ms / 1/8',
      why: 'Eight steps per lap gives a 640ms cycle: lively without reading as a flicker.',
    },
    {
      name: 'DOTS_FADE_MS',
      value: '220ms',
      why: 'Longer than the 80ms tick, so each cell is always mid-transition and the stepped updates read as continuous motion.',
    },
    {
      name: 'DOTS_TRAIL / DOTS_MIN_OPACITY',
      value: '0.3 / 0.12',
      why: 'The tail covers 30% of the lap with a power-1.5 falloff; unlit cells keep 12% so the grid shape never disappears.',
    },
    {
      name: 'DOTS_SEED',
      value: '[0.55, 0.3, 0.15, 0.85, 0.55, 0.3, 1, 0.85, 0.55]',
      why: 'A fixed first frame shared by server and client, and the resting state under reduced motion.',
    },
    {
      name: 'STAR_PERIOD_S / STAR_SIZE / STAR_COUNT',
      value: '1.4s / 14px / 5',
      why: 'The box is 21px (1.5 × size); the largest sparkle is 14px and the others are scaled 0.4–0.55 around it.',
    },
    {
      name: 'INFINITY_TRAIL / INFINITY_STROKE / INFINITY_DURATION_S',
      value: '11 of 100 / 2.75 / 1.2s',
      why: 'An 11% dash is long enough to read as a comet but short enough to stay on one lobe of the eight at a time.',
    },
    {
      name: 'TONE_COLORS',
      value: 'subtle text-tertiary, default text-secondary, primary text-primary, accent blue-500',
      why: 'Every variant defaults to `default` except `stars`, which defaults to `subtle`.',
    },
  ],

  pitfalls: [
    'Only the dot variants check `prefers-reduced-motion` in JavaScript, and only on mount. Changing the OS setting while one is mounted does not stop its interval until it remounts or its `variant` changes.',
    'The timer starts when the component mounts. To restart it for a new request, remount with a new `key`; changing `label` or `variant` keeps counting.',
    'The root is `role="status"` (a polite live region) and the timer text inside it changes every 100ms. If screen readers in your audience re-announce it, pass `showTimer={false}` or show the time elsewhere.',
    'The label span carries `aria-label={label}` without a role, so assistive technology reads its text content in practice. Do not rely on the attribute to change what is announced.',
    'The shimmer paints the label with `color: transparent` and a gradient. A parent that sets `background` on text or overrides `color` with `!important` will hide or flatten it.',
  ],

  notes: [
    'The infinity SVG has about 4px of empty viewBox on each side, so it uses `margin: 0 -4px` to keep the label at the same 10px gap as the other variants.',
    'In light mode the stars are softened to 75% of the tone through `color-mix`; in `.dark` they use the full tone.',
    'BoardUI\'s own preview stacks all four variants with timers off, because four clocks in one card is noise.',
  ],

  apiSignature:
    'type AgentThinkingVariant = "wave" | "spin" | "stars" | "infinity"\ntype AgentThinkingTone = "subtle" | "default" | "primary" | "accent"\nfunction AgentThinking(props: { variant?: AgentThinkingVariant; label?: string; tone?: AgentThinkingTone; shimmer?: boolean; showTimer?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'variant', type: '"wave" | "spin" | "stars" | "infinity"', default: '"wave"', description: 'Which indicator sits before the label.' },
    { name: 'label', type: 'string', default: '"Thinking"', description: 'Status text, e.g. "Searching the docs".' },
    { name: 'tone', type: '"subtle" | "default" | "primary" | "accent"', description: 'Colour of the indicator and label. Defaults to `default`, or `subtle` for `stars`.' },
    { name: 'shimmer', type: 'boolean', default: 'true', description: 'Animated highlight travelling across the label.' },
    { name: 'showTimer', type: 'boolean', default: 'true', description: 'Elapsed seconds since mount, shown after the label.' },
    { name: 'className', type: 'string', description: 'Merged onto the root flex row.' },
  ],

  reducedMotion:
    'The dot variants check `prefers-reduced-motion: reduce` on mount and, if it matches, never start their interval, so the grid rests on `DOTS_SEED`. The theme\'s reduced-motion block removes the label gradient and shows it in the plain tone, stops the comet (leaving the dash still), and shows the stars at 70% opacity instead of frozen at scale 0. The elapsed timer keeps counting, since it is information rather than decoration.',

  cleanup:
    'The dot interval and the timer interval are each cleared by their effect cleanup on unmount; the dot interval is also restarted when `variant` changes. The stars and the infinity comet are CSS animations and stop with the element. No global listeners are added.',

  acceptance:
    'With `variant="wave"` a bright band sweeps the 3×3 grid from top-left to bottom-right about every 0.64s, with a fading tail and no cell ever fully invisible. `spin` shows a head circling the grid clockwise. `stars` shows five sparkles popping in and out in a stagger; `infinity` shows a short dash lapping a faint figure-eight every 1.2s. The label shimmers left to right in the same tone as the indicator, and the timer counts up in tenths of a second from 0.0s. Remounting resets it. Under reduced motion nothing moves except the timer.',

  criticalRegion: 'critical',
};

export default meta;
