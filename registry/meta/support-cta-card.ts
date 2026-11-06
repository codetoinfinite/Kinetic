/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Support CTA Card" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'support-cta-card',
  title: 'Support CTA Card',
  category: 'display',
  kit: 'boardui',
  tags: ['cta', 'support', 'avatars', 'card', 'boardui'],
  blurb:
    'A "Still have a question?" card: stacked initials avatars, a line of copy, one contact action and an accent beam on the top border.',
  cost: 'css',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/support-cta-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'The contact strip that closes a FAQ. It shows the people who answer as overlapping kit `Avatar`s, then a title and one line of copy, then a single secondary action that is a link when given `href` and a button when given `onAction`. A short accent beam drifts back and forth along the top border. The row stacks below 36rem of container width.',

  mechanism: [
    'The first `maxAvatars` people render as `size="md"` (32px) kit Avatars with 12px initials in a `-space-x-1.5` row. Each has a `ring-2 ring-background-primary-default`, so every circle is cut out of the one behind it in the card colour. Anyone past the limit becomes one neutral "+N" avatar. Neutral avatars use `bg-background-quaternary-default`, because in dark mode the kit neutral avatar is the same colour as the card. The row is a single `role="img"` with an accessible label such as "Answered by Ada Park, Lin Okafor, Sam Ruiz and 2 more", and the individual avatars are `aria-hidden`.',
    'The action branches on `href`. With a link it renders the kit `ButtonLink`, targets `_blank` by default and adds `rel="noopener noreferrer"` when it does. Without one it renders the kit `Button` wired to `onAction`. Both use the secondary variant and take the optional `actionIcon` as `leadingIcon`.',
    'The beam is an `aria-hidden` layer at `-inset-px`: it covers the border box and clips to the card radius through `rounded-[inherit]`. Inside, a track a quarter of the card wide holds a 1px `via-accent-500` gradient line and a blurred `via-accent-400/25` glow under it. A hoisted `<style href precedence>` keyframe moves the track from `translateX(-100%)` to `translateX(400%)`, from just past the left edge to just past the right, over 7s, `infinite alternate`.',
    'The root is an `@container`, so the row follows the card width: `flex-col items-start` below `@xl` (36rem) and `flex-row items-center` from it. That is why the same component works as a full-width strip and in a 360px sidebar.',
  ],

  constants: [
    {
      name: 'beam sweep',
      value: '7s cubic-bezier(0.45, 0, 0.55, 1), infinite alternate',
      why: 'A symmetric ease-in-out with `alternate` makes the beam slow down at each end and drift back instead of jumping to the start. 7s keeps it ambient rather than attention-seeking.',
    },
    {
      name: 'beam track',
      value: 'w-1/4, translateX(-100%) → translateX(400%)',
      why: 'Percent translations are relative to the track, so -100% to 400% of a quarter-width track starts just outside the left edge and ends just outside the right edge.',
    },
    {
      name: 'avatar overlap',
      value: '-space-x-1.5 (6px) on 32px circles, 12px initials, ring-2 in the card colour',
      why: 'A 6px overlap with 12px initials leaves the ring just clear of each pair of letters, so no initial is cut. The ring has to match the card surface (`background-primary-default`) in both themes, or the cut-outs show as outlines.',
    },
    {
      name: 'stack breakpoint',
      value: '@xl (36rem of container width)',
      why: 'Below about 576px the action button squeezes the copy into three lines, so it moves under the copy instead.',
    },
  ],

  pitfalls: [
    'Clipping the beam with `overflow-hidden` on the card itself. That clips at the padding box, so the beam sits one pixel under the border and any focus ring that reaches past the card is cut off. A separate `-inset-px` layer with `rounded-[inherit]` puts the beam on the border without clipping the content.',
    'Giving every avatar its own label. A screen reader then reads five separate images. One `role="img"` with a combined name says it once.',
    'Opening `_blank` links without `rel="noopener"`. The opened page gets `window.opener` and can navigate the original tab.',
  ],

  notes: [
    'Set `beam={false}` when several cards sit together and only one should draw the eye, as the demo does for its second card.',
    'Initials are passed in rather than derived from names, so names with particles or non-Latin scripts get the initials you choose.',
  ],

  apiSignature:
    'function SupportCtaCard(props: { title?: ReactNode; description?: ReactNode; people?: { name: string; initials: string; color?: "neutral" | "blue" | "lime" | "pink" }[]; maxAvatars?: number; actionLabel?: ReactNode; actionIcon?: ComponentType<{ className?: string }>; href?: string; target?: string; onAction?: () => void; beam?: boolean; headingLevel?: 2 | 3 | 4; className?: string }): JSX.Element',

  props: [
    { name: 'title', type: 'ReactNode', default: '"Still have a question?"', description: 'Card heading.' },
    { name: 'description', type: 'ReactNode', default: '"We answer in the open, usually the same day."', description: 'One line under the title.' },
    { name: 'people', type: 'SupportPerson[]', default: '[]', description: '`{ name, initials, color? }` for each person who answers. With an empty list there is no avatar row.' },
    { name: 'maxAvatars', type: 'number', default: '3', description: 'How many avatars to show before collapsing the rest into "+N".' },
    { name: 'actionLabel', type: 'ReactNode', default: '"Get in touch"', description: 'Action text.' },
    { name: 'actionIcon', type: 'ComponentType', description: 'Leading icon component for the action, e.g. `RiDiscordFill`.' },
    { name: 'href', type: 'string', description: 'Renders the action as a link.' },
    { name: 'target', type: 'string', default: '"_blank"', description: 'Link target when `href` is set. `_blank` adds `rel="noopener noreferrer"`.' },
    { name: 'onAction', type: '() => void', description: 'Click handler when the action is a button (no `href`).' },
    { name: 'beam', type: 'boolean', default: 'true', description: 'Show the drifting accent beam on the top border.' },
    { name: 'headingLevel', type: '2 | 3 | 4', default: '3', description: 'Heading level of the title.' },
  ],

  reducedMotion:
    'A `prefers-reduced-motion: reduce` rule in the hoisted stylesheet removes the beam animation and parks the track at `translateX(150%)`, its centred position. The beam stays as a still highlight on the border.',

  cleanup:
    'Nothing to clean up. The beam is a CSS animation, and there are no effects, timers or listeners. The hoisted `<style>` is deduplicated by its `href`, so many cards share one stylesheet.',

  acceptance:
    'At full width the avatars, the copy and the action sit in one row, and a short blue beam drifts along the top border and back. In a 360px container the action drops under the copy. Five people with `maxAvatars` 3 show three initials and "+2". Clicking the action calls `onAction`. With `href` it is a link opening in a new tab. With reduced motion the beam sits still in the middle of the border.',

  criticalRegion: 'critical',
};

export default meta;
