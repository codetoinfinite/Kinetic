'use client';

import { useState } from 'react';
import { I18nProvider, parseColor } from 'react-aria-components';
import type { Color } from 'react-aria-components';

import { ColorPicker, ColorWell } from '@/registry/ui/color-picker';

/* Preset colours are data the picker offers, not page styling. */
const PRESETS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#d946ef'];

const LABELS = [
  { name: 'Design', color: '#d946ef' },
  { name: 'Engineering', color: '#06b6d4' },
  { name: 'Marketing', color: '#f97316' },
] as const;

/* The inline editor with presets, as BoardUI previews it, driving a live brand
   preview; beside it, a label list where each round swatch opens the same
   editor in a popover (one with the opacity rail). */
export default function Demo() {
  const [brand, setBrand] = useState<Color>(parseColor('#6366f1'));

  // React Aria formats dates and numbers in the browser's language; pin it to
  // en-US so the values match this demo's English copy and the server render.
  return (
    <I18nProvider locale="en-US">
      <div className="flex flex-wrap items-start justify-center gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-semibold text-text-primary">Brand color</span>
            <span className="flex items-center gap-2 rounded-full bg-background-secondary-default py-1 ps-1 pe-2.5">
              <span className="size-4 rounded-full" style={{ backgroundColor: brand.toString('css') }} aria-hidden />
              <span className="font-mono text-caption-1-medium text-text-primary">{brand.toString('hex')}</span>
            </span>
          </div>
          <ColorPicker value={brand} onChange={setBrand} swatches={PRESETS} />
        </div>

        <div className="flex w-[260px] flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
          <span className="text-body-semibold text-text-primary">Project labels</span>
          <span className="text-caption-1-regular text-text-secondary">Click a swatch to recolour it</span>
          <ul className="mt-3 flex flex-col gap-1">
            {LABELS.map((label) => (
              <li key={label.name} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
                <ColorWell aria-label={`${label.name} label color`} defaultValue={label.color} swatches={PRESETS} />
                <span className="text-body-medium text-text-primary">{label.name}</span>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <ColorWell aria-label="Highlight color" defaultValue="rgba(234, 179, 8, 0.4)" showAlpha />
              <span className="text-body-medium text-text-primary">Highlight</span>
              <span className="ms-auto text-caption-1-regular text-text-tertiary">with opacity</span>
            </li>
          </ul>
        </div>
      </div>
    </I18nProvider>
  );
}
