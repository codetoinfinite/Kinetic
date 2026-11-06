/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Profile Cover Header" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
"use client";

import { useId, useState } from "react";
import type { ComponentType, HTMLAttributes, Key, ReactNode, Ref } from "react";
import {
  RiEditBoxLine,
  RiUpload2Line,
  RiUserAddLine,
  RiUserFollowLine,
} from "@remixicon/react";

import { cx } from "@/registry/lib/cx";
import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { Tab, TabList, TabPanel, Tabs } from "@/registry/ui/tabs";

/**
 * Profile Cover Header: the identity card at the top of a profile page.
 *
 * A wide cover band (built-in gradient artwork or your own node), an 80px
 * initials avatar that overlaps the cover's bottom edge, the name, handle and
 * small badges, an optional bio and inline stats, the action row (Share plus
 * Follow for visitors or Edit for the owner), and an underline tab strip whose
 * panels you render.
 */

type IconComponent = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

export type ProfileCoverTone = "sky" | "dusk" | "aurora";
export type ProfileBadgeTone = "neutral" | "purple" | "blue" | "lime";

export interface ProfileBadge {
  label: ReactNode;
  tone?: ProfileBadgeTone;
}

export interface ProfileStat {
  label: string;
  value: ReactNode;
}

export interface ProfileTab {
  id: string;
  label: ReactNode;
  count?: ReactNode;
  icon?: IconComponent;
}

export interface ProfileCoverHeaderProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  name: string;
  /** Shown as-is, e.g. "@sitenley". */
  handle: string;
  /** Avatar initials; defaults to the first letter of `name`. */
  initials?: string;
  badges?: ProfileBadge[];
  bio?: ReactNode;
  /** Inline counts under the handle, e.g. followers / following. */
  stats?: ProfileStat[];
  /** Replaces the built-in gradient artwork. It is clipped to the cover band. */
  cover?: ReactNode;
  coverTone?: ProfileCoverTone;
  /** Owner view: shows Edit instead of Follow. */
  isOwner?: boolean;
  isFollowing?: boolean;
  defaultFollowing?: boolean;
  onFollowingChange?: (isFollowing: boolean) => void;
  /** Renders the Share button when provided. */
  onShare?: () => void;
  /** Called by Edit (owner view only). */
  onEdit?: () => void;
  tabs?: ProfileTab[];
  selectedTab?: string;
  defaultSelectedTab?: string;
  onTabChange?: (id: string) => void;
  /** Content of each tab panel. */
  renderPanel?: (id: string) => ReactNode;
  ref?: Ref<HTMLElement>;
}

const BADGE_TONES: Record<ProfileBadgeTone, string> = {
  neutral: "bg-badge-neutral-background text-text-secondary",
  purple: "bg-status-purple-background text-status-purple-text",
  blue: "bg-status-blue-background text-status-blue-text",
  lime: "bg-status-lime-background text-status-lime-text",
};

// Artwork palettes (SVG only): sky top, sky bottom, glow, near forms, far forms.
const COVER_PALETTES: Record<ProfileCoverTone, readonly [string, string, string, string, string]> = {
  sky: ["#2f7fd0", "#9fd0f3", "#ffffff", "#eef3f8", "#b8c9db"],
  dusk: ["#5b3fa8", "#f3a77f", "#ffe7c2", "#f6dde0", "#c6a3c8"],
  aurora: ["#0d2537", "#2c9d8f", "#c8fff0", "#cfe9e4", "#5d8c96"],
};

