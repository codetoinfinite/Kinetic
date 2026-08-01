'use client';

import { useCallback, useState } from 'react';
import { LayoutLerpScalar, type LayoutName } from '@/registry/ui/layout-lerp-scalar';

/* The whole point of the component is that these four are data, not code:
   each one is the same placement function fed a different set of scalars, and
   the button below only changes which set is being tweened toward. */
const LAYOUTS: { name: LayoutName; label: string; note: string }[] = [
  { name: 'drum', label: 'Drum', note: 'radius 2.55 · turns 2' },
  { name: 'row', label: 'Row', note: 'radius 0 · rowSpread 1' },
  { name: 'column', label: 'Column', note: 'spacing 0.95 · depth 0.35' },
  { name: 'fan', label: 'Fan', note: 'radius 3.1 · turns 0.34' },
];

const COUNT = 12;

/* Twelve labels so the focus readout has something to say. Nothing is drawn
   from them — the cards are signed distance fields in the fragment shader. */
const CARDS = [
  'Kiln',
  'Ledger',
  'Foundry',
  'Almanac',
  'Quarry',
  'Signal',
  'Vellum',
  'Meridian',
  'Halcyon',
  'Tessera',
  'Orrery',
  'Cinder',
];

export default function Demo() {
  const [layout, setLayout] = useState<LayoutName>('drum');
  const [focus, setFocus] = useState(0);

  /* Held in a ref inside the component, so a stable identity is not required
     — but a new function every render would still be a new prop every render. */
  const handleFocusChange = useCallback((index: number) => {
    setFocus(index);
  }, []);

  const active = LAYOUTS.find((entry) => entry.name === layout) ?? LAYOUTS[0];
  const title = CARDS[focus] ?? CARDS[0] ?? '';

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="flex shrink-0 items-baseline justify-between px-4 pb-1 pt-4">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          One placement function
        </span>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-faint">
          {String(focus + 1).padStart(2, '0')} / {COUNT}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <LayoutLerpScalar
          count={COUNT}
          layout={layout}
          onFocusChange={handleFocusChange}
        />

        {/* Caption over the canvas, driven only by onFocusChange — the DOM
            never learns where anything is, just which card is centred. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-3 px-4 pb-3">
          <span className="truncate text-sm leading-tight tracking-tight text-fg">
            {title}
          </span>
          <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
            {active?.note}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-line px-4 py-3">
        {LAYOUTS.map((entry) => {
          const on = entry.name === layout;
          return (
            <button
              key={entry.name}
              type="button"
              onClick={() => setLayout(entry.name)}
              aria-pressed={on}
              className={[
                'rounded-sm border px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.18em] transition-colors',
                on
                  ? 'border-line-strong text-fg'
                  : 'border-line text-muted hover:text-fg',
              ].join(' ')}
            >
              {entry.label}
            </button>
          );
        })}
        <span className="ml-auto font-mono text-[0.625rem] uppercase tracking-[0.18em] text-faint">
          tween the inputs
        </span>
      </div>
    </div>
  );
}
