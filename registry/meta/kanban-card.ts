import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'kanban-card',
  title: 'Kanban Card',
  category: 'display',
  kit: 'boardui',
  tags: ['kanban', 'card', 'ticket', 'project-board', 'boardui'],
  blurb: 'Project board ticket: key and area, assignee stack, priority and project tags, title, description, counts and due date.',
  cost: 'css',
  motif: 'stack',

  files: [{ path: 'registry/ui/kanban-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The ticket card from the project board: a "DS-38 › Agent handoff" breadcrumb with overlapping assignee avatars on the right, a row with the priority pill and folder-tagged project chips, the title in medium weight, an optional two-line description and a footer with the "Since 14 Sep" line, comment and attachment counts and a tinted due chip. The whole card opens through its title button, whose hit area is stretched over the card, and it carries `source` and `overlay` looks so a board can drag it.',

  mechanism: [
    'The card is an `<article>` labelled by its heading (`aria-labelledby` → the `useId` title id). Layout is one flex column with `p-3` and fixed gaps: breadcrumb row (`min-h-5`), `mt-2` tag row, `mt-2` title, `mt-1` description clamped with `line-clamp-2`, `mt-1.5` footer.',
    'When `onPress` is set, the title renders as a `<button data-kanban-press data-kanban-focus>` whose `::after` is `absolute inset-0 rounded-xl`, so a click anywhere on the card lands on the button. The avatar stack and the `actions` slot are `relative z-10`, which lifts them over that overlay and keeps them separately hoverable and focusable without nesting interactive elements. Focus shows as a 2px focus-ring on the overlay, so the whole card outlines.',
    'The breadcrumb right side is an `AvatarStack` at size `xs` with `max` 2 by default (the stack only collapses when two or more would hide, so three people show as three discs). The tag row is a `PriorityBadge` with `showIcon={false}` (the text-only pill the board uses) followed by bordered chips with a 14px `RiFolderLine`.',
    'Footer stats are text plus a 14px icon; each number carries an `sr-only` noun ("4 comments", "Overdue, was due 12 Sep") so the icons can stay `aria-hidden`. `dueState` picks no tint, `bg-status-orange-background` (soon) or `bg-status-rose-background` (overdue).',
    '`dragState` swaps the visual role during a board drag: `source` drops to 40% opacity in place, `overlay` tilts 2° and scales to 1.02 with `shadow-xl`, removes the press button, actions and tooltips, and sets `aria-hidden` so the ghost copy never doubles up in the accessibility tree.',
  ],

  constants: [
    { name: 'card padding / radius', value: 'p-3 (12px), rounded-xl (12px)', why: 'Measured off the board: text starts 12px in from a 12px-radius white card that sits 6px inside the 20px-radius column.' },
    { name: 'row gaps', value: 'mt-2 tags, mt-2 title, mt-1 description, mt-1.5 footer', why: 'Reproduces the 146px card height of the reference with a two-line title.' },
    { name: 'maxAssignees', value: '2', why: 'Cards are ~260px wide; two 20px discs plus "+N" leave room for a long area name before it truncates.' },
    { name: 'overlay transform', value: 'rotate-2 scale-[1.02] shadow-xl', why: 'Enough lift to read as "picked up" without the ghost covering the drop slot beneath it.' },
    { name: 'source opacity', value: '0.4', why: 'The origin stays visible as a placeholder so the user can see where a cancelled drag will return.' },
  ],

  pitfalls: [
    'Wrapping the whole card in a `<button>`: the avatar tooltips and any menu in `actions` become nested interactive content. Use the stretched title button and keep extra controls `relative z-10`.',
    'Forgetting `aria-hidden` on the drag ghost. Two cards with the same name in the tree confuse screen readers and the flow tests that query by role.',
    'Colouring the due date only. The `sr-only` "Overdue, was due" prefix carries the meaning for people who cannot see the tint.',
  ],

  notes: [
    'The card owns no state; selection, drag state and actions come from the board around it. Kanban Column passes `dragState` through its item render prop.',
    'Photos work through `AvatarStackPerson.src`; the demo uses initials so it stays offline.',
  ],

  apiSignature:
    'function KanbanCard(props: Omit<HTMLAttributes<HTMLElement>, "title" | "children"> & { code: string; area?: string; title: string; description?: string; priority?: Priority; tags?: readonly string[]; assignees?: readonly AvatarStackPerson[]; maxAssignees?: number; comments?: number; attachments?: number; due?: string; dueState?: "upcoming" | "soon" | "overdue"; meta?: ReactNode; onPress?: () => void; isSelected?: boolean; dragState?: "idle" | "source" | "overlay"; actions?: ReactNode; headingLevel?: 2 | 3 | 4 | 5; ref?: Ref<HTMLElement> }): JSX.Element',

  props: [
    { name: 'code', type: 'string', description: 'Ticket key shown first in the breadcrumb, e.g. "DS-38".' },
    { name: 'area', type: 'string', description: 'Epic or area after the chevron; truncates.' },
    { name: 'title', type: 'string', description: 'Ticket title; also the accessible name of the card and its press button.' },
    { name: 'description', type: 'string', description: 'Muted text under the title, clamped to two lines.' },
    { name: 'priority', type: '"urgent" | "high" | "medium" | "low"', description: 'Shows a text-only PriorityBadge.' },
    { name: 'tags', type: 'readonly string[]', default: '[]', description: 'Project chips with a folder glyph.' },
    { name: 'assignees', type: 'readonly AvatarStackPerson[]', default: '[]', description: 'Avatar stack on the breadcrumb row, with name tooltips.' },
    { name: 'maxAssignees', type: 'number', default: '2', description: 'Discs before the rest collapse into "+N".' },
    { name: 'comments / attachments', type: 'number', description: 'Footer counts with chat and paperclip glyphs.' },
    { name: 'due', type: 'string', description: 'Pre-formatted due label for the calendar chip.' },
    { name: 'dueState', type: '"upcoming" | "soon" | "overdue"', default: '"upcoming"', description: 'Tints the due chip (none, orange, rose) and words its sr-only prefix.' },
    { name: 'meta', type: 'ReactNode', description: 'Age line at the start of the footer, e.g. "Since 14 Sep".' },
    { name: 'onPress', type: '() => void', description: 'Makes the card pressable through a stretched title button.' },
    { name: 'isSelected', type: 'boolean', default: 'false', description: 'Focus-ring outline and `aria-current` for the open ticket.' },
    { name: 'dragState', type: '"idle" | "source" | "overlay"', default: '"idle"', description: 'Dimmed origin or lifted, aria-hidden ghost during a drag.' },
    { name: 'actions', type: 'ReactNode', description: 'Trailing footer controls, layered above the press overlay.' },
    { name: 'headingLevel', type: '2 | 3 | 4 | 5', default: '3', description: 'Heading element used for the title.' },
  ],

  reducedMotion: 'Only the hover shadow, opacity and ghost transform transition; all of it is dropped with `motion-reduce:transition-none`, and the overlay keeps its shadow but loses the tilt and scale (`motion-reduce:rotate-0 motion-reduce:scale-100`).',

  cleanup: 'Nothing to clean up: the card has no effects, timers or listeners. Avatar tooltips are React Aria overlays that unmount with the card.',

  acceptance:
    'The demo shows three cards: DS-38 with two avatars, a blue "Low" pill and a "vibl" folder chip; FE-79 with a description, "4" comments, "2" attachments and an orange "18 Sep" due chip; DS-31 with an "Urgent" pill, two avatars plus "+2" and a rose overdue chip. FE-79 starts outlined. Clicking DS-31 anywhere moves the outline to it and the caption reads "Open: DS-31"; clicking it again clears the selection. Hovering an avatar shows the person\'s name. Tab reaches each card\'s title button and Enter selects it. Dark mode keeps white text on neutral-800 cards on a neutral-900 panel.',

  criticalRegion: 'critical',
};

export default meta;
