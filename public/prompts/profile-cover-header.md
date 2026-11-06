# Build: Profile Cover Header

The card at the top of a profile page. A wide cover band of soft gradient artwork runs across the top, an 80px initials avatar sits half over its bottom edge, and below it come the name, the handle with small badges, inline follower counts and an underline tab strip. Visitors get Share and a Follow toggle; the owner gets Share and Edit.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Profile identity card: gradient cover, overlapping initials avatar, name, handle and badges, Follow or Edit actions and underline tabs.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The root is a `section` labelled by the name heading, with a 16px radius, a 1px `border-ai-profile-card` border and `overflow-hidden`, so the cover is clipped to the top corners without its own radius.
2. The cover band is 112px tall on phones and 160px from `sm` up. By default it holds `ProfileCoverArt`: an inline SVG (viewBox 680x170, `xMidYMid slice`) with a sky gradient, a radial sun halo, three blurred haze ellipses, a 24px sun and two rows of rounded forms. Its gradient ids come from `useId`, so several headers can share a page. Pass `cover` to put any node there instead.
3. Under the cover, one flex row puts the avatar on the left and the actions on the right. The kit Avatar is enlarged to 80px with 28px initials and pulled up with `-mt-10`, so half of it overlaps the cover; a 4px ring in the card background cuts it out of the artwork. The actions sit 12px below the cover edge.
4. Follow is a toggle button with `aria-pressed`. It works controlled (`isFollowing` + `onFollowingChange`) or uncontrolled (`defaultFollowing`): the click computes the next value, stores it only when uncontrolled, and always reports it. The button swaps from a primary "Follow" with a user-add icon to a secondary "Following" with a user-check icon, at a 104px minimum width from `sm` up so the row does not jump. Below `sm` the Share button keeps its icon and hides its label (its `aria-label` stays "Share"), so avatar and both actions fit one row at 360px.
5. With `isOwner` the Follow toggle is replaced by an Edit button; Share appears whenever `onShare` is passed. Name (20px medium), handle (16px secondary), tone-coloured badges (11px semibold) and an optional bio and `dl` of stats stack below with 4px gaps.
6. Tabs use the kit Tabs (react-aria): arrow keys move between tabs and each has a `TabPanel` filled by `renderPanel(id)`. The strip sits in an `overflow-x-auto` wrapper with `min-w-max`, so four tabs with counts scroll sideways on a phone instead of wrapping.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `cover height = 112px (h-28) below sm, 160px (h-40) from sm`
  Wide enough to read as a banner on a laptop; on a phone it shrinks so the name and actions stay above the fold.
- `avatar = 80px, -40px top margin, 4px ring, 28px initials`
  Exactly half the avatar overlaps the cover, the classic profile silhouette; the ring keeps the circle readable over any artwork.
- `follow button = min-width 104px from sm; Share label hidden below sm`
  "Following" is wider than "Follow"; the minimum stops the Share button shifting when the state flips. On phones the icon-only Share leaves room for the wider label without wrapping.
- `card padding = 16px sides, 16px panel padding`
  Lines the avatar, name and tab labels up on one left edge.

## API

```ts
function ProfileCoverHeader(props: ProfileCoverHeaderProps): JSX.Element
interface ProfileCoverHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "children"> { name: string; handle: string; initials?: string; badges?: ProfileBadge[]; bio?: ReactNode; stats?: ProfileStat[]; cover?: ReactNode; coverTone?: ProfileCoverTone; isOwner?: boolean; isFollowing?: boolean; defaultFollowing?: boolean; onFollowingChange?: (isFollowing: boolean) => void; onShare?: () => void; onEdit?: () => void; tabs?: ProfileTab[]; selectedTab?: string; defaultSelectedTab?: string; onTabChange?: (id: string) => void; renderPanel?: (id: string) => ReactNode; ref?: Ref<HTMLElement> }
```

- `name: string`
  Display name, rendered as the h2 that labels the section.
- `handle: string`
  Handle shown under the name, e.g. "@miraok".
- `initials: string` — default `first letter of name`
  Avatar initials.
- `badges: { label: ReactNode; tone?: "neutral" | "purple" | "blue" | "lime" }[]` — default `[]`
  Small pills after the handle, such as PRO.
