/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Workspace Switcher" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'workspace-switcher',
  title: 'Workspace Switcher',
  category: 'navigation',
  kit: 'boardui',
  tags: ['boardui', 'menu', 'workspace', 'sidebar', 'react-aria'],
  blurb: 'Sidebar-top workspace menu: mark, name and plan on the trigger, a checked list of workspaces and a create-workspace row.',
  cost: 'css',
  motif: 'stack',
  files: [
    { path: 'registry/ui/workspace-switcher.tsx', type: 'registry:ui', role: 'WorkspaceSwitcher trigger + menu' },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],
  summary:
    'A workspace switcher for the head of a sidebar. The trigger is a full-width row showing the current workspace mark, name and plan with an up/down chevron. It opens a non-modal menu listing every workspace (mark, name, plan · detail) with a check on the current one, plus an optional "Create workspace" action in its own section. Choosing a workspace closes the menu and the trigger contents cross in with a short starting-style entrance.',
  mechanism: [
    'React Aria MenuTrigger + Menu supply the menu semantics: arrow keys, Home/End, typeahead, Enter/Space to choose and Escape to close with focus back on the trigger.',
    'The workspace rows live in a MenuSection with selectionMode="single", disallowEmptySelection and selectedKeys=[current], so they render as menuitemradio with aria-checked and the check icon reads isSelected from the item render props.',
    'The create row sits in a second MenuSection with no selection mode and uses onAction, so it can never become the selected workspace.',
    'The Popover is isNonModal so the page never scroll-locks; useDismissOnOutsidePress restores close-on-outside-press and useTriggerToggle swallows the spurious reopen when the open trigger is pressed again.',
    'Value and open state are each controlled-or-uncontrolled: value/defaultValue/onChange and isOpen/onOpenChange.',
    'The trigger mark and label are keyed by workspace id, so a switch remounts them and their @starting-style classes (starting:opacity-0, starting:translate-y-1, starting:scale-75) play a 200ms entrance.',
  ],
  constants: [
    { name: 'popover width', value: '280px', why: 'Room for a 32px mark plus a name and "plan · members" line without truncating typical names.' },
    { name: 'offset', value: '6px', why: 'Clears the trigger hover fill so the menu reads as attached, not overlapping.' },
    { name: 'entrance', value: '200ms ease-out, translate-y 4px / scale 0.75', why: 'Long enough to notice the switch, short enough not to delay reading the new name.' },
  ],
  pitfalls: [
    'Put selection on the MenuSection, not the Menu: a Menu-level selectionMode would turn the create row into a selectable radio.',
    'isNonModal popovers lose React Aria outside-press dismissal; without useDismissOnOutsidePress the menu stays open when clicking the page.',
    'Key the trigger contents by id, not by name, or two workspaces with equal names will not replay the entrance.',
  ],
  notes: [
    'The trigger accessible name is "<aria-label>: <current name>", so screen readers announce the current workspace before opening.',
    'Pass onCreateWorkspace to show the create row; omit it for a pick-only switcher.',
  ],
  apiSignature:
    'function WorkspaceSwitcher(props: { workspaces: Workspace[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; onCreateWorkspace?: () => void; createLabel?: string; sectionLabel?: string; isOpen?: boolean; onOpenChange?: (open: boolean) => void; "aria-label"?: string; className?: string }): JSX.Element | null',
  props: [
    { name: 'workspaces', type: 'Workspace[]', description: '{ id, name, plan, detail?, initials?, tone? } for every workspace; tone is the kit Avatar colour.' },
    { name: 'value', type: 'string', description: 'Controlled selected workspace id.' },
    { name: 'defaultValue', type: 'string', default: 'workspaces[0].id', description: 'Initial id when uncontrolled.' },
    { name: 'onChange', type: '(id: string) => void', description: 'Called with the newly chosen id (not when re-choosing the current one).' },
    { name: 'onCreateWorkspace', type: '() => void', description: 'Shows the create row and runs when it is chosen.' },
    { name: 'createLabel', type: 'string', default: '"Create workspace"', description: 'Label of the create row.' },
    { name: 'sectionLabel', type: 'string', default: '"Workspaces"', description: 'Heading above the list, also the menu aria-label.' },
    { name: 'isOpen', type: 'boolean', description: 'Controlled open state.' },
    { name: 'onOpenChange', type: '(open: boolean) => void', description: 'Open state change callback.' },
    { name: 'aria-label', type: 'string', default: '"Switch workspace"', description: 'Trigger name prefix; the current workspace name is appended.' },
    { name: 'className', type: 'string', description: 'Extra classes for the trigger.' },
  ],
  reducedMotion:
    'The popover keeps its opacity fade from the kit surface but drops nothing else that moves; the trigger entrance, hover fills and check fade all use motion-reduce:transition-none, so a switch swaps contents instantly.',
  cleanup:
    'The outside-press and trigger-toggle hooks add document pointerdown listeners only while open and remove them on close or unmount; there are no timers.',
  acceptance:
    'Clicking the trigger opens a menu of workspaces with exactly one checked; choosing another closes the menu and the trigger shows the new name and plan; Escape closes with focus on the trigger; arrow keys move between rows; "Create workspace" runs the callback and is never checked.',
  criticalRegion: 'critical',
};

export default meta;
