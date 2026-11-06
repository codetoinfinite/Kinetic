'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "On This Page TOC" (boardui.com/components/typography).
 * No BoardUI source was used.
 */

import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { OnThisPageToc } from '@/registry/ui/on-this-page-toc';
import type { TocItem } from '@/registry/ui/on-this-page-toc';

const SECTIONS: { key: string; label: string; depth?: 0 | 1; body: string; block?: 'preview' | 'code' | 'rows' }[] = [
  {
    key: 'preview',
    label: 'Preview',
    body: 'Typography sets the voice of the interface. Eleven steps from Large Title to Caption 2 cover every surface, each with four weights.',
    block: 'preview',
  },
  {
    key: 'installation',
    label: 'Installation',
    body: 'The scale ships as utilities in the theme file, so there is nothing to install beyond the stylesheet.',
    block: 'code',
  },
  {
    key: 'usage',
    label: 'Usage',
    body: 'Pick the step by role, not by size. Headings use Title and Headline, running text uses Body, and metadata uses Caption.',
  },
  {
    key: 'headings',
    label: 'Headings',
    depth: 1,
    body: 'Display and Title steps tighten their tracking as they grow so large type stays compact.',
    block: 'rows',
  },
  {
    key: 'body-text',
    label: 'Body text',
    depth: 1,
    body: 'Body sits at 15px with a 22px line height, tuned for long reading at a comfortable measure.',
  },
  {
    key: 'tokens',
    label: 'Tokens',
    body: 'Every step is one utility that sets size, line height and weight together, for example text-body-medium.',
    block: 'rows',
  },
  {
    key: 'accessibility',
    label: 'Accessibility',
    body: 'Sizes are in rem, so the whole scale follows the reader’s browser font setting.',
  },
];

function Block({ kind }: { kind: 'preview' | 'code' | 'rows' }): ReactNode {
  if (kind === 'preview') {
    return (
      <div aria-hidden className="flex flex-col gap-2 rounded-2xl bg-background-secondary-default p-5">
        <span className="text-title-1-semibold text-text-primary">Aa Display</span>
        <span className="text-headline-medium text-text-secondary">The quick brown fox</span>
        <span className="text-caption-1-regular text-text-tertiary">Caption 1 / 12 / 16</span>
      </div>
    );
  }
  if (kind === 'code') {
    return (
      <pre className="overflow-x-auto rounded-2xl border border-border-component-detail-container bg-background-secondary-default px-4 py-3 text-body-2-regular">
        <code>
          <span className="text-text-tertiary">@import </span>
          <span className="text-docs-command-accent">&quot;./theme.css&quot;</span>
          <span className="text-text-tertiary">;</span>
        </code>
      </pre>
    );
  }
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <div className="h-3 w-11/12 rounded-full bg-background-tertiary-default" />
      <div className="h-3 w-4/5 rounded-full bg-background-tertiary-default" />
      <div className="h-3 w-2/3 rounded-full bg-background-tertiary-default" />
    </div>
  );
}

export default function Demo() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prefix = `toc-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const items: TocItem[] = SECTIONS.map((section) => ({
    id: `${prefix}-${section.key}`,
    label: section.label,
    depth: section.depth ?? 0,
  }));

  return (
    <div data-demo className="flex w-full max-w-[860px] flex-col gap-6 sm:h-[512px] sm:flex-row">
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label="Typography article"
        className="relative h-[280px] min-h-0 flex-none overflow-y-auto overscroll-contain rounded-3xl border border-border-component-detail-container bg-background-primary-default px-6 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring sm:h-auto sm:flex-1 sm:px-8"
      >
        <header className="pt-8 pb-2">
          <p className="text-caption-1-medium tracking-[0.04em] text-text-tertiary uppercase">Foundations</p>
          <h1 className="mt-1 text-title-1-semibold text-text-primary">Typography</h1>
        </header>
        {SECTIONS.map((section, index) => {
          const Heading = section.depth ? 'h3' : 'h2';
          return (
            <section
              key={section.key}
              id={`${prefix}-${section.key}`}
              aria-labelledby={`${prefix}-${section.key}-h`}
              className={`flex flex-col gap-3 py-6 outline-none ${index === SECTIONS.length - 1 ? 'pb-10' : ''}`}
            >
              <Heading
                id={`${prefix}-${section.key}-h`}
                className={section.depth ? 'text-headline-semibold text-text-primary' : 'text-title-3-semibold text-text-primary'}
              >
                {section.label}
              </Heading>
              <p className="max-w-[56ch] text-body-regular text-text-secondary">{section.body}</p>
              {section.block ? <Block kind={section.block} /> : null}
            </section>
          );
        })}
      </div>

      <OnThisPageToc
        items={items}
        scrollRoot={scrollRef}
        className="order-first shrink-0 sm:order-none sm:w-[200px] sm:pt-6"
      />
    </div>
  );
}
