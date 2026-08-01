'use client';

import { DottedNotepadSurface } from '@/registry/ui/dotted-notepad-surface';

const ENTRIES = [
  { time: '09.12', body: 'Cut the onboarding to three screens. The fourth was only ever there to explain the third.' },
  { time: '10.40', body: 'Pitch is 26px because 18px starts fighting the body copy for attention.' },
  { time: '11.05', body: 'The fold is one gradient. Three stops, two of them hard. No blur anywhere near it.' },
  { time: '13.28', body: 'Edge mask is two linear gradients intersected — a radial one bends the corners.' },
  { time: '15.02', body: 'Grid scrolls with the page, not under it. That is the whole difference between paper and a window.' },
  { time: '16.47', body: 'Ship the surface, keep the shadow shallow, let the content carry the weight.' },
];

export default function Demo() {
  return (
    <div className="flex h-full w-full items-center justify-center p-5">
      <DottedNotepadSurface
        scrollable
        attachment="local"
        fold
        className="h-full w-full max-w-md border border-line"
        contentClassName="px-7 py-8"
      >
        <p className="meta mb-5">Field notes</p>
        <ul className="space-y-4">
          {ENTRIES.map((entry) => (
            <li key={entry.time} className="flex gap-4">
              <span className="shrink-0 pt-[2px] font-mono text-[11px] tabular-nums text-faint">
                {entry.time}
              </span>
              <span className="text-[13px] leading-relaxed text-muted">{entry.body}</span>
            </li>
          ))}
        </ul>
      </DottedNotepadSurface>
    </div>
  );
}
