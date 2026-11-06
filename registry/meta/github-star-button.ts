/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "GitHub Star Button" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'github-star-button',
  title: 'GitHub Star Button',
  category: 'action',
  kit: 'boardui',
  tags: ['github', 'star', 'toggle', 'counter', 'number-roll', 'boardui'],
  blurb:
    'A star toggle with a glyph, a Star label and a count pill. Starring pops the star and rolls the en-US formatted count by one.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/github-star-button.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [
    'react-aria-components@^1.22.1',
    'motion@^12.43.0',
    '@remixicon/react@^4.9.0',
  ],

  summary:
    'A compact pill button in the style of a repository star control, without any logo: a star glyph, a "Star" label and a count in an inset pill. Pressing it toggles starred: the outline star swaps to a filled amber one with a small springy pop, the label reads "Starred" and the count rolls up by one; pressing again rolls it back down.',

  mechanism: [
    'React Aria `ToggleButton` owns the state semantics: it renders a native button with `aria-pressed`, handles pointer, keyboard and touch presses, and exposes `data-selected`, `data-hovered`, `data-pressed` and `data-focus-visible` for styling.',
    'The shown total is `count + starred - defaultStarred`, so `count` is the number as loaded (including the viewer when they had already starred) and toggling moves it by exactly one in either direction.',
    'The count is keyed by its value inside `AnimatePresence mode="popLayout"`. Each toggle stores a direction (+1 up, -1 down) and passes it as `custom`, so the old number exits upward while the new one enters from below on a star, and the reverse on an unstar. `popLayout` takes the exiting number out of flow so the two never stack.',
    'The star glyph is a `motion.span` keyed by the starred state: starring remounts it from `scale 0.4, rotate -40deg` with a bouncy spring, unstarring from `scale 0.8` with no bounce.',
    'All numbers use one `Intl.NumberFormat("en-US")`, so 999 to 1,000 gets its comma and the server and client strings always agree.',
    'The accessible name is fixed text plus the current total ("Star kinetic, 12,481 stars"); the visible label and pill are `aria-hidden`, so the Star / Starred swap does not rename the control and `aria-pressed` carries the state.',
  ],

  constants: [
    { name: 'count roll', value: 'spring, 0.35s, bounce 0.2', why: 'Quick enough to feel like a counter tick, with a hint of overshoot so the new digit lands.' },
    { name: 'star pop', value: 'spring, 0.45s, bounce 0.55 from scale 0.4 / -40deg', why: 'Starring is the rewarding action and gets the expressive motion; unstarring settles without bounce.' },
    { name: 'press scale', value: '0.97', why: 'Tactile press feedback on `data-pressed` without shifting surrounding layout.' },
  ],

  pitfalls: [
    'Formatting with `toLocaleString()` and no locale. A German visitor sees "12.480" on the client after "12,480" from the server, which is a hydration mismatch; the locale is fixed to en-US.',
    'Computing the roll direction from the new value in the exit animation. The exiting element keeps its own props, so without `AnimatePresence custom` it exits using the previous toggle\'s direction.',
    'Changing the accessible name between "Star" and "Starred". A toggle button should keep its name and report state through `aria-pressed`.',
  ],

  notes: [
    'Call your API in `onStarredChange`; the button updates optimistically and does not roll back on its own.',
    'For a real repo, link the surrounding card to GitHub and keep this control for in-app starring only.',
  ],

  apiSignature:
    'function GithubStarButton(props: { count: number; defaultStarred?: boolean; onStarredChange?: (starred: boolean) => void; label?: string; starredLabel?: string; "aria-label"?: string; className?: string }): JSX.Element',

  props: [
    { name: 'count', type: 'number', description: 'Star total as loaded, including the viewer when `defaultStarred` is true.' },
    { name: 'defaultStarred', type: 'boolean', default: 'false', description: 'Initial starred state.' },
    { name: 'onStarredChange', type: '(starred: boolean) => void', description: 'Fires on every toggle.' },
    { name: 'label', type: 'string', default: '"Star"', description: 'Visible label when not starred.' },
    { name: 'starredLabel', type: 'string', default: '"Starred"', description: 'Visible label when starred.' },
    { name: 'aria-label', type: 'string', description: 'Accessible name; defaults to `label`. ", N stars" is appended.' },
    { name: 'className', type: 'string', description: 'Merged onto the button.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion: reduce` (via `useReducedMotion`) the star and count render as plain elements without motion wrappers, so the glyph and number swap instantly; the press scale and colour transitions are removed with `motion-reduce:transition-none`.',

  cleanup:
    'No timers or listeners. Motion stops any running spring when its element unmounts, and AnimatePresence removes the exiting number when its exit finishes.',

  acceptance:
    'The first button reads "Star" with an outline star and 12,480. Clicking it sets aria-pressed="true", fills the star amber with a pop, changes the label to "Starred" and rolls the pill to 12,481 from below. Clicking again rolls back to 12,480 from above. The second button starts starred at 1,000 and unstarring rolls it to 999. Space and Enter toggle it from the keyboard with a visible focus ring. With reduced motion every change is instant.',

  criticalRegion: 'critical',
};

export default meta;
