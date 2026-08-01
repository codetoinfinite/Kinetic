import { Fragment } from 'react';

/* ==========================================================================
   Every prose field in the registry — mechanism steps, pitfalls, prop
   descriptions, the reason a constant is that number — is authored with
   markdown code spans, because the author is writing for the AI prompt as much
   as for this page. Rendered as plain text — which is what the page did until
   now — every one of those spans printed its own delimiters. Nothing else on
   the page looked as unfinished as that.

   Kept to code spans deliberately. A markdown renderer here would be a
   dependency and an injection surface for one inline element.
   ========================================================================== */

// Isolated in one single-quoted constant on purpose: a stray backtick has twice
// cost this codebase a parse-error cascade, so it appears once, here, and
// nowhere else in the file.
const TICK = '`';

export function Rich({ children }: { children: string }) {
  const parts = children.split(TICK);

  // An odd number of delimiters means the text is not what this assumes, and
  // the last segment would be styled as code on a guess. Show it verbatim.
  if (parts.length % 2 === 0) return <>{children}</>;

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code
            key={index}
            className="rounded-sm border border-line bg-bg-subtle px-1 py-px font-mono text-[0.85em] text-fg"
          >
            {part}
          </code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
