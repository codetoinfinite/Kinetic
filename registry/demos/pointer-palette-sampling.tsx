'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import {
  PointerPaletteSampling,
  type PaintSize,
  type PaletteEntry,
} from '@/registry/ui/pointer-palette-sampling';

const PALETTE: readonly PaletteEntry[] = [
  { name: 'Bone', hex: '#efe9de' },
  { name: 'Clay', hex: '#c96f4a' },
  { name: 'Rust', hex: '#8f3b1b' },
  { name: 'Moss', hex: '#4a5d3a' },
  { name: 'Slate', hex: '#3b4451' },
  { name: 'Ink', hex: '#16181c' },
];

export default function Demo() {
  const [entry, setEntry] = useState<PaletteEntry | null>(null);

  /* Procedural, and therefore same-origin: a canvas that has ever drawn a
     cross-origin image throws SecurityError on every read afterwards. */
  const paint = useCallback((ctx: CanvasRenderingContext2D, { width, height }: PaintSize) => {
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, '#efe9de');
    wash.addColorStop(0.45, '#c96f4a');
    wash.addColorStop(1, '#3b4451');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#4a5d3a';
    ctx.beginPath();
    ctx.arc(width * 0.28, height * 0.62, Math.min(width, height) * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8f3b1b';
    ctx.fillRect(width * 0.58, height * 0.12, width * 0.3, height * 0.26);

    ctx.fillStyle = '#16181c';
    ctx.beginPath();
    ctx.moveTo(width * 0.62, height * 0.92);
    ctx.lineTo(width * 0.86, height * 0.55);
    ctx.lineTo(width * 0.98, height * 0.92);
    ctx.closePath();
    ctx.fill();
  }, []);

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <PointerPaletteSampling
        palette={PALETTE}
        paint={paint}
        onSample={setEntry}
        className="group min-h-0 flex-1"
      >
        {/* Positioned from the same custom properties the component writes, so
            the chip tracks the pointer with no React render per frame. */}
        <div
          aria-hidden
          className="pointer-events-none absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg opacity-0 shadow-sm transition-opacity duration-200 group-data-[sampling=true]:opacity-100"
          style={
            {
              left: 'var(--kx-sample-x)',
              top: 'var(--kx-sample-y)',
              backgroundColor: 'var(--kx-sample-color)',
            } as CSSProperties
          }
        />
      </PointerPaletteSampling>

      <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-4">
        <p className="meta">Point at the artwork</p>
        <div className="flex items-center gap-3">
          <span
            className="size-4 rounded-full border border-line"
            style={{ backgroundColor: entry?.hex ?? 'transparent' }}
          />
          <span className="text-sm tracking-tight text-fg">
            {entry ? entry.name : '—'}
          </span>
          <span className="meta">{entry ? entry.hex : ''}</span>
        </div>
      </div>
    </div>
  );
}
