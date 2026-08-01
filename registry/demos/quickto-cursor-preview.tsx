'use client';

import { QuickToCursorPreview } from '@/registry/ui/quickto-cursor-preview';

const items = [
  { id: 'atlas', title: 'Atlas Foundry', meta: 'Identity — 2025' },
  { id: 'harbour', title: 'Harbour Press', meta: 'Editorial — 2024' },
  { id: 'kestrel', title: 'Kestrel Optics', meta: 'Site — 2024' },
  { id: 'meridian', title: 'Meridian Salt', meta: 'Packaging — 2023' },
];

export default function Demo() {
  return (
    <QuickToCursorPreview
      items={items}
      className="h-full w-full bg-bg"
      panelWidth={200}
      panelHeight={140}
    />
  );
}
