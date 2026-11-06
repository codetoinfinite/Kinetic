'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Feature Card Grid" (boardui.com/).
 * No BoardUI source was used.
 */
import {
  RiAddLine,
  RiArrowDownCircleLine,
  RiBox3Line,
  RiCheckLine,
  RiFileTextLine,
  RiGlobalLine,
  RiHome5Line,
  RiKanbanView,
  RiLoader4Line,
  RiSearchLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import { Avatar } from "@/registry/ui/avatar";
import { Badge } from "@/registry/ui/badge";
import { Button } from "@/registry/ui/button";
import { Checkbox } from "@/registry/ui/checkbox";
import { Chip } from "@/registry/ui/chip";
import { IconButton } from "@/registry/ui/icon-button";
import { Kbd } from "@/registry/ui/kbd";
import { ProgressTrack } from "@/registry/ui/progress";
import { Switch } from "@/registry/ui/switch";
import { FeatureCard, FeatureCardGrid } from "@/registry/ui/feature-card-grid";

const panel = "rounded-2xl border border-border-button-default bg-background-primary-default shadow-xs";

function Composer({ active }: { active: boolean }) {
  return (
    <div className="flex h-full items-end px-5 pt-5">
      <div className={`${panel} w-full p-3`}>
        <div className="flex gap-2">
          {["brief.pdf", "notes.md"].map((name, i) => (
            <div key={name} className="flex w-24 flex-col gap-2 rounded-xl border border-border-button-default bg-background-secondary-default p-2">
              <RiFileTextLine aria-hidden className="size-4 text-foreground-icon-secondary" />
              <span className="truncate text-caption-2-medium text-text-secondary">{name}</span>
              <ProgressTrack size="sm" percentage={i === 0 || active ? 100 : 38} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-body-regular text-text-placeholder">Hi, what do you need today?</p>
        <div className="mt-3 flex items-center gap-2">
          <IconButton icon={RiAddLine} size="small" aria-label="Attach" className="rounded-full" />
          <Chip color="soft" className="gap-1 py-0.5 text-caption-1-medium">
            <RiShieldCheckLine aria-hidden className="size-3.5" /> Bypass all
          </Chip>
        </div>
      </div>
    </div>
  );
}

function WebSearch({ active }: { active: boolean }) {
  const rows = ["What teams pay for a component kit", "Searched docs for pricing tiers", "Searched forums for react aria"];
  return (
    <div className="flex h-full flex-col gap-2.5 px-5 pt-6">
      <span className="flex items-center gap-2 text-body-medium text-text-secondary">
        <RiSearchLine aria-hidden className="size-4 text-foreground-icon-secondary" /> Ran {active ? 4 : 3} searches
      </span>
      <div className="ms-2 flex flex-col gap-2.5 border-s border-separator-border ps-3">
        {[...rows, ...(active ? ["Opened 6 sources"] : [])].map((row) => (
          <span key={row} className="flex items-center gap-2 truncate text-body-regular text-text-secondary">
            <RiGlobalLine aria-hidden className="size-4 shrink-0 text-foreground-icon-tertiary" />
            {row}
          </span>
        ))}
      </div>
      <span className="flex items-center gap-2 text-body-regular text-text-tertiary">
        <RiLoader4Line aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> Working
        <span className="font-mono text-caption-1-regular">1.7s</span>
      </span>
    </div>
  );
}

function AgentLimits({ active }: { active: boolean }) {
  const rows = [
    { label: "5-hour limit", note: "Resets in 2 hr 46 min", value: active ? 64 : 38 },
    { label: "Weekly · all models", note: "Resets Tue 3:00 PM", value: active ? 9 : 3 },
  ];
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <div className={`${panel} flex flex-col gap-3 p-3`}>
        <div className="flex items-center justify-between text-caption-1-medium text-text-secondary">
          <span>Context window</span>
          <span>{active ? "910k" : "820k"} / 1M</span>
        </div>
        <ProgressTrack size="sm" percentage={active ? 91 : 82} />
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-caption-2-medium">
              <span className="shrink-0 whitespace-nowrap text-text-primary">{row.label}</span>
              <span className="truncate text-text-tertiary">{row.note}</span>
              <span className="text-text-primary">{row.value}%</span>
            </div>
            <ProgressTrack size="sm" percentage={row.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTable({ active }: { active: boolean }) {
  const people = [
    { name: "John Clarkson", initials: "JC", color: "blue" as const, status: "Paid" },
    { name: "Ana Ruiz", initials: "AR", color: "pink" as const, status: "Pending" },
  ];
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <div className={`${panel} flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="flex flex-col text-caption-1-regular text-text-tertiary">
            Total results <span className="text-body-medium text-text-primary">48 customers</span>
          </span>
          <Chip color="gray" className="py-0.5 text-caption-1-medium">All</Chip>
        </div>
        <div className="flex items-center gap-2 border-y border-separator-border bg-background-secondary-default px-3 py-2 text-caption-1-medium text-text-secondary">
          <Checkbox size="sm" aria-label="Select all" isSelected={active} isIndeterminate={!active} isReadOnly /> Customer name
        </div>
        {people.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2 px-3 py-2 text-body-2-medium text-text-primary">
            <Checkbox size="sm" aria-label={`Select ${p.name}`} isSelected={active || i === 0} isReadOnly />
            <Avatar size="xs" initials={p.initials} color={p.color} />
            <span className="flex-1 truncate">{p.name}</span>
            <Chip color={i === 0 ? "lime" : "yellow"} className="py-0.5 text-caption-2-medium">{p.status}</Chip>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ active }: { active: boolean }) {
  return (
    <div className="flex h-full flex-col px-5 pt-4">
      <div className="flex flex-col gap-2 rounded-2xl bg-background-secondary-default p-2.5">
        <div className="flex items-center gap-2 px-1">
          <Avatar size="xs" initials="M" />
          <span className="text-body-medium text-text-primary">Mertcan Esmergul</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-background-primary-default px-2.5 py-2 text-body-regular text-text-tertiary shadow-xs">
          <RiSearchLine aria-hidden className="size-4" /> Quick Search <Kbd className="ms-auto">⌘L</Kbd>
        </div>
        {[
          { label: "Home", icon: RiHome5Line, count: 152 },
          { label: "Project board", icon: RiKanbanView, count: 12 },
        ].map((row, i) => {
          const selected = active ? i === 1 : i === 0;
          return (
            <div
              key={row.label}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-body-medium transition-colors duration-200 ${
                selected ? "bg-accent-500 text-text-white" : "text-text-secondary"
              }`}
            >
              <row.icon aria-hidden className="size-4" />
              <span className="flex-1">{row.label}</span>
              <Badge color={selected ? "primary" : "neutral"}>{row.count}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentProgress({ active }: { active: boolean }) {
  const steps = ["Read project files", "Update light mode tokens", "Implement dark mode tokens", "Add a theme toggle"];
  const done = active ? 2 : 1;
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <div className={`${panel} flex flex-col gap-2 p-3`}>
        <span className="text-caption-1-medium text-text-secondary">{steps.length + 1 - done} steps left</span>
        {steps.map((step, i) => {
          const complete = i < done;
          const current = i === done;
          return (
            <div
              key={step}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-caption-1-medium ${
                current ? "border border-border-button-default text-text-primary" : complete ? "text-text-tertiary line-through" : "text-text-tertiary"
              }`}
            >
              <span
                className={`grid size-4 shrink-0 place-items-center rounded-full ${
                  complete ? "bg-accent-500 text-text-white" : "border border-border-button-hover"
                }`}
              >
                {complete ? <RiCheckLine aria-hidden className="size-3" /> : null}
              </span>
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Settings({ active }: { active: boolean }) {
  const rows = [
    { label: "Email digests", on: true },
    { label: "Mentions", on: active },
    { label: "Weekly report", on: false },
  ];
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <div className={`${panel} flex flex-col divide-y divide-separator-border`}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-3 py-3">
            <span className="text-body-medium text-text-primary">{row.label}</span>
            <Switch size="sm" aria-label={row.label} isSelected={row.on} isReadOnly />
          </div>
        ))}
      </div>
    </div>
  );
}

const EVENTS: Record<number, string> = { 3: "bg-calendar-event-blue-background", 9: "bg-calendar-event-pink-background", 12: "bg-calendar-event-lime-background", 17: "bg-calendar-event-purple-background" };

function Calendar({ active }: { active: boolean }) {
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <div className={`${panel} p-3`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-caption-1-semibold text-text-primary">August 2026</span>
          <Chip color="blue" className="py-0.5 text-caption-2-medium">+ New event</Chip>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }, (_, i) => {
            const event = EVENTS[i];
            const today = active ? i === 12 : i === 10;
            return (
              <div
                key={i}
                className={`flex h-9 flex-col gap-0.5 rounded-md p-1 text-caption-2-medium transition-colors duration-200 ${
                  today ? "bg-accent-500 text-text-white" : "bg-background-secondary-default text-text-secondary"
                }`}
              >
                {i + 1}
                {event ? <span className={`h-1 rounded-full ${event}`} /> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CARDS = [
  { title: "Composer attachments", description: "File tiles landing one by one above the prompt, each with its upload progress.", Art: Composer },
  { title: "Web search", description: "The searches an agent ran and the sources it opened, streaming in.", Art: WebSearch },
  { title: "Agent limits", description: "Context window usage with a token breakdown and plan limits.", Art: AgentLimits },
  { title: "Data table", description: "Filter, sort and paginate complex data in a responsive table.", Art: DataTable },
  { title: "Sidebar", description: "Navigation with search, badges and account controls.", Art: Sidebar },
  { title: "Agent progress", description: "Live multi-step progress and completion states.", Art: AgentProgress },
  { title: "Notification settings", description: "Switch rows that save as you flip them.", Art: Settings },
  { title: "Calendar", description: "Month calendar with events and scheduling controls.", Art: Calendar },
];

export default function Demo() {
  return (
    <div className="h-full w-full overflow-y-auto bg-background-full">
      <div className="pt-20 pb-16">
        <FeatureCardGrid
          eyebrow={
            <code className="font-mono text-body-regular">
              <span className="text-chart-3">npm</span> <span className="text-accent-500">boardui</span>
              <span className="text-text-tertiary">@latest add</span> <span className="text-chart-5">button-group</span>
              <span aria-hidden="true" className="ms-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse bg-chart-5 motion-reduce:animate-none" />
            </code>
          }
          title="Install tons of interactive dashboard components"
          description="Agentic components, buttons, checkboxes, calendar or a meeting scheduler, all you need is here."
          actions={
            <>
              <Button variant="primary" leadingIcon={RiArrowDownCircleLine}>Install for free</Button>
              <Button variant="secondary" leadingIcon={RiBox3Line}>Browse all components</Button>
            </>
          }
        >
          {CARDS.map(({ title, description, Art }) => (
            <FeatureCard
              key={title}
              title={title}
              description={description}
              illustration={({ active }) => <Art active={active} />}
            />
          ))}
        </FeatureCardGrid>
      </div>
    </div>
  );
}
