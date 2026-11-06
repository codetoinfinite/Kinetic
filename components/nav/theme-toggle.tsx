'use client';

/* ==========================================================================
   Theme toggle.
   --------------------------------------------------------------------------
   No React state, deliberately. Everything the control displays — which icon
   is showing and what the button is called — is derived in CSS from the
   `.light` class that `theme-script.tsx` writes on <html> before the first
   paint. That has three consequences worth the slightly unusual markup:

     · the server HTML is already correct, so there is nothing to hydrate and
       no first-render placeholder state to look at;
     · the accessible name is accurate before this file's JavaScript has even
       been fetched, where an `aria-label` computed from state would say
       something generic until it hydrated;
     · flipping the theme costs one `classList.toggle` and the icon crossfade
       runs entirely off that class change.

   The name comes from two visually-hidden spans, exactly one of which is
   `display: none` at any moment. Accessible-name computation skips
   `display: none` subtrees, so the name is whichever span is showing — never
   both, never a concatenation.
   ========================================================================== */

import { site } from '@/site.config';

const ICON =
  'col-start-1 row-start-1 size-4 transition-[opacity,rotate,scale] ' +
  'duration-control ease-out-quart';

function setTheme(next: 'dark' | 'light') {
  const root = document.documentElement.classList;
  root.toggle('light', next === 'light');
  // BoardUI-derived components read `.dark`, not the absence of `.light`.
  root.toggle('dark', next === 'dark');
  try {
    // Same key as `theme-script.tsx` reads, from the same constant.
    localStorage.setItem(site.themeStorageKey, next);
  } catch {
    // Private mode, or storage disabled. The class is already set; the choice
    // simply will not survive a reload.
  }
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(document.documentElement.classList.contains('light') ? 'dark' : 'light');
      }}
      className={
        'grid size-9 place-items-center rounded-sm border border-line text-muted ' +
        'transition-[color,background-color,border-color,scale] duration-instant ' +
        'ease-out-quart hover:border-line-strong hover:bg-surface-hover hover:text-fg ' +
        'active:scale-[0.94]'
      }
    >
      <span className="sr-only [.light_&]:hidden">Switch to light theme</span>
      <span className="sr-only hidden [.light_&]:inline">Switch to dark theme</span>

      {/* Both icons occupy the same grid cell, so the swap cannot move the
          button's box or anything beside it. The one on its way out rotates
          away from the incoming one rather than towards it. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className={`${ICON} [.light_&]:rotate-90 [.light_&]:scale-50 [.light_&]:opacity-0`}
      >
        <circle cx="12" cy="12" r="4.25" />
        <path d="M12 2.5v2.25M12 19.25v2.25M2.5 12h2.25M19.25 12h2.25M5.28 5.28l1.6 1.6M17.12 17.12l1.6 1.6M18.72 5.28l-1.6 1.6M6.88 17.12l-1.6 1.6" />
      </svg>

      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className={`${ICON} rotate-[-90deg] scale-50 opacity-0 [.light_&]:rotate-0 [.light_&]:scale-100 [.light_&]:opacity-100`}
      >
        <path d="M20.5 13.4A8.75 8.75 0 1 1 10.6 3.5a6.8 6.8 0 0 0 9.9 9.9Z" />
      </svg>
    </button>
  );
}
