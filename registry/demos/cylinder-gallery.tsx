'use client';

import { CylinderGallery, type CylinderGalleryItem } from '@/registry/ui/cylinder-gallery';

const TITLES = [
  'Halcyon',
  'Field Notes',
  'Salt Flat',
  'Meridian',
  'Low Tide',
  'Cassette',
  'Northline',
  'Paper Mill',
  'Anodise',
  'Dry Season',
  'Foxglove',
  'Interval',
  'Blue Hour',
  'Kiln',
  'Wavelength',
  'Terrazzo',
  'Offcut',
  'Nocturne',
  'Marginalia',
];

const ITEMS: CylinderGalleryItem[] = TITLES.map((title, index) => ({
  id: `plate-${index}`,
  title,
  meta: `20${(index % 6) + 20} — Print`,
  hue: (index * 360) / TITLES.length,
}));

export default function Demo() {
  return (
    <div className="relative h-full w-full bg-bg">
      <CylinderGallery items={ITEMS} />
      <p className="meta pointer-events-none absolute left-4 top-4">Selected Works</p>
    </div>
  );
}
