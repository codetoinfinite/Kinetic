'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Device Preview Frame" (boardui.com/).
 * No BoardUI source was used.
 */
import { RiBarChartBoxLine, RiHome5Line, RiKanbanView, RiSearchLine, RiSettings3Line } from "@remixicon/react";
import { Avatar } from "@/registry/ui/avatar";
import { Chip } from "@/registry/ui/chip";
import { DevicePreviewFrame } from "@/registry/ui/device-preview-frame";

const NAV = [
  { label: "Home", icon: RiHome5Line },
  { label: "Projects", icon: RiKanbanView },
  { label: "Reports", icon: RiBarChartBoxLine },
  { label: "Settings", icon: RiSettings3Line },
];

const KPIS = [
  { label: "Revenue", value: "$84.2k", delta: "+12.4%" },
  { label: "Active users", value: "12,480", delta: "+3.1%" },
  { label: "Conversion", value: "4.7%", delta: "+0.4" },
];

const BARS = [42, 58, 50, 66, 61, 74, 70, 86, 78, 92, 84, 97];

const ROWS = [
  { name: "John Clarkson", plan: "Pro", status: "Paid", color: "lime" as const },
  { name: "Ana Ruiz", plan: "Team", status: "Pending", color: "yellow" as const },
  { name: "Lee Park", plan: "Pro", status: "Paid", color: "lime" as const },
];

/** A small dashboard that lays itself out by the frame's width (container queries on `frame`). */
function MiniDashboard() {
  return (
    <div className="flex min-h-full bg-background-secondary-default">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 border-e border-separator-border bg-background-primary-default p-4 @5xl/frame:flex">
        <div className="mb-4 flex items-center gap-2">
          <Avatar size="sm" color="blue" initials="K" />
          <span className="text-body-semibold text-text-primary">Kinetic</span>
        </div>
        {NAV.map(({ label, icon: Icon }, i) => (
          <span
            key={label}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-body-medium ${
              i === 0 ? "bg-background-tertiary-default text-text-primary" : "text-text-secondary"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </span>
        ))}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-5 p-5 @3xl/frame:p-8">
        <header className="flex items-center gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-caption-1-regular text-text-tertiary">Overview</span>
            <span className="truncate text-title-2-semibold text-text-primary">Good morning, Ana</span>
          </div>
          <span className="ms-auto hidden h-9 w-60 items-center gap-2 rounded-lg border border-border-button-default bg-background-primary-default px-3 text-body-regular text-text-placeholder @3xl/frame:flex">
            <RiSearchLine className="size-4" aria-hidden="true" />
            Search
          </span>
          <span className="ms-auto @3xl/frame:ms-0">
            <Avatar size="sm" color="pink" initials="AR" />
          </span>
        </header>

        <div className="grid grid-cols-1 gap-3 @xl/frame:grid-cols-3">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="flex flex-col gap-1 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
              <span className="text-body-regular text-text-secondary">{kpi.label}</span>
              <span className="text-title-1-semibold text-text-primary">{kpi.value}</span>
              <span className="text-caption-1-medium text-chart-7">{kpi.delta} this month</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 @5xl/frame:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
            <span className="text-body-semibold text-text-primary">Revenue by month</span>
            <div className="flex h-40 items-end gap-1.5">
              {BARS.map((v, i) => (
                <span key={i} className="flex-1 rounded-t-md bg-chart-6" style={{ height: `${v}%` }} />
              ))}
            </div>
          </div>
          <div className="flex flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-4">
            <span className="mb-2 text-body-semibold text-text-primary">Latest customers</span>
            {ROWS.map((row) => (
              <div key={row.name} className="flex items-center gap-3 border-b border-separator-border py-2.5 last:border-b-0">
                <Avatar size="xs" color="neutral" initials={row.name.slice(0, 1)} />
                <span className="min-w-0 flex-1 truncate text-body-medium text-text-primary">{row.name}</span>
                <span className="hidden text-body-regular text-text-tertiary @xl/frame:inline">{row.plan}</span>
                <Chip variant="subtle" color={row.color}>
                  {row.status}
                </Chip>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Demo() {
  return (
    <div className="flex min-h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-[1100px]">
        <DevicePreviewFrame url="dashboard.kinetic.dev" height={420}>
          <MiniDashboard />
        </DevicePreviewFrame>
      </div>
    </div>
  );
}
