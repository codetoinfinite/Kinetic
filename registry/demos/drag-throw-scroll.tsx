'use client';

import { useRef, type CSSProperties } from 'react';
import { DragThrowScroll } from '@/registry/ui/drag-throw-scroll';

const ENTRIES = [
  { index: '01', title: 'Salt Pavilion', year: '2025', kind: 'Identity' },
  { index: '02', title: 'Northern Foundry', year: '2025', kind: 'Site' },
  { index: '03', title: 'Terrace House', year: '2024', kind: 'Film' },
  { index: '04', title: 'Reading Room', year: '2024', kind: 'Identity' },
  { index: '05', title: 'Low Tide Press', year: '2024', kind: 'Editorial' },
  { index: '06', title: 'Copper Assembly', year: '2023', kind: 'Site' },
  { index: '07', title: 'Quiet Machines', year: '2023', kind: 'Film' },
  { index: '08', title: 'Marsh Observatory', year: '2023', kind: 'Site' },
  { index: '09', title: 'Paper Harbour', year: '2022', kind: 'Editorial' },
  { index: '10', title: 'Slate Concourse', year: '2022', kind: 'Identity' },
  { index: '11', title: 'Field Notation', year: '2022', kind: 'Editorial' },
  { index: '12', title: 'Third Coast', year: '2021', kind: 'Film' },
];

/**
 * The component is pointed at this preview's own box, so the drag, the
 * velocity window and the decay are all real and none of it touches the page
 * hosting the preview. Omit `scroller` in a real page and the identical
 * physics drive the document through the shared Lenis instance instead.
 */
export default function Demo() {
  const scroller = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const span = el.scrollHeight - el.clientHeight;
    rail.current?.style.setProperty(
      '--kx-progress',
      span > 0 ? (el.scrollTop / span).toFixed(4) : '0',
    );
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div
        ref={scroller}
        onScroll={onScroll}
        // Direct `scrollTop` writes and `scroll-behavior: smooth` fight each
        // other; the drag would feel rubbery instead of attached.
        style={{ scrollBehavior: 'auto' }}
        className="scrollbar-none h-full w-full overflow-y-auto"
      >
        <DragThrowScroll scroller={scroller} className="pt-11 pb-11">
          {ENTRIES.map((entry) => (
            <article
              key={entry.index}
              className="group flex items-baseline gap-4 border-b border-line px-5 py-4"
            >
              <span className="meta w-6 shrink-0 tabular-nums text-faint">{entry.index}</span>
              <h3 className="flex-1 truncate text-base tracking-tight text-fg">{entry.title}</h3>
              <span className="meta hidden shrink-0 sm:block">{entry.kind}</span>
              <span className="meta w-8 shrink-0 text-right tabular-nums">{entry.year}</span>
            </article>
          ))}
        </DragThrowScroll>
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between border-b border-line bg-bg/85 px-5 py-3 backdrop-blur-sm">
        <p className="meta">Selected work</p>
        <p className="meta text-faint">{ENTRIES.length}</p>
      </header>

      <div
        ref={rail}
        style={{ '--kx-progress': '0' } as CSSProperties}
        className="pointer-events-none absolute inset-y-11 right-0 w-px bg-line"
      >
        {/* `top` resolves its percentage against the rail, so the thumb tracks
            progress without anyone measuring the rail in JavaScript. */}
        <div
          className="absolute h-6 w-px bg-accent"
          style={{ top: 'calc(var(--kx-progress) * (100% - 1.5rem))' }}
        />
      </div>
    </div>
  );
}
