/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Profile" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import type { Key } from "react-aria-components";
import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiCheckDoubleLine,
  RiEditLine,
  RiFireLine,
  RiFlashlightLine,
  RiImageLine,
  RiRobot2Line,
  RiUserSmileLine,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import type { AgentMonth } from "@/registry/ui/agents-bar-card";
import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { GALLERY_ITEMS, ImageGalleryMasonry, type GalleryItem } from "@/registry/ui/image-gallery-masonry";
import { Input } from "@/registry/ui/input";
import { ModalBody, ModalFooter, ModalHeader } from "@/registry/ui/modal";
import type { ProfileCoverTone } from "@/registry/ui/profile-cover-header";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { Textarea } from "@/registry/ui/textarea";
import { focusRing } from "@/registry/ui/ai-profile-sidebar";
import {
  HEAT_RANGES,
  PROFILE_EVENTS,
  PROFILE_NAV,
  WORKSPACE_PAGES,
  type HeatRange,
  type HeatRangeId,
  type ProfileDraft,
  type ProfileEvent,
  type ProfileView,
} from "@/registry/ui/ai-profile-data";

const count = new Intl.NumberFormat("en-US");

/* ------------------------------------------------------------- heatmap */

/** Empty, then four violet steps. */
export const HEAT_LEVELS = [
  "bg-background-quaternary-default",
  "bg-status-purple-text/20",
  "bg-status-purple-text/40",
  "bg-status-purple-text/70",
  "bg-status-purple-text",
] as const;

/** 0 for an idle cell, otherwise 1–4 by quarter of the busiest cell. */
export function heatLevel(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((value / max) * 4));
}