- `bio: ReactNode`
  Optional one or two lines under the handle.
- `stats: { label: string; value: ReactNode }[]` — default `[]`
  Inline counts, such as followers and following.
- `cover: ReactNode`
  Replaces the built-in cover artwork.
- `coverTone: "sky" | "dusk" | "aurora"` — default `"sky"`
  Palette of the built-in artwork.
- `isOwner: boolean` — default `false`
  Shows Edit instead of the Follow toggle.
- `isFollowing: boolean`
  Controlled follow state.
- `defaultFollowing: boolean` — default `false`
  Initial follow state when uncontrolled.
- `onFollowingChange: (isFollowing: boolean) => void`
  Called with the next state on every toggle.
- `onShare: () => void`
  Shows the Share button and handles its click.
- `onEdit: () => void`
  Click handler of Edit in the owner view.
- `tabs: { id: string; label: ReactNode; count?: ReactNode; icon?: IconComponent }[]` — default `[]`
  Underline tabs under the identity block.
- `selectedTab: string`
  Controlled selected tab id.
- `defaultSelectedTab: string` — default `first tab`
  Initial tab when uncontrolled.
- `onTabChange: (id: string) => void`
  Called when the selected tab changes.
- `renderPanel: (id: string) => ReactNode`
  Content of each tab panel.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Follow works controlled (`isFollowing`) or uncontrolled (`defaultFollowing`).
const [innerFollowing, setInnerFollowing] = useState(defaultFollowing);
const following = isFollowing ?? innerFollowing;
const toggleFollow = () => {
  const next = !following;
  if (isFollowing === undefined) setInnerFollowing(next);
  onFollowingChange?.(next);
};
const avatarText = (initials ?? name.trim().charAt(0)).toUpperCase();

const actions = (
  <div className="flex shrink-0 items-center justify-end gap-2">
    {onShare && (
      <Button
        variant="secondary"
        size="small"
        leadingIcon={RiUpload2Line}
        aria-label="Share"
        onClick={onShare}
      >
        <span className="max-sm:hidden">Share</span>
      </Button>
    )}
    {isOwner ? (
      <Button variant="secondary" size="small" leadingIcon={RiEditBoxLine} onClick={onEdit}>
        Edit
      </Button>
    ) : (
      <Button
        variant={following ? "secondary" : "primary"}
        size="small"
        aria-pressed={following}
        leadingIcon={following ? RiUserFollowLine : RiUserAddLine}
        onClick={toggleFollow}
        className="sm:min-w-[104px]"
      >
        {following ? "Following" : "Follow"}
      </Button>
    )}
  </div>
);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The component owns no timers, listeners or observers. The tab strip uses the kit TabList, which disconnects its own resize and mutation observers on unmount.

**Reduced motion.** Nothing animates on its own. The only motion is the kit tab underline sliding and the buttons changing colour, both short CSS transitions; the artwork is static. In dark mode the cover is dimmed to 85% brightness so it does not glare.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Giving the cover its own top radius instead of clipping it with the card. At fractional zoom the two curves drift apart and a hairline of background shows. Clip with `overflow-hidden` on the card.
- Hard-coding SVG gradient ids. Two headers on one page then share the first gradient and the second cover renders the wrong tone. The art builds its ids from `useId`.
- Toggling the visible label without exposing the state. Screen readers hear a new label but no relationship to the old one; `aria-pressed` tells them it is the same toggle, now on.
- Letting the tab strip wrap on narrow screens. The underline is measured from the selected tab and lands under the wrong row; scroll the strip instead.

## Notes

- Swap the artwork tone with `coverTone` ("sky", "dusk", "aurora") or pass a photo or your own SVG as `cover`.
- Follower counts are plain `stats`; update them in `onFollowingChange` as the demo does.

## Definition of done

A card shows a blue sky cover, an 80px "M" avatar overlapping its bottom edge, "Mira Okafor", "@miraok" with a PRO pill, "1,284 followers" and four tabs. Clicking Follow turns it into a pressed secondary "Following" button and the count reads 1,285; clicking again reverts. Switching the view to Owner swaps Follow for Edit. Arrow keys move between tabs and the panel below changes; at 360px wide the tab strip scrolls instead of wrapping.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
