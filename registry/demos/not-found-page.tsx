'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Not Found Page" (boardui.com (404 page)).
 * No BoardUI source was used.
 */
import { useState } from "react";
import type { MouseEvent } from "react";
import { RiBookOpenLine, RiLayoutGridLine, RiRobot2Line, RiTerminalBoxLine } from "@remixicon/react";
import { NotFoundPage } from "@/registry/ui/not-found-page";
import type { NotFoundDestination, NotFoundFootnote } from "@/registry/ui/not-found-page";

const DESTINATIONS: NotFoundDestination[] = [
  { title: "Components", description: "The full gallery: 96 components and blocks with live previews.", href: "#components", icon: RiLayoutGridLine },
  { title: "Documentation", description: "What Tessera is, how installing works, and the CLI reference.", href: "#docs", icon: RiBookOpenLine },
  { title: "Installation", description: "Next.js, Vite, React Router and Astro setup guides.", href: "#installation", icon: RiTerminalBoxLine },
  { title: "MCP server", description: "Let a coding agent read and install components for you.", href: "#mcp", icon: RiRobot2Line },
];

function TesseraMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6">
      <rect x="2" y="2" width="9" height="9" rx="2.5" fill="#5b8cff" />
      <rect x="13" y="2" width="9" height="9" rx="4.5" fill="#9a7bff" />
      <rect x="2" y="13" width="9" height="9" rx="4.5" fill="#45b9b4" />
      <rect x="13" y="13" width="9" height="9" rx="2.5" fill="#f4c033" />
    </svg>
  );
}

export default function Demo() {
  const [status, setStatus] = useState("Pick a way out");

  const navigate = (href: string, event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setStatus(`Would open ${href.replace(/^#/, "/")}`);
  };

  const footnote: NotFoundFootnote = {
    title: "Reading this site as an agent",
    body: (
      <>
        Send <code>Accept: text/markdown</code> to get any page as Markdown, or connect to the{" "}
        <a href="#mcp" onClick={(event) => navigate("#mcp", event)}>
          /mcp
        </a>{" "}
        endpoint.
      </>
    ),
    links: [
      { label: "llms.txt", href: "#llms.txt", description: "site map for language models" },
      { label: "llms-full.txt", href: "#llms-full.txt", description: "every component inlined" },
      { label: "openapi.json", href: "#openapi.json", description: "the API surface" },
      { label: "sitemap.xml", href: "#sitemap.xml", description: "every indexable URL" },
    ],
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-background-primary-default">
      <div className="sticky top-0 z-10 border-b border-separator-border bg-background-primary-default">
        <div className="mx-auto flex h-14 max-w-[1152px] items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="#home"
            onClick={(event) => navigate("#home", event)}
            className="flex shrink-0 items-center gap-2 rounded-md text-headline-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <TesseraMark />
            Tessera
          </a>
          <p role="status" data-nav-status="" className="min-w-0 truncate text-caption-1-regular text-text-tertiary">
            {status}
          </p>
        </div>
      </div>
      <NotFoundPage
        path="/charts/bubble-chart"
        homeAction={{ label: "Back home", href: "#home" }}
        browseAction={{ label: "Browse components", href: "#components" }}
        destinations={DESTINATIONS}
        footnote={footnote}
        onNavigate={navigate}
      />
    </div>
  );
}
