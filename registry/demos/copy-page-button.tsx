'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Copy Page Button" (boardui.com/components/typography).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { CopyPageButton } from '@/registry/ui/copy-page-button';

const PAGE_MARKDOWN = `# Line Chart Card

The line chart from the dashboard: a Recharts line over a soft area gradient,
a Weekly/Monthly/Yearly switcher, a delta chip and a count-up headline.

## Installation

\`\`\`bash
pnpm dlx boardui@latest add line-chart-card
\`\`\`

## Props

| Prop      | Type                  | Default   |
| --------- | --------------------- | --------- |
| data      | ChartPoint[]          | required  |
| curve     | "smooth" \\| "sharp"   | "smooth"  |
| period    | "week" \\| "month"     | "week"    |
`;

export default function Demo() {
  const [viewing, setViewing] = useState<string | null>(null);
  const [lastCopy, setLastCopy] = useState<number | null>(null);

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-5" data-demo>
      <div className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-body-2-regular text-text-secondary">
          <span>Components</span>
          <span aria-hidden className="text-text-tertiary">/</span>
          <span className="text-text-primary">Line Chart Card</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-title-1-medium text-text-primary">Line Chart Card</h2>
          <CopyPageButton
            markdown={PAGE_MARKDOWN}
            onCopied={(text) => setLastCopy(text.length)}
            onViewMarkdown={setViewing}
          />
        </div>
        <p className="max-w-[560px] text-body-regular text-text-secondary">
          The line chart from the dashboard: a Recharts line over a soft area gradient, a Weekly/Monthly/Yearly switcher,
          a delta chip and a count-up headline.
        </p>
        <p className="text-caption-1-regular text-text-tertiary" aria-live="polite" data-last-copy>
          {lastCopy === null
            ? 'Copy the page to paste it into an LLM chat, or open the raw Markdown.'
            : `Copied ${lastCopy.toLocaleString('en-US')} characters of Markdown.`}
        </p>
      </div>

      {viewing !== null && (
        <section
          aria-label="Page as Markdown"
          className="flex flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-secondary-default"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border-button-default px-4 py-2.5">
            <span className="font-mono text-caption-1-medium text-text-secondary">line-chart-card.md</span>
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="cursor-pointer rounded-md px-2 py-1 text-caption-1-medium text-text-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
            >
              Close
            </button>
          </header>
          <pre className="max-h-[240px] overflow-auto px-4 py-3 font-mono text-caption-1-regular whitespace-pre text-text-primary">
            {viewing}
          </pre>
        </section>
      )}
    </div>
  );
}
