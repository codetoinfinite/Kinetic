'use client';

import { useRef, useState } from 'react';
import { AxisReveals } from '@/registry/ui/container-animation-reveals';
import {
  PinnedHorizontalTrack,
  type PinnedTrack,
} from '@/registry/ui/pinned-horizontal-track';

const LINES = ['Studio notes,', 'written sideways', 'and downward.'];

const PANELS = [
  { index: '01', head: 'Measure once', body: 'Then measure again after the fonts land.' },
  { index: '02', head: 'One engine', body: 'The same stagger drives both directions.' },
  { index: '03', head: 'Two axes', body: 'Only the position keywords change.' },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);
  const [track, setTrack] = useState<PinnedTrack | null>(null);

  return (
    <div ref={scroller} className="scrollbar-none h-full w-full overflow-y-auto bg-bg">
      {/* Vertical axis: no container animation passed at all. */}
      <AxisReveals scroller={scroller} className="flex h-full flex-col justify-end p-6">
        <div data-reveal-group>
          <p className="meta mb-3">Downward</p>
          {LINES.map((line) => (
            <span key={line} className="block overflow-hidden">
              <span
                data-reveal
                className="block text-2xl leading-tight tracking-tight text-fg will-change-transform"
              >
                {line}
              </span>
            </span>
          ))}
        </div>
      </AxisReveals>

      {/* Horizontal axis: identical markup, identical component, one extra prop. */}
      <PinnedHorizontalTrack scroller={scroller} onTrack={setTrack}>
        <AxisReveals
          scroller={scroller}
          containerAnimation={track?.animation ?? null}
          className="contents"
        >
          {PANELS.map((panel) => (
            <article
              key={panel.index}
              data-reveal-group
              className="flex w-[72%] min-w-[210px] shrink-0 flex-col justify-end border-r border-line p-6"
            >
              <p className="meta mb-3">Sideways · {panel.index}</p>
              <span className="block overflow-hidden">
                <span
                  data-reveal
                  className="block text-xl leading-tight tracking-tight text-fg will-change-transform"
                >
                  {panel.head}
                </span>
              </span>
              <span className="mt-2 block overflow-hidden">
                <span
                  data-reveal
                  className="block max-w-[26ch] text-sm leading-relaxed text-muted will-change-transform"
                >
                  {panel.body}
                </span>
              </span>
            </article>
          ))}
        </AxisReveals>
      </PinnedHorizontalTrack>

      <section className="flex h-full flex-col justify-start p-6">
        <div className="rule" />
        <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-muted">
          Both sets of lines used the same builder. Only the position keywords
          differ between the two axes.
        </p>
      </section>
    </div>
  );
}