/** Built-in cover: sky gradient, a haloed sun, drifting haze and two rows of soft forms. */
export function ProfileCoverArt({
  tone = "sky",
  className,
}: {
  tone?: ProfileCoverTone;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [top, bottom, glow, near, far] = COVER_PALETTES[tone];
  return (
    <svg
      aria-hidden
      viewBox="0 0 680 170"
      preserveAspectRatio="xMidYMid slice"
      className={cx("size-full", className)}
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.66" cy="0.32" r="0.42">
          <stop offset="0" stopColor={glow} stopOpacity="0.95" />
          <stop offset="0.18" stopColor={glow} stopOpacity="0.55" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-near`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={near} />
          <stop offset="1" stopColor={far} />
        </linearGradient>
        <filter id={`${uid}-haze`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <rect width="680" height="170" fill={`url(#${uid}-sky)`} />
      <rect width="680" height="170" fill={`url(#${uid}-glow)`} />
      <g filter={`url(#${uid}-haze)`} fill={glow} opacity="0.45">
        <ellipse cx="120" cy="38" rx="90" ry="12" />
        <ellipse cx="300" cy="64" rx="70" ry="10" />
        <ellipse cx="560" cy="108" rx="110" ry="14" />
      </g>
      <circle cx="449" cy="54" r="24" fill={glow} />
      <g fill={far} opacity="0.85">
        <circle cx="40" cy="168" r="70" />
        <circle cx="610" cy="176" r="88" />
        <rect x="508" y="20" width="9" height="70" rx="4.5" transform="rotate(28 512 55)" />
      </g>
      <g fill={`url(#${uid}-near)`}>
        <circle cx="150" cy="150" r="78" />
        <circle cx="272" cy="168" r="64" />
        <circle cx="380" cy="138" r="52" />
        <rect x="420" y="96" width="170" height="120" rx="56" />
      </g>
      <g fill={far} opacity="0.6">
        <circle cx="150" cy="150" r="30" />
        <rect x="470" y="128" width="72" height="10" rx="5" />
        <rect x="470" y="146" width="48" height="10" rx="5" />
      </g>
    </svg>
  );
}

export function ProfileCoverHeader({
  name,
  handle,
  initials,
  badges = [],
  bio,
  stats = [],
  cover,
  coverTone = "sky",
  isOwner = false,
  isFollowing,
  defaultFollowing = false,
  onFollowingChange,
  onShare,
  onEdit,
  tabs = [],
  selectedTab,
  defaultSelectedTab,
  onTabChange,
  renderPanel,
  className,
  ref,
  ...props
}: ProfileCoverHeaderProps) {
  const nameId = useId();
  // #region critical
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
  // #endregion

  return (
    <section
      ref={ref}
      aria-labelledby={nameId}
      className={cx(
        "w-full overflow-hidden rounded-2xl border border-border-ai-profile-card bg-background-primary-default",
        className,
      )}
      {...props}
    >
      <div className="relative h-28 overflow-hidden bg-background-tertiary-default sm:h-40 dark:brightness-[0.85]">
        {cover ?? <ProfileCoverArt tone={coverTone} className="absolute inset-0" />}
      </div>

      <div className="px-4">
        <div className="flex items-start justify-between gap-3">
          <Avatar
            initials={avatarText}
            aria-hidden
            className="relative z-10 -mt-10 size-20 text-[28px] leading-none font-normal ring-4 ring-background-primary-default"
          />
          <div className="pt-3">{actions}</div>
        </div>

        <div className="mt-2 flex flex-col gap-1">
          <h2 id={nameId} className="text-title-2-medium text-text-primary">
            {name}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-headline-regular text-text-secondary">{handle}</span>
            {badges.map((badge, i) => (
              <span
                key={i}
                className={cx(
                  "inline-flex items-center rounded-sm px-1 py-px text-caption-2-semibold tracking-wide",
                  badge.tone ? BADGE_TONES[badge.tone] : BADGE_TONES.neutral,
                )}
              >
                {badge.label}
              </span>
            ))}
          </div>
          {bio && <p className="mt-1 max-w-[60ch] text-body-regular text-text-secondary">{bio}</p>}
          {stats.length > 0 && (
            <dl className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-1">
                  <dt className="order-2 text-body-regular text-text-tertiary">{stat.label}</dt>
                  <dd className="order-1 text-body-medium text-text-primary tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {tabs.length > 0 ? (
        <Tabs
          selectedKey={selectedTab}
          defaultSelectedKey={defaultSelectedTab ?? tabs[0]?.id}
          onSelectionChange={(key: Key) => onTabChange?.(String(key))}
          className="mt-3 gap-0"
        >
          <div className="overflow-x-auto px-4 [scrollbar-width:none]">
            <TabList aria-label={`${name} profile sections`} className="min-w-max">
              {tabs.map((tab) => (
                <Tab key={tab.id} id={tab.id} icon={tab.icon} count={tab.count}>
                  {tab.label}
                </Tab>
              ))}
            </TabList>
          </div>
          {tabs.map((tab) => (
            <TabPanel key={tab.id} id={tab.id} className="p-4">
              {renderPanel?.(tab.id)}
            </TabPanel>
          ))}
        </Tabs>
      ) : (
        <div className="h-4" />
      )}
    </section>
  );
}
