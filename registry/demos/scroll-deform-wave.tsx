'use client';

import { useState } from 'react';
import { ScrollDeformWave } from '@/registry/ui/scroll-deform-wave';

const SECTIONS = [
  { title: 'Coastal Survey', body: 'Eleven weeks along the northern shelf, photographed at first light.' },
  { title: 'Tidal Register', body: 'Every frame timed to the hour the water turned.' },
  { title: 'Salt Index', body: 'Prints made from the plates left out in the weather.' },
  { title: 'Colophon', body: 'Set in a single weight. Bound by hand in editions of forty.' },
];

export default function Demo() {
  // A callback ref into state, not a plain ref: the hook needs the element
  // itself, and a ref would still read null on the render that matters.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  return (
    <div ref={setScroller} className="h-full w-full overflow-y-auto bg-bg scrollbar-none">
      <div className="sticky top-0 h-[62%] w-full">
        <ScrollDeformWave scrollTarget={scroller} />
      </div>
      <div className="relative bg-bg">
        {SECTIONS.map((section) => (
          <section key={section.title} className="border-t border-line px-4 py-8">
            <p className="text-sm tracking-tight text-fg">{section.title}</p>
            <p className="mt-2 text-sm text-muted">{section.body}</p>
          </section>
        ))}
        <p className="meta px-4 py-6">Keep scrolling — the surface answers the speed.</p>
      </div>
    </div>
  );
}
