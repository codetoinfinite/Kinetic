'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Accent Swatch Picker" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { RiAddLine, RiArrowUpLine, RiMicLine, RiStopFill } from '@remixicon/react';

import { AccentScope, AccentSwatchPicker, findAccentSwatch } from '@/registry/ui/accent-swatch-picker';
import { ComposerLoader } from '@/registry/ui/composer-loader';
import { Switch } from '@/registry/ui/switch';

/* Picking a sphere rewrites `--accent` on the scope below the heading: the
   send button gradient, the switch, the focus rings and the swatch outline
   all read it. The loader band is SVG and takes hex stops, so each swatch
   also maps to a four-stop band. */
type Band = [string, string, string, string];
const IRIDESCENT: Band = ['#5eead4', '#46baec', '#e633a4', '#00faa7'];
const BANDS: Record<string, Band> = {
  iridescent: IRIDESCENT,
  blue: ['#93c5fd', '#3b82f6', '#1d4ed8', '#60a5fa'],
  violet: ['#c4b5fd', '#8b5cf6', '#6d28d9', '#a78bfa'],
  pink: ['#f9a8d4', '#ec4899', '#be185d', '#f472b6'],
  red: ['#fca5a5', '#ef4444', '#b91c1c', '#f87171'],
  green: ['#86efac', '#22c55e', '#15803d', '#4ade80'],
  orange: ['#fdba74', '#f97316', '#c2410c', '#fbbf24'],
};

export default function Demo() {
  const [accent, setAccent] = useState('iridescent');
  const [working, setWorking] = useState(true);
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState('');
  const swatch = findAccentSwatch(accent);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setDraft('');
    setWorking(true);
  };

  return (
    <AccentScope color={swatch.color} className="flex w-full max-w-[680px] flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <h3 className="text-title-2-semibold text-text-primary">Pick a colour for the composer</h3>
        <p className="max-w-[440px] text-body-regular text-text-secondary">
          Each sphere sets one custom property, and the light, the send button and the switch follow it.
        </p>
      </div>

      <AccentSwatchPicker size="lg" value={accent} onChange={setAccent} label="Accent colour" />

      <div className="w-full">
        <ComposerLoader active={working} colors={BANDS[accent] ?? IRIDESCENT}>
          <form onSubmit={submit} className="flex h-[52px] w-full items-center gap-2 bg-transparent p-2">
            <button
              type="button"
              aria-label="Add attachment"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background-secondary-default text-foreground-icon-secondary transition-colors duration-150 ease-out hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none"
            >
              <RiAddLine className="size-5" aria-hidden />
            </button>
            <input
              aria-label="Message"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask me anything"
              autoComplete="off"
              className="h-6 min-w-0 flex-1 bg-transparent text-start text-body-regular text-text-primary caret-(--accent) outline-none placeholder:text-text-tertiary"
            />
            <span className="hidden shrink-0 text-body-2-medium text-text-secondary sm:inline">Fable 5</span>
            <button
              type="button"
              aria-label="Dictate"
              aria-pressed={listening}
              onClick={() => setListening((v) => !v)}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-icon-secondary transition-colors duration-150 ease-out hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:outline-none aria-pressed:bg-button-ghost-background aria-pressed:text-button-ghost-foreground"
            >
              <RiMicLine className="size-5" aria-hidden />
            </button>
            {working ? (
              <button
                type="button"
                aria-label="Stop generating"
                onClick={() => setWorking(false)}
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-button-primary text-text-white shadow-xs focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <RiStopFill className="size-4" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send message"
                className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-button-primary text-text-white shadow-xs focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <RiArrowUpLine className="size-5" aria-hidden />
              </button>
            )}
          </form>
        </ComposerLoader>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Switch size="sm" isSelected={working} onChange={setWorking}>
          Agent working
        </Switch>
        <AccentSwatchPicker size="sm" variant="pill" value={accent} onChange={setAccent} label="Accent colour, compact" />
      </div>

      <p className="text-caption-1-medium text-text-tertiary" aria-live="polite">
        {swatch.label} · <code className="font-mono">--accent: {swatch.color}</code>
      </p>
    </AccentScope>
  );
}
