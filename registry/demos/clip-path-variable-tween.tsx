'use client';

import { useState } from 'react';
import { ClipPathVariableTween } from '@/registry/ui/clip-path-variable-tween';

const PROJECTS = [
  {
    id: 'northfield',
    index: '01',
    title: 'Northfield Press',
    kind: 'Identity',
    year: '2024',
    lede: 'A letterpress shop that had outgrown its own logo twice.',
    angle: 148,
    accent: 26,
  },
  {
    id: 'oneidea',
    index: '02',
    title: 'Room For One Idea',
    kind: 'Exhibition',
    year: '2024',
    lede: 'Nine rooms, one sentence each, signage that had to whisper.',
    angle: 34,
    accent: 18,
  },
  {
    id: 'half',
    index: '03',
    title: 'Half Measures',
    kind: 'Packaging',
    year: '2025',
    lede: 'Ferments in returnable glass, so the label had to survive a dishwasher.',
    angle: 96,
    accent: 32,
  },
] as const;

export default function Demo() {
  // A faked route change: `active` is the pretend URL, and the detail panel is
  // the pretend page. Nothing here knows what a router is.
  const [active, setActive] = useState<string | null>(null);
  // Held separately so the panel keeps its content all the way through the
  // exit, instead of blanking the instant the route "changes".
  const [shown, setShown] = useState<(typeof PROJECTS)[number]>(PROJECTS[0]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      {/* The page underneath. It is never hidden — the panel clipping away is
          what reveals it, which is the whole reason the exit is worth watching. */}
      <div className="flex h-full flex-col p-4">
        <p className="meta">Index</p>
        <div className="mt-2 border-t border-line">
          {PROJECTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setShown(p);
                setActive(p.id);
              }}
              className="flex w-full items-baseline gap-3 border-b border-line py-3 text-left transition-colors hover:bg-surface-hover"
            >
              <span className="meta w-6 shrink-0">{p.index}</span>
              <span className="min-w-0 flex-1 truncate text-base tracking-tight text-fg">
                {p.title}
              </span>
              <span className="meta shrink-0">{p.kind}</span>
            </button>
          ))}
        </div>
      </div>

      <ClipPathVariableTween
        open={active !== null}
        className="absolute inset-0 bg-bg"
      >
        <div
          className="absolute inset-0"
          style={{ pointerEvents: active === null ? 'none' : 'auto' }}
        >
          <div className="absolute inset-0 overflow-hidden">
            {/* Pushed from 1.4 to 1 over 1.8 s, so it is still settling after
                the clip has finished. */}
            <div
              data-clip-media
              className="absolute inset-0"
              style={{
                background: [
                  `linear-gradient(${shown.angle}deg, color-mix(in oklab, var(--k-accent) ${shown.accent}%, var(--k-bg)), var(--k-bg) 68%)`,
                  'radial-gradient(120% 80% at 30% 20%, color-mix(in oklab, var(--k-fg) 10%, transparent), transparent 70%)',
                ].join(', '),
              }}
            />
          </div>

          <div className="relative flex h-full flex-col justify-end gap-1 p-4">
            <div className="overflow-hidden">
              <p data-clip-line className="meta text-accent">
                {shown.kind} — {shown.year}
              </p>
            </div>
            <div className="overflow-hidden">
              <h3
                data-clip-line
                className="text-2xl leading-tight tracking-tight text-fg sm:text-3xl"
              >
                {shown.title}
              </h3>
            </div>
            <div className="overflow-hidden">
              <p data-clip-line className="max-w-sm text-sm text-muted">
                {shown.lede}
              </p>
            </div>

            {/* Not tweened at all. It carries `kx-clip-follow`, so it clips
                itself with the same inherited variable — one tween, two clip
                boxes, and they cannot drift. */}
            <div className="kx-clip-follow mt-3 border-t border-line-strong pt-2">
              <span className="meta">{shown.index} / 03</span>
            </div>

            <button
              type="button"
              onClick={() => setActive(null)}
              className="meta absolute right-4 top-4 rounded-full border border-line-strong bg-bg/70 px-2.5 py-1 text-fg backdrop-blur-sm transition-colors hover:border-accent"
            >
              Close
            </button>
          </div>
        </div>
      </ClipPathVariableTween>
    </div>
  );
}
