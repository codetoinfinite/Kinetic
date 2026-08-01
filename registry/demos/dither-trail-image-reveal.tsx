'use client';

import { useEffect, useState } from 'react';
import { createRng } from '@/registry/lib/prng';
import { DitherTrailImageReveal } from '@/registry/ui/dither-trail-image-reveal';

/**
 * The component takes its image as a prop, and the registry ships no binaries,
 * so the demo paints one at runtime and hands over a data URL. Seeded, so the
 * picture is the same on every load.
 */
function paintSource(): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const rng = createRng('dither-trail-image-reveal');
  const { width: w, height: h } = canvas;

  const sky = ctx.createLinearGradient(0, 0, w * 0.35, h);
  sky.addColorStop(0, '#1b2340');
  sky.addColorStop(0.45, '#4d4370');
  sky.addColorStop(0.72, '#c2705c');
  sky.addColorStop(1, '#f0b07a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sunX = w * 0.68;
  const sunY = h * 0.62;
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, h * 0.55);
  halo.addColorStop(0, 'rgba(255, 236, 196, 0.95)');
  halo.addColorStop(0.18, 'rgba(255, 190, 130, 0.55)');
  halo.addColorStop(1, 'rgba(255, 150, 90, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // Four ridges, back to front, each darker and rougher than the last.
  const ridges = [
    { base: 0.58, amp: 0.09, fill: '#3a3557' },
    { base: 0.68, amp: 0.11, fill: '#2b2743' },
    { base: 0.79, amp: 0.09, fill: '#1d1a2e' },
    { base: 0.9, amp: 0.07, fill: '#100e1c' },
  ];
  for (const ridge of ridges) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const phase = rng() * 6.28;
    const rough = rng() * 0.5 + 0.5;
    for (let x = 0; x <= w; x += 8) {
      const t = x / w;
      const y =
        h * ridge.base -
        Math.sin(t * 5.1 + phase) * h * ridge.amp -
        Math.sin(t * 13.7 + phase * 2.3) * h * ridge.amp * 0.32 * rough;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = ridge.fill;
    ctx.fill();
  }

  // Grain, so the quantiser has something above a flat gradient to chew on.
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 5200; i += 1) {
    const x = rng() * w;
    const y = rng() * h;
    const size = 1 + rng() * 2;
    ctx.fillStyle = rng() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;

  return canvas.toDataURL('image/jpeg', 0.86);
}

export default function Demo() {
  const [src, setSrc] = useState<string | null>(null);

  // Painted after mount: there is no canvas during SSR, and the component
  // handles a src that has not arrived yet on its own.
  useEffect(() => {
    setSrc(paintSource());
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      {src ? (
        <DitherTrailImageReveal src={src} alt="Layered ridges under a low sun" />
      ) : (
        <div className="h-full w-full bg-surface" />
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-7">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg/70">
            Ordered Dither
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-fg/40">
            8 x 8 / 4 levels
          </span>
        </div>

        <div>
          <h2 className="max-w-[16ch] text-[clamp(1.8rem,5vw,2.9rem)] font-medium leading-[0.95] tracking-tight text-fg">
            The picture comes back where you touch it
          </h2>
          <p className="mt-3 max-w-[44ch] text-xs leading-relaxed text-fg/60">
            Twenty-four pointer samples in two uniform arrays. Each block is lit or not
            against an 8x8 Bayer threshold, and the image is displaced along the velocity
            the sample was born with.
          </p>
          <div className="mt-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fg/45">
            <span>1 quad</span>
            <span aria-hidden className="h-px w-6 bg-fg/25" />
            <span>30fps draw</span>
          </div>
        </div>
      </div>
    </div>
  );
}
