'use client';

import { BrowserChromeFrame } from '@/registry/ui/browser-chrome-frame';

/* The framed "site" is drawn, not loaded: a masthead, a gradient hero block
   and two text rules. Enough structure that the frame reads as chrome around
   a real page rather than around an empty box. */
const NAV = ['Work', 'Studio', 'Journal'];

export default function Demo() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <BrowserChromeFrame
        url="https://example.studio/case-study/harbour"
        className="max-h-full w-full max-w-[560px]"
      >
        <div className="flex h-full w-full flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[0.8125rem] tracking-tight text-fg">Harbour</span>
            <nav className="flex gap-4">
              {NAV.map((item) => (
                <span key={item} className="text-[0.6875rem] text-faint">
                  {item}
                </span>
              ))}
            </nav>
          </header>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: [
                  'radial-gradient(120% 90% at 18% 6%, oklch(0.68 0.14 232 / 0.5), transparent 64%)',
                  'linear-gradient(162deg, oklch(0.42 0.11 244) 0%, oklch(0.24 0.07 262) 58%, oklch(0.14 0.03 274) 100%)',
                ].join(', '),
              }}
            />
            <div className="relative flex h-full flex-col justify-end gap-2 p-4">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-white/55">
                Case study
              </span>
              <span className="max-w-[22ch] text-balance text-lg leading-tight text-white">
                A harbour rebuilt in eleven weeks
              </span>
            </div>
          </div>

          <div className="shrink-0 space-y-2 border-t border-line px-4 py-3">
            <div className="h-1.5 w-full rounded-full bg-surface" />
            <div className="h-1.5 w-3/5 rounded-full bg-surface" />
          </div>
        </div>
      </BrowserChromeFrame>
    </div>
  );
}
