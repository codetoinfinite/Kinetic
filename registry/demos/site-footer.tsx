'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Site Footer" (boardui.com/).
 * No BoardUI source was used.
 */
import { useId, useState } from "react";
import type { MouseEvent } from "react";
import { RiDiscordFill, RiGithubFill, RiLayoutGridLine, RiTwitterXFill } from "@remixicon/react";
import { Button, ButtonLink } from "@/registry/ui/button";
import { SiteFooter } from "@/registry/ui/site-footer";
import type { FooterColumn } from "@/registry/ui/site-footer";
import { AccentSwatches, ACCENT_SWATCHES } from "@/registry/ui/site-footer-swatches";
import type { AccentSwatch } from "@/registry/ui/site-footer-swatches";

const COLUMNS: FooterColumn[] = [
  {
    title: "Components",
    links: [
      { label: "Data Table", href: "#components/data-table" },
      { label: "Data Grid", href: "#components/data-grid" },
      { label: "Date Picker", href: "#components/date-picker" },
      { label: "Calendar", href: "#components/calendar" },
      { label: "Sidebar", href: "#components/sidebar" },
      { label: "Select", href: "#components/select" },
      { label: "File Upload", href: "#components/file-upload" },
      { label: "Theme Toggle", href: "#components/theme-toggle" },
    ],
    viewAll: { href: "#components", count: 96 },
  },
  {
    title: "Charts",
    links: [
      { label: "Line Chart", href: "#charts/line" },
      { label: "Area Chart", href: "#charts/area" },
      { label: "Bar Chart", href: "#charts/bar" },
      { label: "Donut Chart", href: "#charts/donut" },
      { label: "Sankey Chart", href: "#charts/sankey" },
      { label: "Funnel Chart", href: "#charts/funnel" },
      { label: "Radar Chart", href: "#charts/radar" },
      { label: "Heatmap", href: "#charts/heatmap" },
    ],
    viewAll: { href: "#charts", count: 18 },
  },
  {
    title: "Agentic",
    links: [
      { label: "AI Chat", href: "#agentic/chat" },
      { label: "Multi-agent Chat", href: "#agentic/multi-agent" },
      { label: "Composer", href: "#agentic/composer" },
      { label: "Agent Thinking", href: "#agentic/thinking" },
      { label: "Agent Progress", href: "#agentic/progress" },
      { label: "Task List", href: "#agentic/tasks" },
    ],
  },
  {
    title: "Templates",
    links: [
      { label: "Home Dashboard", href: "#templates/home" },
      { label: "Finance Dashboard", href: "#templates/finance" },
      { label: "Marketing Dashboard", href: "#templates/marketing" },
      { label: "HR Management", href: "#templates/hr" },
      { label: "Project Board", href: "#templates/projects" },
      { label: "Medical Profile", href: "#templates/medical" },
    ],
    viewAll: { href: "#templates", count: 10 },
  },
  {
    title: "Resources",
    links: [
      { label: "Getting started", href: "#docs/start" },
      { label: "Installation", href: "#docs/install" },
      { label: "CLI", href: "#docs/cli" },
      { label: "MCP Server", href: "#docs/mcp" },
      { label: "RTL Support", href: "#docs/rtl" },
      { label: "Changelog", href: "#changelog" },
      { label: "llms.txt", href: "#llms" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Pricing", href: "#pricing" },
      { label: "Affiliate", href: "#affiliate", badge: "Earn 40%" },
      { label: "Brand assets", href: "#brand" },
      { label: "Contact", href: "#contact" },
    ],
  },
];

function Mark({ swatch, className }: { swatch: AccentSwatch; className?: string }) {
  const from = swatch.stops[0] ?? "#5b8cff";
  const to = swatch.stops[swatch.stops.length - 1] ?? "#1f4fd8";
  const id = `tessera-mark-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="26" height="26" rx="7" fill={`url(#${id})`} />
      <rect x="6" y="6" width="7" height="7" rx="2" fill="#ffffff" />
      <rect x="15" y="6" width="7" height="7" rx="2" fill="#ffffff" fillOpacity="0.55" />
      <rect x="6" y="15" width="16" height="7" rx="2" fill="#ffffff" fillOpacity="0.8" />
    </svg>
  );
}

export default function Demo() {
  const [accent, setAccent] = useState<AccentSwatch>(ACCENT_SWATCHES[0]!);
  const [language, setLanguage] = useState("en");
  const [last, setLast] = useState<string | null>(null);

  const route = (href: string, event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setLast(href);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background-primary-default">
      <section className="flex flex-col items-center px-4 pb-14 pt-12 text-center">
        <h2 className="max-w-[560px] text-title-1-semibold text-text-primary">Ship the dashboard this week</h2>
        <p className="mt-2 max-w-[520px] text-body-regular text-text-secondary">
          Tables, charts and templates you install with one command and then own.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="primary" leadingIcon={RiLayoutGridLine} onClick={() => setLast("#components")}>
            Browse components
          </Button>
          <Button variant="secondary" onClick={() => setLast("#templates")}>
            See templates
          </Button>
        </div>
        <p role="status" data-route="" className="mt-4 h-5 text-caption-1-regular text-text-tertiary">
          {last ? (
            <>
              Would open <span className="font-medium text-text-secondary">{last}</span>
            </>
          ) : (
            "Footer links are routed through onLinkClick"
          )}
        </p>
      </section>

      <SiteFooter
        className="mt-auto"
        logo={<Mark swatch={accent} className="size-7" />}
        brandLabel="Tessera home"
        brandHref="#top"
        tagline="Tessera is a dashboard kit for React and Tailwind CSS: data tables, charts and full templates, with a matching Figma library."
        socials={[
          { label: "X", href: "#x", icon: RiTwitterXFill },
          { label: "Discord", href: "#discord", icon: RiDiscordFill },
          { label: "GitHub stars", href: "#github", icon: RiGithubFill, count: "2.4k" },
        ]}
        cta={
          <ButtonLink
            href="#pro"
            variant="secondary"
            leadingIcon={({ className }) => <Mark swatch={accent} className={className} />}
            onClick={(event) => route("#pro", event)}
          >
            Get Pro
          </ButtonLink>
        }
        columns={COLUMNS}
        language={{ value: language, onChange: (code) => setLanguage(code) }}
        bottomCenter={
          <AccentSwatches value={accent.id} onChange={(_, swatch) => setAccent(swatch)} />
        }
        copyright="© 2026 Tessera Labs"
        legal={[
          { label: "Privacy", href: "#privacy" },
          { label: "Terms", href: "#terms" },
          { label: "License", href: "#license" },
        ]}
        onLinkClick={route}
      />
    </div>
  );
}
