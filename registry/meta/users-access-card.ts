/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Users Access Card" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'users-access-card',
  title: 'Users Access Card',
  category: 'form',
  kit: 'boardui',
  tags: ['members', 'access', 'invite', 'roles', 'settings', 'form', 'boardui'],
  blurb:
    'Workspace members with initials, email and a role select per row, a remove button, and an invite field that validates before adding a row.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/users-access-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The "Users with access" panel of a workspace settings page. Each member row shows a tinted initials avatar, name, email and a compact role select, with a round × button to remove them; the owner row is locked and shows its role as text. An invite form at the bottom checks the email (empty, malformed, already a member), derives a name from the address and appends an "Invited" row with the chosen role. Every change is announced through a polite live region.',

  mechanism: [
    'Hold the list controlled-or-uncontrolled: local state seeds from `defaultUsers`, `users` wins when passed, and every change goes through `commit(next)` which sets local state and calls `onUsersChange(next)`.',
    'Render each member as an `li` with the kit `Avatar` (initials from the first letters of the first two words, `aria-hidden`), name plus optional `Badge` "Invited", the email, then either the role as text (`locked`) or a kit `Select` (`aria-label` "Role for <name>") and a kit `CloseButton` (24px) "Remove <name>".',
    'On invite submit, `preventDefault`, trim and lowercase the draft, and test in order: empty, the `EMAIL` regex, and duplicates (case-insensitive). A failure sets the kit `Input`\'s `isInvalid` + `errorMessage` and refocuses the field; typing clears the error.',
    'A valid address becomes a row: `nameFromEmail` splits the local part on `.`, `_` and `-` (dropping a `+tag`) and title-cases it, the colour cycles blue, lime, pink, neutral by list length, `invited: true` adds the badge, and the draft is cleared.',
    'Removing stores the next non-locked neighbour (after, then before) in a ref; an effect keyed on the list focuses that row\'s remove button, or the invite field when none is left, so keyboard users never lose focus to `<body>`.',
    'New rows fade and slide 4px down into place with a CSS `@starting-style` transition (`starting:opacity-0 starting:-translate-y-1`, 200ms ease-out), off under `motion-reduce`.',
  ],

  constants: [
    {
      name: 'EMAIL',
      value: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/',
      why: 'Catches the common typos (missing @, missing TLD, spaces) without rejecting real addresses the way a strict RFC pattern would.',
    },
    {
      name: 'role select width',
      value: '104px',
      why: 'Fits the longest default label ("Editor"/"Viewer") plus the chevron; locked rows span 140px (select + 12px gap + 24px close button) with 8px start padding so "Owner" lines up with the select labels.',
    },
    {
      name: 'row entry',
      value: '200ms, translate-y -4px → 0, opacity 0 → 1',
      why: 'Long enough to show where the invited row landed, short enough not to delay a second invite.',
    },
    {
      name: 'invite row breakpoint',
      value: '@sm container query',
      why: 'Below ~384px card width the field takes its own line and the role select and Invite button share the next one.',
    },
  ],

  pitfalls: [
    'Letting focus fall to <body> after removing a row: the button that had focus is gone, so focus must move to a neighbour explicitly after the re-render.',
    'Using native constraint validation on the email input: the browser bubble ignores the kit styling and fires before the duplicate check. Use `noValidate` and `validationBehavior="aria"` and show your own message.',
    'Comparing emails case-sensitively, which lets "Jon.Park@" and "jon.park@" both in.',
  ],

  notes: [
    '`locked` accepts any role label (e.g. "Owner") that is not in `roles`; it is shown as text.',
    'The demo is controlled and counts admins under the card, so a role change updates the caption.',
  ],

  apiSignature:
    'function UsersAccessCard(props: { users?: AccessUser[]; defaultUsers?: AccessUser[]; onUsersChange?: (users: AccessUser[]) => void; roles?: AccessRole[]; defaultInviteRole?: string; title?: string; invitePlaceholder?: string; inviteLabel?: ReactNode; className?: string }): JSX.Element\ntype AccessUser = { id: string; name: string; email: string; role: string; initials?: string; color?: "neutral" | "blue" | "lime" | "pink"; locked?: boolean; invited?: boolean }',

  props: [
    { name: 'users', type: 'AccessUser[]', description: 'Controlled member list.' },
    { name: 'defaultUsers', type: 'AccessUser[]', default: '[]', description: 'Initial members when uncontrolled.' },
    { name: 'onUsersChange', type: '(users: AccessUser[]) => void', description: 'Called with the new list after a role change, removal or invite.' },
    { name: 'roles', type: 'AccessRole[]', default: 'Admin, Editor, Viewer', description: 'Options of every role select ({ id, label }).' },
    { name: 'defaultInviteRole', type: 'string', default: 'roles[1].id', description: 'Role preselected in the invite form.' },
    { name: 'title', type: 'string', default: '"Users with access"', description: 'Card heading and the list\'s accessible name.' },
    { name: 'invitePlaceholder', type: 'string', default: '"Invite by email"', description: 'Placeholder of the invite field.' },
    { name: 'inviteLabel', type: 'ReactNode', default: '"Invite"', description: 'Label of the submit button.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'Rows carry `motion-reduce:transition-none`, so an invited row appears in place without the fade and slide; the kit Select popover follows its own reduced-motion rule.',

  cleanup:
    'Nothing to clean up: no timers, listeners or observers. The remove-button ref map deletes an entry when its button unmounts.',

  acceptance:
    'The card lists 4 people with Ava Lindqvist as a locked Owner. Submitting an empty invite shows "Enter an email address."; "bad@x" shows the valid-email message; "jon.park@example.com" says it already has access. Inviting "dana.kim@example.com" appends "Dana Kim" with an Invited badge and the count becomes 5 people. Clicking "Remove Jon Park" drops the row and moves focus to the next remove button; changing a role through its select updates the admin count under the card.',

  criticalRegion: 'critical',
};

export default meta;
