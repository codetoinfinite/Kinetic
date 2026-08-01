'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/cn';

export interface CodeFile {
  path: string;
  target: string;
  /** Pre-highlighted on the server. Never highlighted in the browser. */
  html: string;
  code: string;
  /** Registry kind, shown as the rail's right-hand label: ui, hook, lib. */
  kind?: string;
}

/* ==========================================================================
   The source viewer.
   --------------------------------------------------------------------------
   Every file is highlighted on the server and shipped as HTML; this component
   only decides which one is visible. Highlighting on the client would mean
   loading grammars for a language the visitor may never look at, and a
   noticeable delay on the tab they do.

   Hidden panels stay in the DOM rather than being unmounted — switching tabs
   is instant, and Cmd-F finds text in a file you are not currently looking at,
   which on a page whose purpose is "read the code" is the difference between
   a viewer and a snippet box.

   Two layouts, because the catalogue's file counts span 1 to 13. A row of
   thirteen tabs is a scrolling strip where the file you want is off-screen and
   there is no way to know it exists; past RAIL_FROM the tablist becomes a
   vertical file list on wide viewports, which reads as a project tree and shows
   every entry at once. Narrow viewports keep the strip — there is no room for a
   16rem rail beside a code column at 380px.
   ========================================================================== */

const RAIL_FROM = 4;

interface Box {
  x: number;
  w: number;
  y: number;
  h: number;
}

export function CodeTabs({ files }: { files: CodeFile[] }) {
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = files[active] ?? files[0];

  // The indicator is measured from the selected tab's offset box rather than
  // owned by it, which is the only way a single element can slide between tabs.
  // Both axes are recorded on every pass so the same state serves the strip and
  // the rail without asking matchMedia which layout is live.
  useEffect(() => {
    const list = listRef.current;
    if (list === null) return;

    const measure = () => {
      const tab = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (tab === null) return;
      const next: Box = { x: tab.offsetLeft, w: tab.offsetWidth, y: tab.offsetTop, h: tab.offsetHeight };
      // Bailing on an unchanged box matters: the observer fires for layout that
      // this effect's own render can cause, and a fresh object every time would
      // be a loop.
      setBox((prev) =>
        prev !== null && prev.x === next.x && prev.w === next.w && prev.y === next.y && prev.h === next.h
          ? prev
          : next,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const tab of list.querySelectorAll('[role="tab"]')) observer.observe(tab);
    return () => observer.disconnect();
  }, [active, files]);

  if (current === undefined) return null;

  const rail = files.length >= RAIL_FROM;
  const tabId = (index: number) => `${id}-tab-${index}`;
  const panelId = (index: number) => `${id}-panel-${index}`;

  const select = (index: number) => {
    setActive(index);
    const tab = document.getElementById(tabId(index));
    tab?.focus();
    // Keeps a tab that arrow keys reached from sitting outside the strip.
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;

    if (step !== 0) {
      event.preventDefault();
      select((active + step + files.length) % files.length);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      select(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      select(files.length - 1);
    }
  };

  return (
    <div className="panel overflow-hidden">
      <div
        className={cn(
          'min-w-0',
          rail && 'lg:grid lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:items-stretch',
        )}
      >
        <div
          ref={listRef}
          role="tablist"
          aria-label="Files"
          aria-orientation={rail ? undefined : 'horizontal'}
          onKeyDown={onKeyDown}
          className={cn(
            'scrollbar-none relative flex items-stretch overflow-x-auto border-b border-line bg-bg-subtle',
            rail &&
              'lg:flex-col lg:items-start lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:border-b-0 lg:py-2',
          )}
        >
          {files.map((file, index) => {
            const selected = index === active;
            const dir = file.target.slice(0, file.target.lastIndexOf('/'));

            return (
              <button
                key={file.path}
                type="button"
                role="tab"
                id={tabId(index)}
                aria-selected={selected}
                aria-controls={panelId(index)}
                // Only the selected tab is a tab stop; arrow keys move between
                // them, which is what a tablist is expected to do.
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                className={cn(
                  'relative shrink-0 px-4 py-3 text-left font-mono text-[0.75rem] whitespace-nowrap transition-colors duration-instant',
                  selected ? 'text-fg' : 'text-faint hover:text-muted',
                  rail && 'lg:w-full lg:shrink lg:px-4 lg:py-2 lg:whitespace-normal',
                )}
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 truncate">{file.path.split('/').pop()}</span>
                  {file.kind === undefined ? null : (
                    <span className="ml-auto hidden text-[0.625rem] tracking-[0.08em] text-faint uppercase lg:inline">
                      {file.kind}
                    </span>
                  )}
                </span>
                {rail && dir.length > 0 ? (
                  <span className="mt-0.5 hidden truncate text-[0.6875rem] text-faint lg:block">
                    {dir}/
                  </span>
                ) : null}
              </button>
            );
          })}

          {/* Decorative: the selected tab already carries its own colour, so a
              measurement that never lands cannot hide which file is open. */}
          {box === null ? null : (
            <>
              <span
                aria-hidden="true"
                style={{ transform: `translateX(${box.x}px)`, width: `${box.w}px` }}
                className={cn(
                  'pointer-events-none absolute bottom-0 left-0 h-px bg-accent transition-[transform,width] duration-control ease-out-quart',
                  rail && 'lg:hidden',
                )}
              />
              {rail ? (
                <span
                  aria-hidden="true"
                  style={{ transform: `translateY(${box.y}px)`, height: `${box.h}px` }}
                  className="pointer-events-none absolute -right-px top-0 hidden w-[2px] bg-accent transition-[transform,height] duration-control ease-out-quart lg:block"
                />
              ) : null}
            </>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2">
            <span className="meta shrink-0 text-faint">installs to</span>
            <span className="scrollbar-none min-w-0 flex-1 overflow-x-auto font-mono text-[0.75rem] whitespace-nowrap text-muted">
              {current.target}
            </span>
            <CopyButton value={current.code} label="Copy file" className="shrink-0 border-0" />
          </div>

          {files.map((file, index) => (
            <div
              key={file.path}
              role="tabpanel"
              id={panelId(index)}
              aria-labelledby={tabId(index)}
              data-file={file.target}
              hidden={index !== active}
              tabIndex={0}
              className="scrollbar-none max-h-[38rem] overflow-auto p-5 text-[0.8125rem] leading-[1.65] [&_pre]:bg-transparent"
              dangerouslySetInnerHTML={{ __html: file.html }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
