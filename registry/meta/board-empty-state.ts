import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'board-empty-state',
  title: 'Board Empty State',
  category: 'display',
  kit: 'boardui',
  tags: ['empty-state', 'kanban', 'project-board', 'illustration', 'boardui'],
  blurb: 'Empty board or column: three ticket panels stacked on a soft surface that fan out on hover, with copy and a create button.',
  cost: 'css',
  motif: 'stack',

  files: [{ path: 'registry/ui/board-empty-state.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'What an empty project board column shows instead of a blank grey strip: a small illustration of three ticket cards stacked on a translucent panel, a short title such as "Nothing in progress", one line of help and an "Add ticket" button. The art is built from plain elements filled with the kit\'s `project-board-empty-*` tokens, so it flips to the neutral-700 family in dark mode with no images. On hover, keyboard focus or an `active` flag the back and middle cards fan out to either side and the front card lifts. A larger `board` size covers a board with no tickets at all.',

  mechanism: [
    'The illustration is a `relative` box with the `--color-project-board-empty-panel` fill and the 20px column radius. Three absolutely positioned spans sit inside it: the back card (narrowest, highest, `-empty-back`), the middle card (`-empty-middle`) and the front card (widest, lowest, `-empty-front`). Each is inset more from the sides the further back it is, so the stack reads as depth without any shadows on the back layers.',
    'The front card is a flex column holding the detail bars, all `rounded-full` and filled with `--color-project-board-empty-detail` (white in light, neutral-500 in dark): a tag pill and an assignee dot on the first row, then two title lines pushed to the bottom with `mt-auto`, the second shorter and at 70% opacity.',
    'The root carries `group/board-empty`. Every layer transitions `translate`, `rotate` and `opacity` over 300ms ease-out with `origin-bottom`, and the fan is three variant stacks on the same values: `group-hover`, `group-has-focus-visible` (Tab onto the button) and `group-data-active` (the `active` prop). The back card turns -6° and slides left, the middle card turns 4° and slides right, and the front card rises 4px.',
    'Mounting plays an entrance through `@starting-style` (`starting:translate-y-3 starting:opacity-0`). The middle and front layers carry 50ms and 100ms delays, so the cards settle back to front whenever a column empties.',
    'Copy and action are ordinary content under the art: a heading (level set by `headingLevel`), a `text-pretty` description, and either `action` or a primary Button with a plus icon built from `onCreate` / `createLabel`. The button is described by the description text. The root is `role="group"` labelled by the heading so the action is announced in context.',
  ],

  constants: [
    { name: 'art size', value: '160×112 column, 224×144 board', why: 'The column size leaves 50px of air on either side inside a 260px column; the board size reads at a glance in a wide empty area without competing with the heading.' },
    { name: 'layer insets', value: 'back 32px, middle 20px, front 12px from the sides (column)', why: 'Each layer is about 12px wider than the one behind it, which is enough to see three distinct cards at a small size.' },
    { name: 'fan', value: 'back -6° / -16px, middle +4° / +16px, front -4px', why: 'Opposite turns spread the stack like a hand of cards; small angles keep the back cards inside the panel corners.' },
    { name: 'entrance', value: '300ms ease-out from 12px below, 0 / 50 / 100ms delays', why: 'Short enough to finish before a reader reaches the button; the stagger shows that the art is a stack, not one shape.' },
  ],

  pitfalls: [
    'Writing `bg-project-board-empty-front`: the empty tokens are plain theme variables with no utility behind them. Use the variable shorthand `bg-(--color-project-board-empty-front)`.',
    'Putting the fan behind a bare `hover:` on the art. The art is `aria-hidden` and small, so the fan never runs for keyboard users; hang it on the root group and include `group-has-focus-visible`.',
    'Applying `motion-reduce:rotate-none` next to `group-hover:-rotate-6`: both are variants and the later one in the stylesheet wins. Gate the fan and the entrance with `motion-safe:` instead.',
  ],

  notes: [
    'Drop it into Kanban Column\'s `empty` prop; while a card is dragged over an empty column the column shows its drop slot in place of the empty state.',
    'The demo starts with one ticket in In progress, so To do (first on a phone) and Review show the column size. "Clear board" empties everything and swaps the board for the large size, whose "New ticket" button brings the board back.',
  ],

  apiSignature:
    'function BoardEmptyState(props: Omit<HTMLAttributes<HTMLDivElement>, "title"> & { size?: "column" | "board"; title?: ReactNode; description?: ReactNode; onCreate?: () => void; createLabel?: string; action?: ReactNode; active?: boolean; headingLevel?: 2 | 3 | 4; ref?: Ref<HTMLDivElement> }): JSX.Element; function BoardEmptyIllustration(props: { size?: "column" | "board"; className?: string }): JSX.Element',

  props: [
    { name: 'size', type: '"column" | "board"', default: '"column"', description: 'Art size, spacing, heading style and button size.' },
    { name: 'title', type: 'ReactNode', default: '"No tickets yet"', description: 'Heading under the art; also labels the group.' },
    { name: 'description', type: 'ReactNode', description: 'One muted line of help; describes the create button.' },
    { name: 'onCreate', type: '() => void', description: 'Renders the primary create button.' },
    { name: 'createLabel', type: 'string', default: '"New ticket"', description: 'Label of the create button.' },
    { name: 'action', type: 'ReactNode', description: 'Custom actions in place of the default button.' },
    { name: 'active', type: 'boolean', default: 'false', description: 'Holds the cards fanned out, for example while something is dragged over.' },
    { name: 'headingLevel', type: '2 | 3 | 4', default: '3', description: 'Heading element for the title.' },
  ],

  reducedMotion: 'The entrance and the fan are both written behind `motion-safe:`, so with reduced motion the stack renders still and in place. Hover, focus and `active` change nothing in the art, and the heading and button work the same.',

  cleanup: 'Nothing to clean up: no effects, timers or listeners. The entrance is CSS `@starting-style`, which runs once per mount.',

  acceptance:
    'With one ticket in In progress, the To do and Review columns each show the three-card stack, a title ("Nothing queued", "Nothing to review"), one line of help and an "Add ticket" button. Hovering a column\'s empty state fans the back and middle cards apart and lifts the front card. Clicking "Add ticket" in Review puts "New ticket 1" there and the empty state goes. "Clear board" swaps the board for the large empty state; its "New ticket" button brings back the board with one ticket in To do. In dark mode the cards are neutral-700 shades on a neutral-800 panel with neutral-500 detail bars.',

  criticalRegion: 'critical',
};

export default meta;
