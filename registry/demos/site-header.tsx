'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Site Header" (boardui.com/).
 * No BoardUI source was used.
 */
import { useState } from "react";
import type { MouseEvent } from "react";
import {
  RiBarChartBoxLine,
  RiBookOpenLine,
  RiDiscordFill,
  RiLayoutGridLine,
  RiRobot2Line,
  RiTwitterXFill,
  RiVipCrownLine,
} from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { CommandPalette, CommandPaletteItem, CommandPaletteSection } from "@/registry/ui/command-palette";
import { SiteHeader } from "@/registry/ui/site-header";
import type { SiteHeaderLink } from "@/registry/ui/site-header";

const LINKS: SiteHeaderLink[] = [
  {
    label: "Components",
    items: [
      { label: "All components", href: "#components", description: "103 pieces, from buttons to calendars", icon: RiLayoutGridLine },
      { label: "Charts", href: "#charts", description: "19 data charts with live tooltips", icon: RiBarChartBoxLine },
      { label: "Agent blocks", href: "#agents", description: "Thinking, progress and chat surfaces", icon: RiRobot2Line },
    ],
  },
  { label: "Templates", href: "#templates" },
  { label: "Docs", href: "#docs" },
  { label: "Blog", href: "#blog" },
];

const PAGES: Record<string, { title: string; copy: string }> = {
  "#components": { title: "All components", copy: "Browse every piece in the kit, filter by category and copy the install command." },
  "#charts": { title: "Charts", copy: "Bar, line, area and stacked charts that share one palette in light and dark." },
  "#agents": { title: "Agent blocks", copy: "Five blocks for agentic interfaces: thinking, searching, progress, limits and chat." },
  "#templates": { title: "Templates", copy: "Ten full-page templates across finance, healthcare and agentic chat." },
  "#docs": { title: "Docs", copy: "Installation, theming tokens and the rebuild prompts for every component." },
  "#blog": { title: "Blog", copy: "Release notes and the reasoning behind the kit's design decisions." },
};

const SOCIALS = [
  { label: "BoardUI on X", href: "https://x.com", icon: RiTwitterXFill },
  { label: "BoardUI on Discord", href: "https://discord.com", icon: RiDiscordFill },
];

export default function Demo() {
  const [current, setCurrent] = useState("#components");
  const [searchOpen, setSearchOpen] = useState(false);
  const page = PAGES[current] ?? { title: "Home", copy: "Welcome." };

  const navigate = (href: string, event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setCurrent(href);
  };

  const header = (
    <SiteHeader
      links={LINKS}
      currentHref={current}
      onNavigate={navigate}
      onSearch={() => setSearchOpen(true)}
      socials={SOCIALS}
      githubHref="https://github.com"
      githubStars={963}
      actions={
        <Button variant="secondary" leadingIcon={RiVipCrownLine} className="h-10 rounded-full px-3">
          Get Pro
        </Button>
      }
    />
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-background-full">
      <div className="sticky top-0 z-30 border-b border-separator-border">{header}</div>

      <main className="mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)_390px] gap-10 px-8 pt-12 pb-16">
        <section aria-live="polite" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-body-2-medium text-text-tertiary">Current page</span>
            <h1 data-page-title className="text-display-4-medium text-text-primary">{page.title}</h1>
            <p className="max-w-[52ch] text-body-regular text-text-secondary">{page.copy}</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex h-36 flex-col justify-end gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
                <span className="h-2.5 w-3/5 rounded-full bg-background-tertiary-default" />
                <span className="h-2 w-2/5 rounded-full bg-background-secondary-default" />
              </div>
            ))}
          </div>
          <p className="text-body-regular text-text-tertiary">
            Press <kbd className="font-sans text-text-secondary">⌘K</kbd> or the search pill to jump between pages.
          </p>
        </section>

        <aside className="flex flex-col gap-3">
          <span className="text-body-2-medium text-text-tertiary">Same header in a 390px container</span>
          <div className="overflow-hidden rounded-3xl border border-border-button-default bg-background-full shadow-sm">
            <div className="border-b border-separator-border">{header}</div>
            <div className="flex flex-col gap-3 p-4">
              <span className="text-title-3-medium text-text-primary">{page.title}</span>
              <span className="h-2.5 w-4/5 rounded-full bg-background-tertiary-default" />
              <span className="h-2.5 w-3/5 rounded-full bg-background-secondary-default" />
              <div className="mt-2 h-40 rounded-2xl bg-background-secondary-default" />
            </div>
          </div>
        </aside>
      </main>

      <CommandPalette
        isOpen={searchOpen}
        onOpenChange={setSearchOpen}
        placeholder="Search pages…"
        onAction={(key) => setCurrent(String(key))}
      >
        <CommandPaletteSection title="Components">
          <CommandPaletteItem id="#components" icon={RiLayoutGridLine}>All components</CommandPaletteItem>
          <CommandPaletteItem id="#charts" icon={RiBarChartBoxLine}>Charts</CommandPaletteItem>
          <CommandPaletteItem id="#agents" icon={RiRobot2Line}>Agent blocks</CommandPaletteItem>
        </CommandPaletteSection>
        <CommandPaletteSection title="Pages">
          <CommandPaletteItem id="#templates" icon={RiLayoutGridLine}>Templates</CommandPaletteItem>
          <CommandPaletteItem id="#docs" icon={RiBookOpenLine}>Docs</CommandPaletteItem>
        </CommandPaletteSection>
      </CommandPalette>
    </div>
  );
}
