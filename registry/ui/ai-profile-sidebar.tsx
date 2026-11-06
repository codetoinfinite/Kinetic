/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Profile" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiArrowUpDownLine,
  RiCustomerServiceLine,
  RiEditLine,
  RiSearchLine,
  RiSettings4Line,
  RiSideBarLine,
  RiUserSmileLine,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { Avatar } from "@/registry/ui/avatar";
import { Dropdown, DropdownDivider, DropdownItem, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { Kbd } from "@/registry/ui/kbd";
import { ThemeToggle } from "@/registry/ui/theme-toggle";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";
import { PROFILE_NAV, PROFILE_TEAMS, type ProfileView } from "@/registry/ui/ai-profile-data";

export const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";

const row = cx(
  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-body-medium",
  "transition-colors duration-150 ease-out motion-reduce:transition-none",
  focusRing,
);

/** Square icon button with a tooltip that repeats its accessible name. */
export function HintIcon({
  icon: Icon,
  label,
  onPress,
  className,
}: {
  icon: RemixiconComponentType;
  label: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <TooltipTrigger>
      <button
        type="button"
        aria-label={label}
        onClick={onPress}
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-xl text-foreground-icon-secondary",
          "transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-text-primary motion-reduce:transition-none",
          focusRing,
          className,
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </button>
      <Tooltip>{label}</Tooltip>
    </TooltipTrigger>
  );
}

function FooterButton({ icon: Icon, label, onPress }: { icon: RemixiconComponentType; label: string; onPress: () => void }) {
  return (
    <button type="button" onClick={onPress} className={cx(row, "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary")}>
      <Icon className="size-[18px] shrink-0 text-foreground-icon-secondary" aria-hidden />
      {label}
    </button>
  );
}

export interface ProfileSidebarProps {
  view: ProfileView;
  onView: (view: ProfileView) => void;
  unread: number;
  name: string;
  teamId: string;
  onTeam: (id: string) => void;
  onEditProfile: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onSupport: () => void;
  onCollapse: () => void;
  className?: string;
}

export function ProfileSidebar(props: ProfileSidebarProps) {
  const [accountMenu, setAccountMenu] = useState(false);
  const [teamMenu, setTeamMenu] = useState(false);
  const team = PROFILE_TEAMS.find((t) => t.id === props.teamId) ?? PROFILE_TEAMS[0];
  const initial = props.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside
      aria-label="Workspace"
      className={cx(
        "flex h-full w-[248px] flex-col gap-3 rounded-3xl border border-border-button-white bg-background-secondary-default p-3 shadow-sidebar",
        props.className,
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <Dropdown isOpen={accountMenu} onOpenChange={setAccountMenu}>
          <DropdownTrigger
            aria-label={`Account: ${props.name}`}
            className={cx("flex min-w-0 items-center gap-2 rounded-xl p-1 pr-2 hover:bg-background-secondary-hover", focusRing)}
          >
            <Avatar size="sm" initials={initial} />
            <span className="truncate text-body-medium text-text-primary">{props.name}</span>
            <RiArrowUpDownLine className="size-3.5 shrink-0 text-foreground-icon-tertiary" aria-hidden />
          </DropdownTrigger>
          <DropdownPopover aria-label="Account" placement="bottom start" className="w-[220px]">
            <DropdownItem
              onSelect={() => {
                setAccountMenu(false);
                props.onView("profile");
              }}
            >
              <RiUserSmileLine className="size-4 text-foreground-icon-secondary" aria-hidden />
              <span className="text-body-medium text-text-primary">View profile</span>
            </DropdownItem>
            <DropdownItem
              onSelect={() => {
                setAccountMenu(false);
                props.onEditProfile();
              }}
            >
              <RiEditLine className="size-4 text-foreground-icon-secondary" aria-hidden />
              <span className="text-body-medium text-text-primary">Edit profile</span>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem
              onSelect={() => {
                setAccountMenu(false);
                props.onSettings();
              }}
            >
              <RiSettings4Line className="size-4 text-foreground-icon-secondary" aria-hidden />
              <span className="text-body-medium text-text-primary">Account settings</span>
            </DropdownItem>
          </DropdownPopover>
        </Dropdown>
        <HintIcon icon={RiSideBarLine} label="Hide sidebar" onPress={props.onCollapse} />
      </div>

      <button
        type="button"
        onClick={props.onSearch}
        className={cx(
          "flex w-full items-center gap-2 rounded-xl bg-background-tertiary-default px-2.5 py-2 text-left",
          "transition-colors duration-150 ease-out hover:bg-background-tertiary-hover motion-reduce:transition-none",
          focusRing,
        )}
      >
        <RiSearchLine className="size-[18px] text-foreground-icon-tertiary" aria-hidden />
        <span className="flex-1 text-body-regular text-text-secondary">Quick Search</span>
        <Kbd>⌘L</Kbd>
      </button>

      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-0.5">
          {PROFILE_NAV.map((item) => {
            const active = item.id === props.view;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => props.onView(item.id)}
                  className={cx(
                    row,
                    active
                      ? "bg-button-primary text-text-white shadow-xs"
                      : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
                  )}
                >
                  <Icon className={cx("size-[18px] shrink-0", active ? "text-text-white" : "text-foreground-icon-secondary")} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.id === "home" && props.unread > 0 && (
                    <span
                      className={cx(
                        "rounded-md px-1.5 text-caption-1-medium tabular-nums",
                        active ? "text-text-white" : "bg-background-tertiary-default text-text-secondary",
                      )}
                    >
                      {props.unread}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-2">
        <ThemeToggle appearance="sidebar-segmented" />
        <div className="flex flex-col gap-0.5">
          <FooterButton icon={RiCustomerServiceLine} label="Support" onPress={props.onSupport} />
          <FooterButton icon={RiSettings4Line} label="Settings" onPress={props.onSettings} />
        </div>
        {team && (
          <Dropdown isOpen={teamMenu} onOpenChange={setTeamMenu}>
            <DropdownTrigger
              aria-label={`Team: ${team.name}`}
              className={cx(
                "flex w-full items-center gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-2 text-left shadow-2xs",
                "transition-colors duration-150 ease-out hover:border-border-button-hover motion-reduce:transition-none",
                focusRing,
              )}
            >
              <Avatar size="md" color={team.color} initials={team.initials} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-2-medium text-text-primary">{team.name}</span>
                <span className="block truncate text-caption-1-regular text-text-tertiary">{team.email}</span>
              </span>
              <RiArrowUpDownLine className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden />
            </DropdownTrigger>
            <DropdownPopover aria-label="Switch team" placement="top start" className="w-[224px]">
              {PROFILE_TEAMS.map((option) => (
                <DropdownItem
                  key={option.id}
                  selected={option.id === team.id}
                  onSelect={() => {
                    setTeamMenu(false);
                    props.onTeam(option.id);
                  }}
                >
                  <Avatar size="sm" color={option.color} initials={option.initials} />
                  <span className="text-body-medium text-text-primary">{option.name}</span>
                </DropdownItem>
              ))}
            </DropdownPopover>
          </Dropdown>
        )}
      </div>
    </aside>
  );
}
