/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Profile" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useState } from "react";
import type { Key } from "react-aria-components";
import {
  RiEditLine,
  RiFlashlightLine,
  RiImageLine,
  RiLayoutGridLine,
  RiMenuLine,
  RiPulseLine,
  RiRobot2Line,
  RiSettings4Line,
  RiShareLine,
  RiSideBarLine,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { AgentsBarCard } from "@/registry/ui/agents-bar-card";
import { CommandPalette, CommandPaletteItem, CommandPaletteSection } from "@/registry/ui/command-palette";
import type { GalleryItem } from "@/registry/ui/image-gallery-masonry";
import { Modal } from "@/registry/ui/modal";
import { ProfileCoverHeader, type ProfileTab } from "@/registry/ui/profile-cover-header";
import { ProfileStatTiles } from "@/registry/ui/profile-stat-tiles";
import { SettingsModal } from "@/registry/ui/settings-modal";
import { Toaster, toast } from "@/registry/ui/toast";
import { TokensChartCard } from "@/registry/ui/tokens-chart-card";
import { HintIcon, ProfileSidebar } from "@/registry/ui/ai-profile-sidebar";
import {
  ActivityHeatmap,
  ActivityPanel,
  AgentsPanel,
  EditProfileForm,
  ImagesPanel,
  WorkspacePage,
} from "@/registry/ui/ai-profile-views";
import {
  AGENT_MONTHS,
  MONTH_SPAN,
  PROFILE_NAV,
  PROFILE_TEAMS,
  PROFILE_TILES,
  SEED_PROFILE,
  TOKEN_PERIODS,
  type ProfileDraft,
  type ProfileView,
} from "@/registry/ui/ai-profile-data";

export interface AiProfileProps {
  /** View selected on first render. */
  defaultView?: ProfileView;
  /** Month the Agents chart and tab open on: "oct", "nov" or "dec". */
  defaultMonth?: string;
  className?: string;
}

type ProfileTabId = "overview" | "agents" | "images" | "activity";

const TAB_IDS: ProfileTabId[] = ["overview", "agents", "images", "activity"];
const count = new Intl.NumberFormat("en-US");
const tokens = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function AiProfile({ defaultView = "profile", defaultMonth = "dec", className }: AiProfileProps) {
  const [view, setView] = useState<ProfileView>(defaultView);
  const [tab, setTab] = useState<ProfileTabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileDraft>(SEED_PROFILE);
  const [monthId, setMonthId] = useState(defaultMonth);
  const [periodId, setPeriodId] = useState("30d");
  const [tileId, setTileId] = useState<string | null>(null);
  const [unread, setUnread] = useState(152);
  const [teamId, setTeamId] = useState("board");

  // #region critical
  // The month is shared: the Agents chart steps it and the Agents tab and its
  // count read it, so both always describe the same month.
  const month = AGENT_MONTHS.find((m) => m.id === monthId) ?? AGENT_MONTHS[AGENT_MONTHS.length - 1]!;
  const activeAgents = month.agents.filter((a) => a.value > 0).length;
  const span = MONTH_SPAN[month.id] ?? ["", ""];
  const tile = PROFILE_TILES.find((t) => t.id === tileId);

  const go = (next: ProfileView, nextTab?: ProfileTabId) => {
    setView(next);
    if (nextTab) setTab(nextTab);
    setDrawer(false);
  };
  // #endregion

  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const share = () => {
    navigator.clipboard?.writeText(`board.example/@${profile.handle}`).catch(() => undefined);
    toast("Profile link copied", { status: "success", description: `board.example/@${profile.handle}` });
  };

  const download = (item: GalleryItem) => {
    toast(`Downloading “${item.title}”`, { status: "information", description: "Saved locally in this demo." });
  };

  const onPalette = (key: Key) => {
    const id = String(key);
    setSearchOpen(false);
    if (id.startsWith("view:")) {
      const next = PROFILE_NAV.find((entry) => `view:${entry.id}` === id);
      if (next) go(next.id);
      return;
    }
    if (id === "edit") setEditOpen(true);
    else if (id === "share") share();
    else if (id === "settings") setSettingsOpen(true);
    else {
      const nextTab = TAB_IDS.find((t) => t === id);
      if (nextTab) go("profile", nextTab);
    }
  };

  const tabs: ProfileTab[] = [
    { id: "overview", label: "Overview", icon: RiLayoutGridLine },
    { id: "agents", label: "Agents", count: activeAgents, icon: RiRobot2Line },
    { id: "images", label: "Images", count: 12, icon: RiImageLine },
    { id: "activity", label: "Activity", icon: RiPulseLine },
  ];

  const renderPanel = (id: string) => {
    if (id === "agents") return <AgentsPanel month={month} />;
    if (id === "images") return <ImagesPanel onDownload={download} />;
    if (id === "activity") return <ActivityPanel />;
    return (
      <div className="flex flex-col gap-4">
        <ProfileStatTiles
          label="Contributions this year"
          value={7462}
          formatValue={(n) => count.format(n)}
          trend={14.8}
          tiles={PROFILE_TILES.map(({ id: tileKey, label, value }) => ({ id: tileKey, label, value }))}
          selectedId={tileId}
          onSelectionChange={setTileId}
          tilesLabel="Lifetime stats"
        />
        <p aria-live="polite" className="text-caption-1-regular text-text-tertiary">
          {tile ? `${tile.label}: ${tile.detail}` : "Select a stat to see where it came from."}
        </p>
        <ActivityHeatmap />
      </div>
    );
  };

  const navTitle = PROFILE_NAV.find((entry) => entry.id === view)?.label ?? "Profile";

  return (
    <div className={cx("relative flex h-full w-full gap-3 overflow-hidden bg-background-primary-default p-3", className)}>
      {drawer && (
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => setDrawer(false)}
          className="absolute inset-0 z-20 bg-black/30 lg:hidden"
        />
      )}
      <div
        className={cx(
          "hidden shrink-0",
          sidebarOpen && "lg:block",
          drawer && "max-lg:absolute max-lg:inset-y-3 max-lg:left-3 max-lg:z-30 max-lg:block",
        )}
      >
        <ProfileSidebar
          view={view}
          onView={(next) => go(next)}
          unread={unread}
          name={profile.name}
          teamId={teamId}
          onTeam={(id) => {
            setTeamId(id);
            const team = PROFILE_TEAMS.find((t) => t.id === id);
            if (team) toast(`Switched to ${team.name}`, { status: "neutral" });
          }}
          onEditProfile={() => {
            setDrawer(false);
            setEditOpen(true);
          }}
          onSearch={() => {
            setDrawer(false);
            setSearchOpen(true);
          }}
          onSettings={() => {
            setDrawer(false);
            setSettingsOpen(true);
          }}
          onSupport={() => toast("Support is on its way", { status: "information", description: "A teammate replies within a day." })}
          onCollapse={() => {
            if (drawer) setDrawer(false);
            else setSidebarOpen(false);
          }}
        />
      </div>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className={cx("mb-3 flex items-center gap-2", sidebarOpen && "lg:hidden")}>
          <HintIcon icon={RiMenuLine} label="Open menu" onPress={() => setDrawer(true)} className="lg:hidden" />
          {!sidebarOpen && (
            <HintIcon icon={RiSideBarLine} label="Show sidebar" onPress={() => setSidebarOpen(true)} className="max-lg:hidden" />
          )}
          <p className="truncate text-body-medium text-text-primary">{navTitle}</p>
        </div>

        {view === "profile" ? (
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 pb-3">
            <ProfileCoverHeader
              name={profile.name}
              handle={`@${profile.handle}`}
              initials={profile.name.trim().charAt(0).toUpperCase() || "M"}
              badges={[{ label: "PRO", tone: "purple" }]}
              bio={profile.bio || "Runs a small fleet of agents for code, research and image work."}
              stats={[
                { label: "agents", value: activeAgents },
                { label: "tokens this month", value: tokens.format(month.agents.reduce((s, a) => s + a.value, 0) * 41_000) },
              ]}
              coverTone={profile.coverTone}
              isOwner
              onShare={share}
              onEdit={() => setEditOpen(true)}
              tabs={tabs}
              selectedTab={tab}
              onTabChange={(id) => setTab(TAB_IDS.find((t) => t === id) ?? "overview")}
              renderPanel={renderPanel}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <AgentsBarCard
                months={AGENT_MONTHS}
                month={month.id}
                onMonthChange={setMonthId}
                unit="runs"
                startLabel={span[0]}
                endLabel={span[1]}
              />
              <TokensChartCard
                periods={TOKEN_PERIODS}
                period={periodId}
                onPeriodChange={setPeriodId}
                unit="tokens"
                endLabel="Today"
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[720px] pb-3">
            <WorkspacePage view={view} unread={unread} onMarkRead={() => setUnread(0)} onBack={() => go("profile")} />
          </div>
        )}
      </main>

      <Modal isOpen={editOpen} onOpenChange={setEditOpen} size="sm">
        <EditProfileForm
          profile={profile}
          onCancel={() => setEditOpen(false)}
          onSave={(next) => {
            setProfile(next);
            setEditOpen(false);
            toast("Profile updated", { status: "success" });
          }}
        />
      </Modal>

      <CommandPalette
        isOpen={searchOpen}
        onOpenChange={setSearchOpen}
        shortcut="l"
        aria-label="Quick search"
        placeholder="Search pages and actions…"
        onAction={onPalette}
      >
        <CommandPaletteSection title="Go to">
          {PROFILE_NAV.map((entry) => (
            <CommandPaletteItem key={entry.id} id={`view:${entry.id}`} icon={entry.icon}>
              {entry.label}
            </CommandPaletteItem>
          ))}
        </CommandPaletteSection>
        <CommandPaletteSection title="Profile">
          <CommandPaletteItem id="edit" icon={RiEditLine}>Edit profile</CommandPaletteItem>
          <CommandPaletteItem id="share" icon={RiShareLine}>Copy profile link</CommandPaletteItem>
          <CommandPaletteItem id="agents" icon={RiRobot2Line}>Show agents</CommandPaletteItem>
          <CommandPaletteItem id="images" icon={RiImageLine}>Show images</CommandPaletteItem>
          <CommandPaletteItem id="activity" icon={RiFlashlightLine}>Show activity</CommandPaletteItem>
          <CommandPaletteItem id="settings" icon={RiSettings4Line}>Settings</CommandPaletteItem>
        </CommandPaletteSection>
      </CommandPalette>
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toaster />
    </div>
  );
}
