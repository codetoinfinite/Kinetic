import 'server-only';

import { createHighlighter, type Highlighter } from 'shiki';

/* ==========================================================================
   Syntax highlighting, once per process, on the server.
   --------------------------------------------------------------------------
   Shiki loads real TextMate grammars, so a highlighter costs tens of
   milliseconds and several megabytes to build. Building one per request would
   pay that on every page view; building one per *file* on a page showing five
   files would pay it five times.

   `import 'server-only'` is the guard that matters: the grammars must never
   end up in a client bundle. A stray import from a client component would
   silently ship megabytes of highlighter to the browser, and the failure is a
   bundle-size regression rather than an error — the kind nobody notices.

   Both themes are emitted into every token as CSS variables (defaultColor:
   false). The theme toggle then costs one class change on <html> rather than a
   re-highlight, and there is no flash of the wrong palette.
   ========================================================================== */

const LANGS = ['tsx', 'ts', 'js', 'jsx', 'css', 'json', 'bash', 'markdown', 'glsl'] as const;

// Held on globalThis, not in a module-level `let`: the dev server re-evaluates
// this module on every hot reload, and each fresh `let` built a new
// highlighter while the old one kept its WASM heap. Around the tenth instance
// Oniguruma ran out of memory and every component page 500'd with a garbled
// ShikiError. A production build evaluates the module once either way.
const cache = globalThis as typeof globalThis & {
  __kineticHighlighter?: Promise<Highlighter>;
};

function get(): Promise<Highlighter> {
  // Cached as the *promise*, not the resolved value: two concurrent requests
  // arriving before the first resolves would otherwise each build one.
  cache.__kineticHighlighter ??= createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [...LANGS],
  });
  return cache.__kineticHighlighter;
}

function normalise(lang: string): string {
  return (LANGS as readonly string[]).includes(lang) ? lang : 'txt';
}

export async function highlight(code: string, lang: string): Promise<string> {
  const highlighter = await get();
  return highlighter.codeToHtml(code, {
    lang: normalise(lang),
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
}
