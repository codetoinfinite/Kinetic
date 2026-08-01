'use client';

import { SteppedFilmGrain } from '@/registry/ui/stepped-film-grain';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      {/* Stand-in for hero artwork: a wide, low-contrast wash so the grain has
          both a lit area and a crushed shadow to sit in. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(130% 100% at 18% 12%, color-mix(in oklch, var(--color-accent) 42%, transparent) 0%, transparent 58%), radial-gradient(90% 80% at 88% 92%, var(--color-surface) 0%, transparent 62%), var(--color-bg)',
        }}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
        <span className="meta">Reel 04 / 1966</span>
        <div>
          <h2 className="max-w-[16ch] text-3xl leading-[0.95] tracking-tight text-fg">
            Shot on stock, not on silicon
          </h2>
          <p className="mt-2 max-w-[38ch] text-xs leading-relaxed text-muted">
            Twelve pattern changes a second. Twelve draw calls a second.
          </p>
        </div>
      </div>

      {/* Last child, so the grain lands over the type as well as the artwork —
          a title card is graded as one image, not as clean text pasted on top. */}
      <SteppedFilmGrain className="absolute inset-0" />
    </div>
  );
}
