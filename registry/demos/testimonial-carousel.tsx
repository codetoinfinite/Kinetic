'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Testimonial Carousel" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { TestimonialCarousel } from '@/registry/ui/testimonial-carousel';
import type { Testimonial } from '@/registry/ui/testimonial-carousel';

const ITEMS: Testimonial[] = [
  {
    id: 'mara',
    name: 'Mara Lindqvist',
    role: 'Founder',
    company: 'Fieldnote',
    companyHref: '#fieldnote',
    handle: '@maralind',
    avatarColor: 'blue',
    quote: 'We replaced three half-finished internal kits in a week. The tokens map straight onto our brand and dark mode just worked.',
  },
  {
    id: 'theo',
    name: 'Theo Okafor',
    role: 'Staff engineer',
    company: 'Parcelwise',
    companyHref: '#parcelwise',
    handle: '@theo_ok',
    avatarColor: 'lime',
    quote: 'Our agent installs components through MCP now. Pull requests come back looking like a designer touched them.',
  },
  {
    id: 'ines',
    name: 'Inès Moreau',
    role: 'Product designer',
    company: 'Halcyon',
    handle: '@inesdraws',
    avatarColor: 'pink',
    quote: 'The Figma file and the code finally agree. I hand off a spacing value and it ships as that spacing value.',
  },
  {
    id: 'kenji',
    name: 'Kenji Watanabe',
    role: 'CTO',
    company: 'Lumen Labs',
    companyHref: '#lumen',
    handle: '@kwatanabe',
    quote: 'Pricing, dashboards, settings pages. We launched the whole app shell before the backend was done.',
  },
];

export default function Demo() {
  const [index, setIndex] = useState(0);

  return (
    <div className="flex h-full w-full flex-col justify-center overflow-y-auto bg-background-full py-16">
      <TestimonialCarousel
        items={ITEMS}
        label="Already used by startups and developers"
        onIndexChange={setIndex}
      />
      <p data-demo="index" className="mt-6 text-center text-caption-1-regular text-text-tertiary tabular-nums">
        Quote {index + 1} of {ITEMS.length}
      </p>
    </div>
  );
}
