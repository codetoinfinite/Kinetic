import { cn } from '@/lib/cn';
import { site } from '@/site.config';

/* ==========================================================================
   The mark.
   --------------------------------------------------------------------------
   An easing curve with its terminal point picked out in the accent: the one
   diagram everybody who works with motion reads instantly, and the only thing
   on the site that is a logo rather than a component.

   The path is not a decorative squiggle. It is cubic-bezier(0.25, 1, 0.5, 1)
   — the theme's own `--ease-out-quart` — mapped into the 12×12 box with y
   flipped for SVG's coordinate system, so the mark and the curve every
   entrance on the site uses are the same curve.

   Drawn inline rather than fetched: it inherits `currentColor`, costs no
   request, and cannot arrive after the text it sits next to.
   ========================================================================== */

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-[1.125rem] shrink-0"
        fill="none"
      >
        <path
          d="M2 14C5 2 8 2 14 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* The end of the curve, in the accent: the state the motion arrives
            at. Left as the site accent because the header and footer sit
            outside every `data-category` subtree. */}
        <circle cx="14" cy="2" r="1.75" className="fill-accent" />
      </svg>
      {/* Lowercased in CSS rather than in the config, so `site.name` stays the
          properly-cased product name everywhere else it is printed. */}
      <span className="font-mono text-[0.9375rem] font-medium lowercase tracking-[-0.02em]">
        {site.name}
      </span>
    </span>
  );
}
