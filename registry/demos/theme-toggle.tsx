'use client';

import { RiPaletteLine } from '@remixicon/react';

import { ThemeToggle } from '@/registry/ui/theme-toggle';

/* Every skin of the one preference, placed where BoardUI uses it: a free
   segmented pill and the collapsed rail button, a sidebar with the switch row
   and the sidebar pill, and an account menu row with the small pill. They all
   read the same <html> class, so flipping any of them flips all of them, and
   the site with them. */
export default function Demo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <ThemeToggle appearance="segmented" />
        <ThemeToggle collapsed />
      </div>

      <div className="flex w-[240px] flex-col gap-2 rounded-2xl border border-border-button-default bg-background-secondary-default p-2">
        <ThemeToggle />
        <div className="h-px bg-separator-border" />
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-body-medium text-text-secondary">Theme</span>
          <ThemeToggle appearance="sidebar-segmented" />
        </div>
      </div>

      <div className="w-[240px] rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-xs">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
          <span className="flex items-center gap-2">
            <RiPaletteLine className="size-4 text-foreground-icon-secondary" aria-hidden />
            <span className="text-body-regular text-text-primary">Appearance</span>
          </span>
          <ThemeToggle appearance="segmented" size="small" />
        </div>
      </div>
    </div>
  );
}
