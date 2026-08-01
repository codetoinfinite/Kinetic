/* ==========================================================================
   Theme, resolved before the first paint.
   --------------------------------------------------------------------------
   Dark is the default and lives on :root, so only the light theme needs a
   class. Reading localStorage in an effect would paint dark first and then
   flip — a white flash in reverse, which on a near-black site is worse than
   the usual one. This runs synchronously in <head> order, before body paints.

   It is deliberately tiny and dependency-free: everything here executes on
   every navigation-less page load, and a theme provider with context would
   force the whole tree to be a client component for one boolean.
   ========================================================================== */

import { site } from '@/site.config';

/* The key is interpolated from the config so it cannot drift from
   `theme-toggle.tsx`, which is the other half of this pair — a rename in one
   file only means the reader and the writer disagree and the theme silently
   stops persisting. `JSON.stringify` rather than plain quotes: this string is
   injected raw into a <script>, so the value has to be escaped, not trusted. */
const SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(site.themeStorageKey)});
var m=window.matchMedia('(prefers-color-scheme: light)').matches;
if(s==='light'||(s===null&&m))document.documentElement.classList.add('light');
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
