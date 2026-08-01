'use client';

import { useRef } from 'react';
import {
  KeyframeParamObject,
  type KeyframeSection,
} from '@/registry/ui/keyframe-param-object';

// Module scope: the build effect takes `sections` as a dependency, so an
// inline array would rebuild the whole timeline on every render.
const SECTIONS: KeyframeSection[] = [
  {
    id: 'cast',
    label: '01',
    title: 'The mark is cast oversized',
    body: 'It sits still and warm while the type is read.',
    to: { scale: 1.15, glow: 0.5 },
  },
  {
    id: 'turn',
    label: '02',
    title: 'It turns a quarter and drifts left',
    body: 'One row of the table moves four properties at once.',
    to: { spin: 0.25, driftX: -22, scale: 1, glow: 0.9 },
  },
  {
    id: 'thin',
    label: '03',
    title: 'Then thins out to almost nothing',
    at: 0.4,
    to: { dissolve: 0.75, glow: 0.15, driftY: -14 },
  },
  {
    id: 'settle',
    label: '04',
    title: 'And resolves square to the frame',
    body: 'The last row is the resting state a reader leaves with.',
    to: { spin: 0, driftX: 0, driftY: 0, dissolve: 0, scale: 1, glow: 0.6 },
  },
];

export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        className="scrollbar-none h-full w-full overflow-y-auto overscroll-contain"
      >
        <div className="px-5 pt-6">
          <p className="meta">Chapter two</p>
          <h2 className="mt-2 max-w-[20ch] text-lg leading-tight tracking-tight text-fg">
            One object, four rows, the whole sequence.
          </h2>
        </div>

        <KeyframeParamObject sections={SECTIONS} scrollerRef={scroller} className="px-5" />
      </div>
    </div>
  );
}
