# Build: Users Access Card

The "Users with access" panel of a workspace settings page. Each member row shows a tinted initials avatar, name, email and a compact role select, with a round × button to remove them; the owner row is locked and shows its role as text. An invite form at the bottom checks the email (empty, malformed, already a member), derives a name from the address and appends an "Invited" row with the chosen role. Every change is announced through a polite live region.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Workspace members with initials, email and a role select per row, a remove button, and an invite field that validates before adding a row.

- Category: form
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Hold the list controlled-or-uncontrolled: local state seeds from `defaultUsers`, `users` wins when passed, and every change goes through `commit(next)` which sets local state and calls `onUsersChange(next)`.
2. Render each member as an `li` with the kit `Avatar` (initials from the first letters of the first two words, `aria-hidden`), name plus optional `Badge` "Invited", the email, then either the role as text (`locked`) or a kit `Select` (`aria-label` "Role for <name>") and a kit `CloseButton` (24px) "Remove <name>".
3. On invite submit, `preventDefault`, trim and lowercase the draft, and test in order: empty, the `EMAIL` regex, and duplicates (case-insensitive). A failure sets the kit `Input`'s `isInvalid` + `errorMessage` and refocuses the field; typing clears the error.
4. A valid address becomes a row: `nameFromEmail` splits the local part on `.`, `_` and `-` (dropping a `+tag`) and title-cases it, the colour cycles blue, lime, pink, neutral by list length, `invited: true` adds the badge, and the draft is cleared.
5. Removing stores the next non-locked neighbour (after, then before) in a ref; an effect keyed on the list focuses that row's remove button, or the invite field when none is left, so keyboard users never lose focus to `<body>`.
6. New rows fade and slide 4px down into place with a CSS `@starting-style` transition (`starting:opacity-0 starting:-translate-y-1`, 200ms ease-out), off under `motion-reduce`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`
  Catches the common typos (missing @, missing TLD, spaces) without rejecting real addresses the way a strict RFC pattern would.
- `role select width = 104px`
  Fits the longest default label ("Editor"/"Viewer") plus the chevron; locked rows span 140px (select + 12px gap + 24px close button) with 8px start padding so "Owner" lines up with the select labels.
- `row entry = 200ms, translate-y -4px → 0, opacity 0 → 1`
  Long enough to show where the invited row landed, short enough not to delay a second invite.
- `invite row breakpoint = @sm container query`
  Below ~384px card width the field takes its own line and the role select and Invite button share the next one.

## API

```ts
function UsersAccessCard(props: { users?: AccessUser[]; defaultUsers?: AccessUser[]; onUsersChange?: (users: AccessUser[]) => void; roles?: AccessRole[]; defaultInviteRole?: string; title?: string; invitePlaceholder?: string; inviteLabel?: ReactNode; className?: string }): JSX.Element
type AccessUser = { id: string; name: string; email: string; role: string; initials?: string; color?: "neutral" | "blue" | "lime" | "pink"; locked?: boolean; invited?: boolean }
```

- `users: AccessUser[]`
  Controlled member list.
- `defaultUsers: AccessUser[]` — default `[]`
  Initial members when uncontrolled.
- `onUsersChange: (users: AccessUser[]) => void`
  Called with the new list after a role change, removal or invite.
- `roles: AccessRole[]` — default `Admin, Editor, Viewer`
  Options of every role select ({ id, label }).
- `defaultInviteRole: string` — default `roles[1].id`
  Role preselected in the invite form.
- `title: string` — default `"Users with access"`
  Card heading and the list's accessible name.
- `invitePlaceholder: string` — default `"Invite by email"`
  Placeholder of the invite field.
- `inviteLabel: ReactNode` — default `"Invite"`
  Label of the submit button.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function UsersAccessCard({
  users,
  defaultUsers = [],
  onUsersChange,
  roles = DEFAULT_ACCESS_ROLES,
  defaultInviteRole,
  title = "Users with access",
  invitePlaceholder = "Invite by email",
  inviteLabel = "Invite",
  className,
}: UsersAccessCardProps) {
  const [own, setOwn] = useState(defaultUsers);
  const list = users ?? own;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState(defaultInviteRole ?? roles[1]?.id ?? roles[0]?.id ?? "");
  const [announcement, setAnnouncement] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());
  // After a removal, focus lands on the next row's remove button (or the
  // invite field) once the new list has rendered.
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    const id = pendingFocus.current;
    if (id === null) return;
    pendingFocus.current = null;
    (removeRefs.current.get(id) ?? inputRef.current)?.focus();
  }, [list]);

  const commit = (next: AccessUser[]) => {
    setOwn(next);
    onUsersChange?.(next);
  };
  const roleLabel = (id: string) => roles.find((r) => r.id === id)?.label ?? id;

  const invite = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = draft.trim().toLowerCase();
    let problem: string | null = null;
    if (!email) problem = "Enter an email address.";
    else if (!EMAIL.test(email)) problem = "Enter a valid email, like name@company.com.";
    else if (list.some((u) => u.email.toLowerCase() === email)) problem = `${email} already has access.`;
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    const name = nameFromEmail(email);
    commit([
      ...list,
      {
        id: `invite:${email}`,
        name,
        email,
        role: inviteRole,
        color: COLORS[list.length % COLORS.length],
        invited: true,
      },
    ]);
    setDraft("");
    setAnnouncement(`Invited ${name} as ${roleLabel(inviteRole)}.`);
  };

  const remove = (id: string) => {
    const i = list.findIndex((u) => u.id === id);
    const gone = list[i];
    if (!gone) return;
    const next = list.filter((u) => u.id !== id);
    const neighbour = [...next.slice(i), ...next.slice(0, i).reverse()].find((u) => !u.locked);
    pendingFocus.current = neighbour?.id ?? "";
    commit(next);
    setAnnouncement(`Removed ${gone.name}.`);
  };

  const setRole = (id: string, role: string) => {
    commit(list.map((u) => (u.id === id ? { ...u, role } : u)));
    const who = list.find((u) => u.id === id);
    if (who) setAnnouncement(`${who.name} is now ${roleLabel(role)}.`);
  };

  return (
    <section
      className={cx(
        "@container flex w-full min-w-0 flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-xs",
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-3 px-2.5 pt-1.5 pb-1">
        <h3 className="text-body-medium text-text-secondary">{title}</h3>
        <span className="text-caption-1-medium text-text-tertiary tabular-nums">
          {list.length} {list.length === 1 ? "person" : "people"}
        </span>
      </header>

      <ul aria-label={title} className="flex flex-col">
        {list.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 rounded-2lg px-2.5 py-2 transition-[opacity,translate] duration-200 ease-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
          >
            <Avatar size="md" color={u.color ?? "neutral"} initials={u.initials ?? initialsOf(u.name)} aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-body-medium text-text-primary">{u.name}</span>
                {u.invited ? <Badge className="shrink-0">Invited</Badge> : null}
              </span>
              <span className="truncate text-caption-1-medium text-text-tertiary">{u.email}</span>
            </div>
            {u.locked ? (
              <span className="w-[140px] shrink-0 ps-2 text-body-2-medium text-text-secondary">
                {roleLabel(u.role)}
              </span>
            ) : (
              <>
                <Select
                  aria-label={`Role for ${u.name}`}
                  size="sm"
                  value={u.role}
                  onChange={(k) => k != null && setRole(u.id, String(k))}
                  className="w-[104px] shrink-0"
                  popoverClassName="w-40"
                >
                  {roles.map((r) => (
                    <SelectItem key={r.id} id={r.id} textValue={r.label}>
                      {r.label}
                    </SelectItem>
                  ))}
                </Select>
                <CloseButton
                  ref={(el) => {
                    if (el) removeRefs.current.set(u.id, el);
                    else removeRefs.current.delete(u.id);
                  }}
                  size="sm"
                  aria-label={`Remove ${u.name}`}
                  onClick={() => remove(u.id)}
                />
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        noValidate
        onSubmit={invite}
        className="mt-1 grid grid-cols-[1fr_auto] items-start gap-2 border-t border-border-button-default px-2.5 pt-3 pb-2 @sm:grid-cols-[1fr_auto_auto]"
      >
        <Input
          ref={inputRef}
          aria-label="Invite by email"
          type="email"
          size="small"
          leadingIcon={RiMailLine}
          placeholder={invitePlaceholder}
          value={draft}
          onChange={(v) => {
            setDraft(v);
            setError(null);
          }}
          isInvalid={error !== null}
          errorMessage={error}
          validationBehavior="aria"
          className="col-span-2 min-w-0 @sm:col-span-1"
        />
        <Select
          aria-label="Role for new member"
          size="sm"
          value={inviteRole}
          onChange={(k) => k != null && setInviteRole(String(k))}
          className="w-[104px] @sm:mt-px"
          popoverClassName="w-40"
        >
          {roles.map((r) => (
            <SelectItem key={r.id} id={r.id} textValue={r.label}>
              {r.label}
            </SelectItem>
          ))}
        </Select>
        <Button type="submit" variant="primary" size="small" className="justify-self-end">
          {inviteLabel}
        </Button>
      </form>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: no timers, listeners or observers. The remove-button ref map deletes an entry when its button unmounts.

**Reduced motion.** Rows carry `motion-reduce:transition-none`, so an invited row appears in place without the fade and slide; the kit Select popover follows its own reduced-motion rule.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Letting focus fall to <body> after removing a row: the button that had focus is gone, so focus must move to a neighbour explicitly after the re-render.
- Using native constraint validation on the email input: the browser bubble ignores the kit styling and fires before the duplicate check. Use `noValidate` and `validationBehavior="aria"` and show your own message.
- Comparing emails case-sensitively, which lets "Jon.Park@" and "jon.park@" both in.

## Notes

- `locked` accepts any role label (e.g. "Owner") that is not in `roles`; it is shown as text.
- The demo is controlled and counts admins under the card, so a role change updates the caption.

## Definition of done

The card lists 4 people with Ava Lindqvist as a locked Owner. Submitting an empty invite shows "Enter an email address."; "bad@x" shows the valid-email message; "jon.park@example.com" says it already has access. Inviting "dana.kim@example.com" appends "Dana Kim" with an Invited badge and the count becomes 5 people. Clicking "Remove Jon Park" drops the row and moves focus to the next remove button; changing a role through its select updates the admin count under the card.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