function HeatGrid({ range }: { range: HeatRange }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = range.values.reduce((m, v) => Math.max(m, v), 0);
  const total = range.values.reduce((s, v) => s + v, 0);
  const busiest = range.values.indexOf(max);
  const hoveredValue = hovered === null ? null : (range.values[hovered] ?? 0);

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`${count.format(total)} runs over ${range.span}. Busiest: ${range.cellLabel(busiest)} with ${count.format(max)} runs.`}
        onPointerOver={(event) => {
          const index = Number((event.target as HTMLElement).dataset.cell);
          if (Number.isInteger(index)) setHovered(index);
        }}
        onPointerLeave={() => setHovered(null)}
        className="grid h-[116px] grid-flow-col gap-[2px] sm:gap-[3px]"
        style={{
          gridTemplateRows: `repeat(${range.rows}, minmax(0, 1fr))`,
          gridTemplateColumns: `repeat(${range.cols}, minmax(0, 1fr))`,
        }}
      >
        {range.values.map((value, i) => (
          <span
            key={i}
            data-cell={i}
            className={cx(
              "rounded-[3px]",
              HEAT_LEVELS[heatLevel(value, max)],
              hovered === i && "ring-2 ring-border-focus-ring",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 text-caption-1-regular text-text-tertiary">
        <p className="min-w-0 truncate tabular-nums">
          {hovered === null || hoveredValue === null
            ? `${count.format(total)} runs over ${range.span}`
            : `${range.cellLabel(hovered)} · ${count.format(hoveredValue)} ${hoveredValue === 1 ? "run" : "runs"}`}
        </p>
        <div aria-hidden className="flex shrink-0 items-center gap-1">
          Less
          {HEAT_LEVELS.map((level) => (
            <span key={level} className={cx("size-2.5 rounded-[2px]", level)} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}

const rangeTab = ({ isSelected }: { isSelected: boolean }) =>
  cx(
    "cursor-pointer rounded-lg px-2 py-1 text-body-2-medium",
    "transition-colors duration-150 ease-out motion-reduce:transition-none",
    isSelected ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary",
    focusRing,
  );

export function ActivityHeatmap({ className }: { className?: string }) {
  const [rangeId, setRangeId] = useState<HeatRangeId>("weekly");

  return (
    <Tabs
      selectedKey={rangeId}
      onSelectionChange={(key: Key) => setRangeId(HEAT_RANGES.find((r) => r.id === key)?.id ?? "weekly")}
      className={cx("flex flex-col gap-2", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-body-2-medium text-text-secondary">Activity</p>
        <TabList aria-label="Activity range" className="flex items-center gap-0.5">
          {HEAT_RANGES.map((range) => (
            <Tab key={range.id} id={range.id} className={rangeTab}>
              {range.label}
            </Tab>
          ))}
        </TabList>
      </div>
      {HEAT_RANGES.map((range) => (
        <TabPanel key={range.id} id={range.id} className="outline-none">
          <HeatGrid range={range} />
        </TabPanel>
      ))}
    </Tabs>
  );
}

/* ---------------------------------------------------------- tab panels */

const TOP = 6;

export function AgentsPanel({ month }: { month: AgentMonth }) {
  const [showAll, setShowAll] = useState(false);
  const ranked = month.agents.filter((a) => a.value > 0).sort((a, b) => b.value - a.value);
  const idle = month.agents.length - ranked.length;
  const shown = showAll ? ranked : ranked.slice(0, TOP);
  const max = ranked[0]?.value ?? 1;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-2-regular text-text-tertiary">
        {ranked.length} active agents in {month.label}, {idle} idle. Step the month on the Agents chart below to compare.
      </p>
      <ol className="flex flex-col gap-0.5">
        {shown.map((agent, i) => (
          <li key={agent.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-background-secondary-hover">
            <span className="w-5 text-right text-caption-1-medium text-text-tertiary tabular-nums">{i + 1}</span>
            <Avatar size="sm" color={agent.color} initials={agent.initials ?? agent.name.charAt(0)} />
            <span className="w-20 truncate text-body-2-medium text-text-primary sm:w-28">{agent.name}</span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-background-quaternary-default">
              <span className="block h-full rounded-full bg-status-purple-text/60" style={{ width: `${(agent.value / max) * 100}%` }} />
            </span>
            <span className="w-16 text-right text-caption-1-medium text-text-secondary tabular-nums">{agent.value} runs</span>
          </li>
        ))}
      </ol>
      {ranked.length > TOP && (
        <Button variant="ghost" size="small" className="self-start" onClick={() => setShowAll((v) => !v)}>
          {showAll ? `Show top ${TOP}` : `Show all ${ranked.length}`}
        </Button>
      )}
    </div>
  );
}

export function ImagesPanel({ onDownload }: { onDownload: (item: GalleryItem) => void }) {
  return (
    <ImageGalleryMasonry
      items={GALLERY_ITEMS}
      defaultFavourites={["ape"]}
      onDownload={onDownload}
      columnsClassName="columns-2 sm:columns-3"
    />
  );
}

const EVENT_ICONS: Record<ProfileEvent["kind"], RemixiconComponentType> = {
  agent: RiRobot2Line,
  image: RiImageLine,
  tokens: RiFlashlightLine,
  streak: RiFireLine,
};

const FIRST_EVENTS = 5;

export function ActivityPanel() {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? PROFILE_EVENTS : PROFILE_EVENTS.slice(0, FIRST_EVENTS);
  const hidden = PROFILE_EVENTS.length - FIRST_EVENTS;

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col">
        {shown.map((event, i) => {
          const Icon = EVENT_ICONS[event.kind];
          return (
            <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < shown.length - 1 && <span aria-hidden className="absolute top-9 bottom-1 left-4 w-px bg-background-quaternary-default" />}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background-quaternary-default text-foreground-icon-secondary">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-body-2-medium text-text-primary">{event.title}</p>
                <p className="text-caption-1-regular text-text-tertiary">{event.meta}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {hidden > 0 && (
        <Button variant="ghost" size="small" className="self-start" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show ${hidden} older`}
        </Button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- workspace */

export function WorkspacePage({
  view,
  unread,
  onMarkRead,
  onBack,
}: {
  view: Exclude<ProfileView, "profile">;
  unread: number;
  onMarkRead: () => void;
  onBack: () => void;
}) {
  const page = WORKSPACE_PAGES[view];
  const Icon = PROFILE_NAV.find((entry) => entry.id === view)?.icon;
  const isHome = view === "home";

  return (
    <section
      aria-labelledby="ai-profile-page-title"
      className="flex flex-col gap-4 rounded-2xl border border-border-ai-profile-card bg-background-primary-default p-5"
    >
      <header className="flex flex-wrap items-start gap-3">
        {Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background-quaternary-default text-foreground-icon-secondary">
            <Icon className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-[160px] flex-1">
          <h2 id="ai-profile-page-title" className="text-title-3-medium text-text-primary">
            {page.title}
          </h2>
          <p className="text-body-2-regular text-text-tertiary">
            {isHome ? (unread > 0 ? `${unread} unread updates across your workspace.` : "You’re all caught up.") : page.blurb}
          </p>
        </div>
        {isHome && unread > 0 && (
          <Button variant="secondary" size="small" leadingIcon={RiCheckDoubleLine} onClick={onMarkRead}>
            Mark all read
          </Button>
        )}
        <Button variant="ghost" size="small" leadingIcon={RiUserSmileLine} onClick={onBack}>
          Back to profile
        </Button>
      </header>
      <ul className="flex flex-col gap-1">
        {page.rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 rounded-xl bg-background-secondary-default px-3 py-2.5">
            {isHome && (
              <span
                aria-hidden
                className={cx("size-2 shrink-0 rounded-full", unread > 0 ? "bg-button-primary" : "bg-background-quaternary-default")}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-2-medium text-text-primary">{row.title}</p>
              <p className="truncate text-caption-1-regular text-text-tertiary">{row.meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------- edit profile */

const COVERS: { id: ProfileCoverTone; label: string }[] = [
  { id: "sky", label: "Sky" },
  { id: "dusk", label: "Dusk" },
  { id: "aurora", label: "Aurora" },
];

const HANDLE = /^[a-z0-9_.]{2,24}$/i;

export function EditProfileForm({
  profile,
  onCancel,
  onSave,
}: {
  profile: ProfileDraft;
  onCancel: () => void;
  onSave: (next: ProfileDraft) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [coverTone, setCoverTone] = useState<ProfileCoverTone>(profile.coverTone);
  const cleanHandle = handle.trim().replace(/^@/, "");
  const nameOk = name.trim().length > 0;
  const handleOk = HANDLE.test(cleanHandle);

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        if (!nameOk || !handleOk) return;
        onSave({ name: name.trim(), handle: cleanHandle, bio: bio.trim(), coverTone });
      }}
    >
      <ModalHeader icon={RiEditLine} title="Edit profile" description="Changes show on your profile card right away." />
      <ModalBody className="flex flex-col gap-4">
        <Input label="Name" value={name} onChange={setName} isRequired isInvalid={!nameOk} errorMessage="Enter a name." autoFocus />
        <Input
          label="Handle"
          value={handle}
          onChange={setHandle}
          isRequired
          isInvalid={!handleOk}
          hint="2–24 letters, numbers, dots or underscores."
          errorMessage="2–24 letters, numbers, dots or underscores."
        />
        <Textarea label="Bio" value={bio} onChange={setBio} rows={3} maxLength={160} showCount placeholder="What are your agents working on?" />
        <div className="flex flex-col gap-1.5">
          <p className="text-body-2-medium text-text-primary">Cover</p>
          <SegmentedControl
            aria-label="Cover"
            selectedKeys={[coverTone]}
            onSelectionChange={(keys) => {
              const next = COVERS.find((c) => keys.has(c.id));
              if (next) setCoverTone(next.id);
            }}
          >
            {COVERS.map((cover) => (
              <SegmentedControlItem key={cover.id} id={cover.id}>
                {cover.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </ModalFooter>
    </form>
  );
}
