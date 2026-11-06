import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'avatar-stack',
  title: 'Avatar Stack',
  category: 'display',
  kit: 'boardui',
  tags: ['avatar', 'group', 'assignees', 'tooltip', 'boardui'],
  blurb: 'Overlapping assignee discs with surface-coloured rings, a +N overflow disc and a name tooltip on every avatar.',
  cost: 'css',
  motif: 'stack',

  files: [{ path: 'registry/ui/avatar-stack.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The assignee cluster from the project board cards: kit avatars overlap by a quarter of their width, each wearing a 2px ring in the surface colour so the stack reads as cut-outs. Past `max`, the remaining people collapse into a "+N" disc whose tooltip lists them. Every disc is a tab stop with a name tooltip, and the group announces everyone in its label.',

  mechanism: [
    'People render left to right as kit `Avatar`s with negative inline-start margins (`-ms-1.5` for xs/sm, `-ms-2` for md, `-ms-2.5` for lg) on every disc after the first. The root is `isolate`, so the hover/focus `z-10` lift stays inside the stack instead of leaking over neighbouring UI.',
    'The ring is `ring-2` plus `ringClassName` (default `ring-background-primary-default`). Matching it to the surface underneath is what makes the overlap look like a cut-out rather than a border; pass the column colour when the stack sits on a non-white surface.',
    'Overflow rule: with `limit = max(1, max)`, the stack only collapses when `people.length > limit + 1`. Replacing the last avatar with "+1" saves no space and hides a face, so four people at `max = 3` show all four, while five show three discs plus "+2".',
    'Each disc is wrapped as `TooltipTrigger` (150ms delay) → RAC `Focusable` → `Avatar` with `role="img"` and `aria-label` set to the name. `Focusable` makes the disc keyboard reachable and wires hover/focus to the kit `Tooltip` (placement top, name plus optional `description` line). `tooltips={false}` drops the triggers, so discs stop being tab stops.',
    'The "+N" disc is a `button` when `onOverflowPress` is set (e.g. to expand the list or open a member popover) and a `span role="img"` otherwise. Both carry `aria-label="N more: names"`; its tooltip lists the hidden names one per line.',
    'Without an explicit `color`, a person\'s initial tint comes from a djb2 hash of the name over blue, lime, pink and neutral (`tintOf`), so the same person keeps the same colour on every card. `initialsOf` takes the first letters of the first two words.',
  ],

  constants: [
    { name: 'overlap', value: 'xs/sm 6px, md 8px, lg 10px', why: 'About a quarter of the disc width, matched by eye to the board card\'s 20–24px avatars. More overlap hides initials; less stops reading as one group.' },
    { name: 'ring', value: '2px, surface colour', why: 'Wide enough to separate two discs of the same tint, thin enough that the initials stay centred in the visible area.' },
    { name: 'collapse threshold', value: 'people.length > max + 1', why: 'Never shows "+1": a counter that hides one person takes the same room as that person\'s avatar.' },
    { name: 'tooltip delay', value: '150ms', why: 'Fast enough to scrub across the stack and read names, slow enough not to flash when the pointer crosses a card.' },
    { name: 'hover lift', value: '-translate-y-0.5 over 150ms ease-out', why: 'A 2px nudge plus `z-10` brings the hovered face above its neighbour so its full disc is visible while its tooltip shows.' },
  ],

  pitfalls: [
    'Leaving the ring on its white default when the stack sits on a grey column or a dark tinted surface: the rings then read as white outlines. Pass `ringClassName` for that surface.',
    'Dropping `isolate` from the root. The raised `z-10` disc can then paint over sticky headers or popovers that share the stacking context.',
    'Using array indexes as keys. People join and leave cards; keys come from `id` and fall back to `name`.',
    'Hiding names behind colour only. Each disc keeps `role="img"` and its name as `aria-label`, and the group label lists everyone, so screen readers do not depend on the tooltip.',
  ],

  notes: [
    'Kanban Card uses this for the top-right assignee cluster at `size="xs"` with `max={3}`.',
    'Photos work through `src`, but the demo uses initials only so it ships without remote images.',
    'Below 640px the demo shows only the ticket and its assignee list so it fits a phone screen; the Sizes panel joins it from `sm` up.',
  ],

  apiSignature:
    'function AvatarStack(props: Omit<HTMLAttributes<HTMLDivElement>, "children"> & { people: readonly AvatarStackPerson[]; max?: number; size?: "xs" | "sm" | "md" | "lg"; tooltips?: boolean; ringClassName?: string; label?: string; onOverflowPress?: () => void; ref?: Ref<HTMLDivElement> }): JSX.Element\ninterface AvatarStackPerson { id?: string; name: string; initials?: string; color?: AvatarProps["color"]; src?: string; description?: string }\nfunction initialsOf(name: string): string\nfunction tintOf(name: string): AvatarProps["color"]',

  props: [
    { name: 'people', type: 'readonly AvatarStackPerson[]', description: 'Who to show, in order. `id` is the key (falls back to `name`).' },
    { name: 'max', type: 'number', default: '3', description: 'Discs shown before the rest collapse into "+N". Collapses only when two or more would hide.' },
    { name: 'size', type: '"xs" | "sm" | "md" | "lg"', default: '"sm"', description: 'Kit avatar size; overlap and the "+N" disc scale with it.' },
    { name: 'tooltips', type: 'boolean', default: 'true', description: 'Name tooltips on hover and focus. Off removes the tab stops too.' },
    { name: 'ringClassName', type: 'string', default: '"ring-background-primary-default"', description: 'Ring colour; set it to the surface the stack sits on.' },
    { name: 'label', type: 'string', default: '"Assignees"', description: 'Prefix of the group\'s accessible name, followed by every name.' },
    { name: 'onOverflowPress', type: '() => void', description: 'Turns the "+N" disc into a button.' },
  ],

  reducedMotion: 'The 2px hover lift and its transform transition are removed with `motion-reduce:transition-none` and `motion-reduce:hover:translate-y-0`; the z-index raise and tooltips still work.',

  cleanup: 'No effects, timers or listeners of its own. Tooltip open/close timers belong to the kit Tooltip (React Aria) and are released when a trigger unmounts.',

  acceptance:
    'Five assignees at max 3 render three overlapping discs plus "+2"; four render all four with no counter. Hovering or tabbing to a disc raises it and shows a tooltip with the name and role. In the demo, unchecking teammates shrinks the stack and updates "N assigned"; pressing "+N" expands the stack to show everyone and "Collapse" folds it back. Rings match the card in both light and dark themes.',

  criticalRegion: 'critical',
};

export default meta;
