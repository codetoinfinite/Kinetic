'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Template Showcase Tabs" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ReactNode } from "react";
import {
  RiEmotionHappyLine,
  RiExternalLinkLine,
  RiImageAiLine,
  RiKanbanView,
  RiMegaphoneLine,
  RiPieChartLine,
  RiRobot2Line,
  RiStethoscopeLine,
  RiVipCrownLine,
} from "@remixicon/react";
import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { Chip } from "@/registry/ui/chip";
import { TemplateShowcase, TemplateShowcaseTabs } from "@/registry/ui/template-showcase-tabs";
import type { TemplateShowcaseItem } from "@/registry/ui/template-showcase-tabs";

/* ---------- miniature building blocks ---------- */

function Line({ w, className }: { w: string; className?: string }) {
  return <span className={`block h-1.5 rounded-full bg-background-tertiary-default ${className ?? ""}`} style={{ width: w }} />;
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border-button-default bg-background-primary-default p-3 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Shell({ nav, active, children, aside }: { nav: string[]; active: number; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex h-full gap-3 p-3">
      <div className="hidden w-44 shrink-0 flex-col gap-1 rounded-xl border border-border-button-default bg-background-primary-default p-2 @2xl/preview:flex">
        <div className="mb-2 flex items-center gap-2 px-1 py-1">
          <Avatar size="xs" color="neutral" initials="M" />
          <span className="text-caption-1-medium text-text-primary">Mertcan E.</span>
        </div>
        {nav.map((item, i) => (
          <span
            key={item}
            className={`rounded-lg px-2 py-1.5 text-caption-1-medium ${i === active ? "bg-accent-500 text-text-white" : "text-text-secondary"}`}
          >
            {item}
          </span>
        ))}
        <div className="mt-auto flex flex-col gap-1.5 px-2 pb-1">
          <Line w="70%" />
          <Line w="45%" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
      {aside ? <div className="hidden w-56 shrink-0 flex-col gap-3 @4xl/preview:flex">{aside}</div> : null}
    </div>
  );
}

/* ---------- seven template previews ---------- */

function ChatPreview() {
  return (
    <Shell
      nav={["New chat", "Projects", "Agents", "History"]}
      active={0}
      aside={
        <Card className="flex flex-1 flex-col gap-2">
          <span className="text-caption-1-medium text-text-primary">Changes</span>
          <span className="text-caption-2-regular text-text-tertiary">
            12 uncommitted · <span className="text-chart-7">+156</span> <span className="text-text-destructive">−23</span>
          </span>
          {["hero.tsx", "tokens.css", "chart.tsx", "layout.tsx"].map((file, i) => (
            <div key={file} className="flex items-center justify-between rounded-lg bg-background-secondary-default px-2 py-1.5">
              <span className="font-mono text-caption-2-regular text-text-secondary">{file}</span>
              <span className="text-caption-2-medium text-chart-7">+{(i + 2) * 7}</span>
            </div>
          ))}
        </Card>
      }
    >
      <Card className="flex flex-1 flex-col gap-3">
        <div className="ms-auto max-w-[70%] rounded-2xl rounded-br-md bg-accent-500 px-3 py-2 text-caption-1-regular text-text-white">
          Add a dark mode toggle to the settings page
        </div>
        <div className="flex max-w-[80%] flex-col gap-1.5 rounded-2xl rounded-bl-md bg-background-secondary-default px-3 py-2.5">
          <Line w="90%" />
          <Line w="75%" />
          <Line w="55%" />
        </div>
        <div className="flex max-w-[60%] items-center gap-2 rounded-xl border border-border-button-default px-3 py-2">
          <span className="size-2 rounded-full bg-chart-7" />
          <span className="text-caption-2-medium text-text-secondary">Ran 3 tools · 4.2s</span>
        </div>
        <div className="mt-auto flex items-center gap-2 rounded-2xl border border-border-button-default px-3 py-2.5">
          <span className="text-caption-1-regular text-text-placeholder">Ask me anything</span>
          <span className="ms-auto size-6 rounded-full bg-accent-500" />
        </div>
      </Card>
    </Shell>
  );
}

const TILES = [
  "from-chart-1 to-chart-6",
  "from-chart-3 to-chart-5",
  "from-chart-8 to-chart-3",
  "from-chart-4 to-chart-9",
  "from-chart-2 to-chart-7",
  "from-chart-5 to-chart-4",
];

function ImagePreview() {
  return (
    <Shell nav={["Create", "Gallery", "Styles", "Favorites"]} active={0}>
      <Card className="flex items-center gap-2 py-2.5">
        <span className="text-caption-1-regular text-text-secondary">A glass orb over a calm sea at dawn</span>
        <span className="ms-auto rounded-lg bg-accent-500 px-2 py-1 text-caption-2-medium text-text-white">Generate</span>
      </Card>
      <div className="grid flex-1 grid-cols-2 gap-3 @xl/preview:grid-cols-3">
        {TILES.map((tile, i) => (
          <div key={tile} className={`relative overflow-hidden rounded-xl bg-linear-to-br ${tile}`}>
            <span className="absolute top-1/4 left-1/3 size-1/3 rounded-full bg-background-primary-default opacity-40 blur-md" />
            {i === 0 ? (
              <span className="absolute bottom-2 left-2 rounded-md bg-background-primary-default px-1.5 py-0.5 text-caption-2-medium text-text-primary">
                1024 × 1024
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </Shell>
  );
}

const COLUMNS = [
  { title: "Backlog", cards: [["Audit tokens", "gray"], ["Pricing copy", "yellow"]] },
  { title: "In progress", cards: [["Chart legend", "blue"], ["Mobile nav", "purple"], ["Empty states", "gray"]] },
  { title: "Review", cards: [["Date picker", "lime"]] },
  { title: "Done", cards: [["Avatar group", "cyan"], ["Toasts", "rose"]] },
] as const;

function BoardPreview() {
  return (
    <Shell nav={["Overview", "Board", "Timeline", "Files"]} active={1}>
      <div className="grid flex-1 grid-cols-2 gap-3 @3xl/preview:grid-cols-4">
        {COLUMNS.map((col, c) => (
          <div key={col.title} className={`flex flex-col gap-2 rounded-xl bg-background-tertiary-default p-2 ${c > 1 ? "hidden @3xl/preview:flex" : ""}`}>
            <span className="px-1 text-caption-1-medium text-text-secondary">
              {col.title} <span className="text-text-tertiary">{col.cards.length}</span>
            </span>
            {col.cards.map(([name, color]) => (
              <Card key={name} className="flex flex-col gap-2 p-2.5">
                <span className="text-caption-1-medium text-text-primary">{name}</span>
                <Line w="80%" />
                <div className="flex items-center justify-between">
                  <Chip variant="subtle" color={color}>
                    {color === "gray" ? "Later" : "Design"}
                  </Chip>
                  <Avatar size="xs" color="blue" initials={name.slice(0, 1)} />
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </Shell>
  );
}

const SPEND = [38, 52, 44, 61, 58, 72, 66, 80, 74, 88, 82, 94];

function MarketingPreview() {
  return (
    <Shell nav={["Dashboard", "Campaigns", "Audience", "Reports"]} active={0}>
      <div className="grid grid-cols-2 gap-3 @3xl/preview:grid-cols-4">
        {[
          ["Spend", "$48.2k", "+12%"],
          ["Clicks", "312k", "+8.4%"],
          ["CTR", "3.9%", "+0.6"],
          ["ROAS", "4.1×", "+0.3"],
        ].map(([label, value, delta], i) => (
          <Card key={label} className={`flex flex-col gap-0.5 ${i > 1 ? "hidden @3xl/preview:flex" : ""}`}>
            <span className="text-caption-2-regular text-text-tertiary">{label}</span>
            <span className="text-title-3-semibold text-text-primary">{value}</span>
            <span className="text-caption-2-medium text-chart-7">{delta}</span>
          </Card>
        ))}
      </div>
      <Card className="flex flex-1 flex-col gap-3">
        <span className="text-caption-1-medium text-text-primary">Spend by week</span>
        <div className="flex flex-1 items-end gap-1.5">
          {SPEND.map((v, i) => (
            <span key={i} className="flex-1 rounded-t-md bg-chart-6" style={{ height: `${v}%`, opacity: 0.45 + i * 0.045 }} />
          ))}
        </div>
      </Card>
    </Shell>
  );
}

const HEAT = Array.from({ length: 7 * 20 }, (_, i) => ((i * 37 + (i % 7) * 11) % 9) / 8);

function ProfilePreview() {
  return (
    <Shell nav={["Profile", "Repositories", "Stars", "Settings"]} active={0}>
      <Card className="flex items-center gap-3">
        <Avatar size="lg" color="pink" initials="AR" />
        <div className="flex min-w-0 flex-col">
          <span className="text-body-semibold text-text-primary">Ana Ruiz</span>
          <span className="text-caption-1-regular text-text-tertiary">Design engineer · 1,204 contributions</span>
        </div>
        <span className="ms-auto hidden rounded-lg border border-border-button-default px-2 py-1 text-caption-2-medium text-text-secondary @xl/preview:block">
          Follow
        </span>
      </Card>
      <Card className="flex flex-col gap-2">
        <span className="text-caption-1-medium text-text-primary">Contributions</span>
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-hidden">
          {HEAT.map((level, i) => (
            <span key={i} className="aspect-square w-full rounded-[3px] bg-chart-7" style={{ opacity: 0.12 + level * 0.88 }} />
          ))}
        </div>
      </Card>
      <div className="grid flex-1 grid-cols-2 gap-3">
        {["kinetic-ui", "tokens"].map((repo) => (
          <Card key={repo} className="flex flex-col gap-2">
            <span className="text-caption-1-medium text-accent-500">{repo}</span>
            <Line w="85%" />
            <Line w="60%" />
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function HealthPreview() {
  return (
    <Shell
      nav={["Patients", "Schedule", "Messages", "Billing"]}
      active={0}
      aside={
        <Card className="flex flex-col items-center gap-2">
          <span className="self-start text-caption-1-medium text-text-primary">Sleep score</span>
          <svg viewBox="0 0 100 100" className="size-28 -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10" className="stroke-chart-track" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray="210 251" className="stroke-chart-5" />
          </svg>
          <span className="text-title-3-semibold text-text-primary">84</span>
        </Card>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Heart rate", "72", "bpm"],
          ["Blood O₂", "98", "%"],
          ["Temp", "36.8", "°C"],
        ].map(([label, value, unit]) => (
          <Card key={label} className="flex flex-col gap-0.5">
            <span className="truncate text-caption-2-regular text-text-tertiary">{label}</span>
            <span className="text-title-3-semibold text-text-primary">
              {value} <span className="text-caption-2-regular text-text-tertiary">{unit}</span>
            </span>
          </Card>
        ))}
      </div>
      <Card className="flex flex-1 flex-col gap-1">
        {[
          ["John Clarkson", "Checkup", "lime"],
          ["Ana Ruiz", "Lab results", "yellow"],
          ["Lee Park", "Follow-up", "blue"],
          ["Sara Holm", "Checkup", "lime"],
        ].map(([name, kind, color]) => (
          <div key={name} className="flex items-center gap-2 border-b border-separator-border py-2 last:border-b-0">
            <Avatar size="xs" color="neutral" initials={(name ?? "").slice(0, 1)} />
            <span className="text-caption-1-medium text-text-primary">{name}</span>
            <span className="ms-auto">
              <Chip variant="subtle" color={color as "lime" | "yellow" | "blue"}>
                {kind}
              </Chip>
            </span>
          </div>
        ))}
      </Card>
    </Shell>
  );
}

function AnalyticsPreview() {
  return (
    <Shell nav={["Overview", "Funnels", "Retention", "Events"]} active={0}>
      <Card className="flex flex-1 flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-caption-1-medium text-text-secondary">Tokens</span>
          <span className="text-title-3-semibold text-text-primary">667.7M</span>
          <span className="text-caption-2-medium text-chart-7">+9.4%</span>
        </div>
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="w-full flex-1" aria-hidden="true">
          <path d="M0 80 L30 72 L60 76 L90 58 L120 62 L150 44 L180 50 L210 34 L240 40 L270 22 L300 26 L300 100 L0 100 Z" className="fill-chart-5 opacity-15" />
          <path d="M0 80 L30 72 L60 76 L90 58 L120 62 L150 44 L180 50 L210 34 L240 40 L270 22 L300 26" fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" className="stroke-chart-5" />
        </svg>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Sessions", 72, "bg-chart-1"],
          ["Retention", 46, "bg-chart-3"],
        ].map(([label, pct, tone]) => (
          <Card key={label as string} className="flex flex-col gap-2">
            <span className="text-caption-1-medium text-text-secondary">{label}</span>
            <span className="text-title-3-semibold text-text-primary">{pct}%</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-chart-track">
              <span className={`block h-full rounded-full ${tone as string}`} style={{ width: `${pct as number}%` }} />
            </span>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

const ITEMS: TemplateShowcaseItem[] = [
  { id: "chat", label: "Agentic chat", icon: RiRobot2Line, preview: <ChatPreview /> },
  { id: "image", label: "Image generation", icon: RiImageAiLine, preview: <ImagePreview /> },
  { id: "board", label: "Project board", icon: RiKanbanView, preview: <BoardPreview /> },
  { id: "marketing", label: "Marketing", icon: RiMegaphoneLine, preview: <MarketingPreview /> },
  { id: "profile", label: "Contributor profile", icon: RiEmotionHappyLine, preview: <ProfilePreview /> },
  { id: "health", label: "Healthcare", icon: RiStethoscopeLine, preview: <HealthPreview /> },
  { id: "analytics", label: "Analytics", icon: RiPieChartLine, preview: <AnalyticsPreview /> },
];

export default function Demo() {
  return (
    <div className="h-full w-full overflow-y-auto bg-background-full">
      <div className="pt-16 pb-16">
        <TemplateShowcase
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 text-body-medium text-text-primary shadow-xs">
              <RiVipCrownLine className="size-4 text-foreground-icon-secondary" aria-hidden="true" />
              Included with Pro
            </span>
          }
          title="Ready-to-go templates across every domain"
          description="Looking for an agentic chat, a marketing dashboard, or a healthcare interface? It's already here."
          actions={<Button variant="primary">Browse all templates</Button>}
        >
          <TemplateShowcaseTabs
            items={ITEMS}
            aria-label="Template previews"
            action={(item) => (
              <Button
                variant="secondary"
                size="small"
                leadingIcon={RiExternalLinkLine}
                aria-label={`Live preview of ${item.label}`}
              >
                Live preview
              </Button>
            )}
          />
        </TemplateShowcase>
      </div>
    </div>
  );
}
