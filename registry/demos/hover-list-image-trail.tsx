'use client';

import { HoverListImageTrail } from '@/registry/ui/hover-list-image-trail';

const rows = [
  { id: 'kiln', label: 'Kiln Records', meta: 'Identity' },
  { id: 'tarn', label: 'Tarn Observatory', meta: 'Site' },
  { id: 'osier', label: 'Osier & Reed', meta: 'Packaging' },
  { id: 'flint', label: 'Flint Quarterly', meta: 'Editorial' },
  { id: 'marl', label: 'Marl Ceramics', meta: 'Site' },
];

export default function Demo() {
  return (
    <HoverListImageTrail
      rows={rows}
      className="h-full w-full"
      tileWidth={132}
      tileHeight={92}
    />
  );
}
