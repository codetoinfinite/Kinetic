/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Users Access Card" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { RiMailLine } from "@remixicon/react";
import { Avatar } from "@/registry/ui/avatar";
import { Badge } from "@/registry/ui/badge";
import { Button } from "@/registry/ui/button";
import { CloseButton } from "@/registry/ui/close-button";
import { Input } from "@/registry/ui/input";
import { Select, SelectItem } from "@/registry/ui/select";
import { cx } from "@/registry/lib/cx";

/**
 * Users Access Card — who can open a workspace and with which role. Each row
 * has initials, name, email and a role select; members can be removed, and an
 * invite field at the bottom validates the address before appending a row.
 *
 *   <UsersAccessCard defaultUsers={TEAM} onUsersChange={save} />
 *
 * `locked` rows (the owner, "you") show their role as text and cannot be
 * removed. Invited rows carry an "Invited" badge until the app clears it.
 */

export type AccessAvatarColor = "neutral" | "blue" | "lime" | "pink";

export interface AccessRole {
  id: string;
  label: string;
}

export interface AccessUser {
  id: string;
  name: string;
  email: string;
  /** A role id, or any label for `locked` rows (e.g. "Owner"). */
  role: string;
  /** Default: the first letters of the first two words of `name`. */
  initials?: string;
  color?: AccessAvatarColor;
  /** Role shown as text, no remove button. */
  locked?: boolean;
  /** Shows an "Invited" badge. */
  invited?: boolean;
}

export interface UsersAccessCardProps {
  /** Controlled list. */
  users?: AccessUser[];
  /** Initial list when uncontrolled. */
  defaultUsers?: AccessUser[];
  onUsersChange?: (users: AccessUser[]) => void;
  /** Selectable roles. Default Admin, Editor, Viewer. */
  roles?: AccessRole[];
  /** Role preselected for invites. Default: the second role (Editor). */
  defaultInviteRole?: string;
  /** Card title and the list's accessible name. Default "Users with access". */
  title?: string;
  invitePlaceholder?: string;
  inviteLabel?: ReactNode;
  className?: string;
}

export const DEFAULT_ACCESS_ROLES: AccessRole[] = [
  { id: "admin", label: "Admin" },
  { id: "editor", label: "Editor" },
  { id: "viewer", label: "Viewer" },
];

const COLORS: AccessAvatarColor[] = ["blue", "lime", "pink", "neutral"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "dana.kim+work@x.io" → "Dana Kim". */
export function nameFromEmail(email: string): string {
  const local = (email.split("@")[0] ?? "").split("+")[0] ?? "";
  const words = local.split(/[._-]+/).filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || email;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

// #region critical
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
// #endregion
