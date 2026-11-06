'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Quick Search Button" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import {
  RiFileCopyLine,
  RiFileListLine,
  RiHome5Line,
  RiLayoutGridLine,
  RiMoonLine,
  RiPriceTag3Line,
  RiSettings3Line,
} from '@remixicon/react';
import { QuickSearchButton } from '@/registry/ui/quick-search-button';
import { CommandPaletteItem, CommandPaletteSection } from '@/registry/ui/command-palette';

const LABELS: Record<string, string> = {
  home: 'Home',
  components: 'Components',
  pricing: 'Pricing',
  changelog: 'Changelog',
  copy: 'Copy install command',
  theme: 'Switch theme',
  settings: 'Open settings',
};

export default function Demo() {
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center gap-4 p-6">
      <header className="flex w-full max-w-2xl items-center gap-4 rounded-2xl bg-background-primary-default px-4 py-3 shadow-xs ring-1 ring-separator-border">
        <span className="hidden text-headline-semibold text-text-primary sm:block">Kinetic</span>
        <nav aria-label="Main" className="hidden gap-4 text-body-2-regular text-text-secondary md:flex">
          <a href="#components" className="hover:text-text-primary">Components</a>
          <a href="#pricing" className="hover:text-text-primary">Pricing</a>
        </nav>
        <div className="ml-auto flex w-full justify-end sm:w-64">
          <QuickSearchButton
            placeholder="Search pages and actions…"
            onAction={(key) => setLast(LABELS[String(key)] ?? String(key))}
          >
            <CommandPaletteSection title="Pages">
              <CommandPaletteItem id="home" icon={RiHome5Line}>Home</CommandPaletteItem>
              <CommandPaletteItem id="components" icon={RiLayoutGridLine} description="Browse every component">
                Components
              </CommandPaletteItem>
              <CommandPaletteItem id="pricing" icon={RiPriceTag3Line}>Pricing</CommandPaletteItem>
              <CommandPaletteItem id="changelog" icon={RiFileListLine}>Changelog</CommandPaletteItem>
            </CommandPaletteSection>
            <CommandPaletteSection title="Actions">
              <CommandPaletteItem id="copy" icon={RiFileCopyLine}>Copy install command</CommandPaletteItem>
              <CommandPaletteItem id="theme" icon={RiMoonLine}>Switch theme</CommandPaletteItem>
              <CommandPaletteItem id="settings" icon={RiSettings3Line} shortcut="⌘,">
                Open settings
              </CommandPaletteItem>
            </CommandPaletteSection>
          </QuickSearchButton>
        </div>
      </header>
      <p data-demo="ran" className="text-caption-1-regular text-text-tertiary">
        {last ? `Ran: ${last}` : 'Click the search field or press ⌘K / Ctrl+K'}
      </p>
    </div>
  );
}
