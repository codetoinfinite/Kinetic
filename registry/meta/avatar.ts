import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'avatar',
  title: 'Avatar',
  category: 'display',
  kit: 'boardui',
  tags: ['avatar', 'initials', 'profile', 'user', 'boardui'],
  blurb: 'Round photo or initials avatar in four sizes (20 to 36px) and four tints, with a lazy-loaded image that fills the disc.',
  cost: 'css',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/avatar.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A circular `<span>` that shows a photo when `src` is set and centred initials on a tinted disc otherwise. Four sizes match the places the dashboard uses avatars (breadcrumb marks, table rows, sidebar cards, people cards), and each size carries its own initials type style so the letters always fit the disc.',

  mechanism: [
    'Keep every class in a `sortCx` map. `base` is `inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-center align-middle`: a flex-centred disc that clips its photo and never shrinks inside a row.',
    'Map `size` to a box and an initials style together: xs `size-5 text-[10px] leading-[15px] font-semibold`, sm `size-6 text-caption-1-semibold tracking-normal`, md `size-8 text-headline-semibold`, lg `size-9 text-[18px] leading-6 font-semibold`.',
    'Map `color` to a fill and text pair: `neutral` uses the semantic `bg-avatar-neutral-background` with `text-text-secondary`; `blue`, `lime` and `pink` use fixed palette pairs (`bg-blue-300 text-blue-900`, `bg-lime-200 text-lime-700`, `bg-pink-200 text-pink-500`).',
    'If `src` is set, render `<img className="size-full object-cover" loading="lazy" decoding="async">` with `alt ?? ""`; otherwise render `initials` as the span\'s text. A photo wins over initials.',
    'Add `transition-[width,height,font-size] duration-200` to the base, so a list that switches density resizes its avatars smoothly instead of snapping.',
  ],

  constants: [
    {
      name: 'sizes',
      value: 'xs 20px, sm 24px, md 32px, lg 36px',
      why: 'One per Figma context: breadcrumb workspace marks, table rows, sidebar workspace / team cards and people cards. Lg matches the kit\'s 36px controls so an avatar sits level with a button.',
    },
    {
      name: 'initials type',
      value: '10/15, 12/16, 16/22, 18/24 px, all weight 600',
      why: 'Roughly half the disc diameter. A single size-agnostic style either overflows the 20px disc or looks lost in the 36px one.',
    },
    {
      name: 'neutral fill',
      value: 'light neutral-300, dark background-primary-default',
      why: 'The neutral tint is the only theme-aware one, because it is the default and appears on every surface; the coloured tints are fixed Figma pairs.',
    },
  ],

  pitfalls: [
    'Do not drop `overflow-hidden` on the disc. Without it a non-square photo pokes out of the circle.',
    'Do not remove `shrink-0`. In a table cell or a flex row with long text, the avatar squeezes into an oval.',
    'Do not leave `alt` unset on a photo of a named person when no name sits next to it. The component falls back to `alt=""`, which marks the image decorative.',
    'Do not pass three or more letters as `initials`. The xs and sm discs only fit one or two characters.',
  ],

  notes: [
    'Overlapping groups are composed outside the component: wrap each avatar in a `rounded-full ring-2 ring-background-primary-default` element and pull it left with a negative margin, so the ring cuts a gap against the previous avatar.',
    'The default is `size="md"` and `color="neutral"`.',
  ],

  apiSignature:
    'interface AvatarProps extends HTMLAttributes<HTMLSpanElement> { size?: "xs" | "sm" | "md" | "lg"; color?: "neutral" | "blue" | "lime" | "pink"; src?: string; alt?: string; initials?: string; ref?: Ref<HTMLSpanElement> }\nfunction Avatar(props: AvatarProps): JSX.Element',

  props: [
    { name: 'size', type: '"xs" | "sm" | "md" | "lg"', default: '"md"', description: '20, 24, 32 or 36px disc, each with its own initials type style.' },
    { name: 'color', type: '"neutral" | "blue" | "lime" | "pink"', default: '"neutral"', description: 'Fill and initials colour when no photo is shown.' },
    { name: 'src', type: 'string', description: 'Photo URL. Rendered as a lazy, async-decoded `<img>` that covers the disc. Wins over `initials`.' },
    { name: 'alt', type: 'string', default: '""', description: 'Alt text for the photo.' },
    { name: 'initials', type: 'string', description: 'Fallback text shown when `src` is not set, e.g. "M".' },
    { name: 'className', type: 'string', description: 'Merged last through `tailwind-merge`.' },
  ],

  reducedMotion:
    'The component itself only has a 200ms size transition when its `size` prop changes. It is not gated on `prefers-reduced-motion`; any hover fan-out of a group belongs to the caller.',

  cleanup: 'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    'Without `src`, `<Avatar size="lg" color="blue" initials="M" />` renders a 36px blue-300 disc with an 18px semibold blue-900 "M" centred in it. The four sizes measure 20, 24, 32 and 36px and stay circular inside a flex row. With `src`, the photo fills and is clipped to the circle, and initials are not shown.',

  criticalRegion: 'critical',
};

export default meta;
