/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Profile Cover Header" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'profile-cover-header',
  title: 'Profile Cover Header',
  category: 'display',
  kit: 'boardui',
  tags: ['profile', 'header', 'cover', 'avatar', 'tabs', 'boardui'],
  blurb:
    'Profile identity card: gradient cover, overlapping initials avatar, name, handle and badges, Follow or Edit actions and underline tabs.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/profile-cover-header.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The card at the top of a profile page. A wide cover band of soft gradient artwork runs across the top, an 80px initials avatar sits half over its bottom edge, and below it come the name, the handle with small badges, inline follower counts and an underline tab strip. Visitors get Share and a Follow toggle; the owner gets Share and Edit.',

  mechanism: [
    'The root is a `section` labelled by the name heading, with a 16px radius, a 1px `border-ai-profile-card` border and `overflow-hidden`, so the cover is clipped to the top corners without its own radius.',
    'The cover band is 112px tall on phones and 160px from `sm` up. By default it holds `ProfileCoverArt`: an inline SVG (viewBox 680x170, `xMidYMid slice`) with a sky gradient, a radial sun halo, three blurred haze ellipses, a 24px sun and two rows of rounded forms. Its gradient ids come from `useId`, so several headers can share a page. Pass `cover` to put any node there instead.',
    'Under the cover, one flex row puts the avatar on the left and the actions on the right. The kit Avatar is enlarged to 80px with 28px initials and pulled up with `-mt-10`, so half of it overlaps the cover; a 4px ring in the card background cuts it out of the artwork. The actions sit 12px below the cover edge.',
    'Follow is a toggle button with `aria-pressed`. It works controlled (`isFollowing` + `onFollowingChange`) or uncontrolled (`defaultFollowing`): the click computes the next value, stores it only when uncontrolled, and always reports it. The button swaps from a primary "Follow" with a user-add icon to a secondary "Following" with a user-check icon, at a 104px minimum width from `sm` up so the row does not jump. Below `sm` the Share button keeps its icon and hides its label (its `aria-label` stays "Share"), so avatar and both actions fit one row at 360px.',
    'With `isOwner` the Follow toggle is replaced by an Edit button; Share appears whenever `onShare` is passed. Name (20px medium), handle (16px secondary), tone-coloured badges (11px semibold) and an optional bio and `dl` of stats stack below with 4px gaps.',
    'Tabs use the kit Tabs (react-aria): arrow keys move between tabs and each has a `TabPanel` filled by `renderPanel(id)`. The strip sits in an `overflow-x-auto` wrapper with `min-w-max`, so four tabs with counts scroll sideways on a phone instead of wrapping.',
  ],

  constants: [
    {
      name: 'cover height',
      value: '112px (h-28) below sm, 160px (h-40) from sm',
      why: 'Wide enough to read as a banner on a laptop; on a phone it shrinks so the name and actions stay above the fold.',
    },
    {
      name: 'avatar',
      value: '80px, -40px top margin, 4px ring, 28px initials',
      why: 'Exactly half the avatar overlaps the cover, the classic profile silhouette; the ring keeps the circle readable over any artwork.',
    },
    {
      name: 'follow button',
      value: 'min-width 104px from sm; Share label hidden below sm',
      why: '"Following" is wider than "Follow"; the minimum stops the Share button shifting when the state flips. On phones the icon-only Share leaves room for the wider label without wrapping.',
    },
    {
      name: 'card padding',
      value: '16px sides, 16px panel padding',
      why: 'Lines the avatar, name and tab labels up on one left edge.',
    },
  ],

  pitfalls: [
    'Giving the cover its own top radius instead of clipping it with the card. At fractional zoom the two curves drift apart and a hairline of background shows. Clip with `overflow-hidden` on the card.',
    'Hard-coding SVG gradient ids. Two headers on one page then share the first gradient and the second cover renders the wrong tone. The art builds its ids from `useId`.',
    'Toggling the visible label without exposing the state. Screen readers hear a new label but no relationship to the old one; `aria-pressed` tells them it is the same toggle, now on.',
    'Letting the tab strip wrap on narrow screens. The underline is measured from the selected tab and lands under the wrong row; scroll the strip instead.',
  ],

  notes: [
    'Swap the artwork tone with `coverTone` ("sky", "dusk", "aurora") or pass a photo or your own SVG as `cover`.',
    'Follower counts are plain `stats`; update them in `onFollowingChange` as the demo does.',
  ],

  apiSignature:
    'function ProfileCoverHeader(props: ProfileCoverHeaderProps): JSX.Element\ninterface ProfileCoverHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "children"> { name: string; handle: string; initials?: string; badges?: ProfileBadge[]; bio?: ReactNode; stats?: ProfileStat[]; cover?: ReactNode; coverTone?: ProfileCoverTone; isOwner?: boolean; isFollowing?: boolean; defaultFollowing?: boolean; onFollowingChange?: (isFollowing: boolean) => void; onShare?: () => void; onEdit?: () => void; tabs?: ProfileTab[]; selectedTab?: string; defaultSelectedTab?: string; onTabChange?: (id: string) => void; renderPanel?: (id: string) => ReactNode; ref?: Ref<HTMLElement> }',

  props: [
    { name: 'name', type: 'string', description: 'Display name, rendered as the h2 that labels the section.' },
    { name: 'handle', type: 'string', description: 'Handle shown under the name, e.g. "@miraok".' },
    { name: 'initials', type: 'string', default: 'first letter of name', description: 'Avatar initials.' },
    { name: 'badges', type: '{ label: ReactNode; tone?: "neutral" | "purple" | "blue" | "lime" }[]', default: '[]', description: 'Small pills after the handle, such as PRO.' },
    { name: 'bio', type: 'ReactNode', description: 'Optional one or two lines under the handle.' },
    { name: 'stats', type: '{ label: string; value: ReactNode }[]', default: '[]', description: 'Inline counts, such as followers and following.' },
    { name: 'cover', type: 'ReactNode', description: 'Replaces the built-in cover artwork.' },
    { name: 'coverTone', type: '"sky" | "dusk" | "aurora"', default: '"sky"', description: 'Palette of the built-in artwork.' },
    { name: 'isOwner', type: 'boolean', default: 'false', description: 'Shows Edit instead of the Follow toggle.' },
    { name: 'isFollowing', type: 'boolean', description: 'Controlled follow state.' },
    { name: 'defaultFollowing', type: 'boolean', default: 'false', description: 'Initial follow state when uncontrolled.' },
    { name: 'onFollowingChange', type: '(isFollowing: boolean) => void', description: 'Called with the next state on every toggle.' },
    { name: 'onShare', type: '() => void', description: 'Shows the Share button and handles its click.' },
    { name: 'onEdit', type: '() => void', description: 'Click handler of Edit in the owner view.' },
    { name: 'tabs', type: '{ id: string; label: ReactNode; count?: ReactNode; icon?: IconComponent }[]', default: '[]', description: 'Underline tabs under the identity block.' },
    { name: 'selectedTab', type: 'string', description: 'Controlled selected tab id.' },
    { name: 'defaultSelectedTab', type: 'string', default: 'first tab', description: 'Initial tab when uncontrolled.' },
    { name: 'onTabChange', type: '(id: string) => void', description: 'Called when the selected tab changes.' },
    { name: 'renderPanel', type: '(id: string) => ReactNode', description: 'Content of each tab panel.' },
  ],

  reducedMotion:
    'Nothing animates on its own. The only motion is the kit tab underline sliding and the buttons changing colour, both short CSS transitions; the artwork is static. In dark mode the cover is dimmed to 85% brightness so it does not glare.',

  cleanup:
    'The component owns no timers, listeners or observers. The tab strip uses the kit TabList, which disconnects its own resize and mutation observers on unmount.',

  acceptance:
    'A card shows a blue sky cover, an 80px "M" avatar overlapping its bottom edge, "Mira Okafor", "@miraok" with a PRO pill, "1,284 followers" and four tabs. Clicking Follow turns it into a pressed secondary "Following" button and the count reads 1,285; clicking again reverts. Switching the view to Owner swaps Follow for Edit. Arrow keys move between tabs and the panel below changes; at 360px wide the tab strip scrolls instead of wrapping.',

  criticalRegion: 'critical',
};

export default meta;
