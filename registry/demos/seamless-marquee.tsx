'use client';

import { SeamlessMarquee } from '@/registry/ui/seamless-marquee';

const DISPLAY = ['Letterpress', 'Foil', 'Debossed', 'Duplexed'];
/* Deliberately not award names. An earlier draft ran real jury names past on a
   loop, which reads as a list of prizes the site has won — a claim a demo has
   no business making on anyone's behalf. Any narrow, uniform-length set proves
   the same point: both rows share one speed and visibly match. */
const CAPTIONS = [
  'Uniform velocity',
  'Two content widths',
  'One duplicated track',
  'No layout thrash',
];

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-7">
      {/* Wide content set, 60 px/s. */}
      <SeamlessMarquee speed={60} gap={56} className="border-y border-line py-4">
        {DISPLAY.map((word) => (
          <span
            key={word}
            className="flex items-center gap-5 whitespace-nowrap text-2xl leading-none tracking-tight text-fg sm:text-4xl"
          >
            {word}
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
        ))}
      </SeamlessMarquee>

      {/* Narrow content set, the same 60 px/s — and it visibly matches. */}
      <SeamlessMarquee speed={60} gap={32} direction="right">
        {CAPTIONS.map((caption) => (
          <span key={caption} className="meta whitespace-nowrap">
            {caption}
          </span>
        ))}
      </SeamlessMarquee>
    </div>
  );
}
