'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { clamp } from '@/registry/lib/damp';
import { useClickSwallow } from '@/registry/ui/capture-phase-click-swallow';
import { useDragDeadzone } from '@/registry/ui/drag-deadzone-capture';

const NOTES = [
  { no: '01', title: 'Tide marks', body: 'Two hours of chalk lines on the sea wall, one per wave that reached furthest.' },
  { no: '02', title: 'Kiln log', body: 'Cone six held for forty minutes. The glaze pooled where the wall thickens.' },
  { no: '03', title: 'Rope test', body: 'Hemp stretched 4% under load and never came back. Sisal held its length.' },
  { no: '04', title: 'Paper weights', body: 'Sixteen sheets pressed overnight under a granite offcut and a phone book.' },
  { no: '05', title: 'Copper wash', body: 'The patina moved a full step greener in the week after it left the shop.' },
  { no: '06', title: 'Bench height', body: 'Raised 40mm. Everything downstream of it had to move by the same amount.' },
];

const ROW_CSS = `
.kx-swallow-row {
  translate: calc(var(--kx-swallow-x, 0) * 1px) 0;
}
`;

interface LogLine {
  id: number;
  text: string;
  eaten: boolean;
}

export default function Demo() {
  const [open, setOpen] = useState(0);
  const [opened, setOpened] = useState(0);
  const [eaten, setEaten] = useState(0);
  const [armed, setArmed] = useState(false);
  const [trail, setTrail] = useState<LogLine[]>([]);

  const panel = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);

  const offset = useRef(0);
  const maxOffset = useRef(0);
  const seq = useRef(0);

  // Newest first, three deep. A single status line would show the swallow and
  // then overwrite it, which hides the whole point: what the *next* click did.
  const log = (text: string, swallowed: boolean) => {
    seq.current += 1;
    const id = seq.current;
    setTrail((prev) => [{ id, text, eaten: swallowed }, ...prev].slice(0, 3));
  };

  const swallow = useClickSwallow(panel, {
    onSwallow: () => {
      setEaten((n) => n + 1);
      log('click swallowed — that press was a drag', true);
    },
  });

  // The arm lives about a quarter second. Sampling the ref is the honest way
  // to show it: the indicator goes out when the hook actually stands down,
  // whether that was the swallow consuming it or the timer expiring.
  // Clearing it also stops this loop, since `armed` is the enable flag.
  useRaf(() => {
    if (!swallow.armed.current) setArmed(false);
  }, armed);

  useDragDeadzone(panel, {
    axis: 'x',
    onPress: () => {
      const track = row.current;
      const frame = viewport.current;
      maxOffset.current = track && frame ? Math.max(0, track.scrollWidth - frame.clientWidth) : 0;
    },
    onDrag: (state) => {
      offset.current = clamp(offset.current + state.deltaX, -maxOffset.current, 0);
      row.current?.style.setProperty('--kx-swallow-x', offset.current.toFixed(1));
    },
    onDragEnd: (_state, end) => {
      // Armed only when the gesture cleared the dead zone. A press that never
      // moved produced a click the user meant, and eating it is the bug this
      // whole pairing exists to avoid.
      if (end.moved && !end.cancelled) {
        swallow.arm();
        setArmed(true);
      }
    },
  });

  const entry = NOTES[open];

  return (
    <div ref={panel} className="flex h-full w-full flex-col gap-4 p-6">
      <style href="kinetic-demo-capture-phase-click-swallow" precedence="medium">
        {ROW_CSS}
      </style>

      <header className="flex items-baseline justify-between gap-4">
        <span className="text-sm tracking-tight text-fg">Field notes</span>
        <span className="meta shrink-0 font-mono tabular-nums">
          {opened} opened &middot; {eaten} swallowed &middot;{' '}
          <span className={armed ? 'text-accent' : 'text-faint'}>{armed ? 'armed' : 'idle'}</span>
        </span>
      </header>

      <div ref={viewport} className="min-h-0 flex-1 overflow-hidden">
        <div ref={row} className="kx-swallow-row flex h-full gap-2">
          {NOTES.map((note, i) => {
            const live = i === open;
            return (
              <button
                key={note.no}
                type="button"
                onClick={(e) => {
                  // Reached only when the swallow let it through: either the
                  // press never became a drag, or detail === 0 marked it as
                  // Enter or Space on the focused card.
                  setOpen(i);
                  setOpened((n) => n + 1);
                  log(
                    e.detail === 0
                      ? 'Enter/Space opened ' + note.no + ' — detail 0, never swallowed'
                      : 'click opened ' + note.no,
                    false,
                  );
                }}
                aria-pressed={live}
                className={cn(
                  'flex w-24 shrink-0 flex-col justify-between rounded-sm border p-3 text-left transition-colors duration-200',
                  live ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <span
                  className={cn(
                    'font-mono text-[10px] tabular-nums',
                    live ? 'text-accent' : 'text-faint',
                  )}
                >
                  {note.no}
                </span>
                <span className="text-xs leading-tight tracking-tight text-fg">{note.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <p className="text-xs leading-relaxed text-muted">{entry?.body}</p>
        <ul className="flex flex-col gap-px font-mono text-[10px] leading-snug">
          {trail.length === 0 ? (
            <li className="text-faint">
              throw the row and let go over a card &middot; then click that card &middot; then Tab
              to one and press Enter
            </li>
          ) : (
            trail.map((line, i) => (
              <li
                key={line.id}
                className={cn(
                  i > 0 && 'text-faint',
                  i === 0 && (line.eaten ? 'text-accent' : 'text-muted'),
                )}
              >
                {line.eaten ? '× ' : '→ '}
                {line.text}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
