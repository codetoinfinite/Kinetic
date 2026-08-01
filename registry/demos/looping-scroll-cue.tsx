'use client';

import { LoopingScrollCue } from '@/registry/ui/looping-scroll-cue';

const DELAYS = [0, 0.18, 0.36];

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <section className="relative flex min-h-0 flex-1 flex-col justify-between p-6">
        <p className="meta">Kinetic — issue 04</p>

        <div>
          <h2 className="max-w-[16ch] text-3xl leading-[1.05] tracking-tight text-fg">
            Everything below is worth the scroll.
          </h2>
          <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted">
            The line hangs, dives, and hangs again. The pause is the part that
            reads as an instruction.
          </p>
        </div>

        {/* In situ: the cue sits at the foot of the hero, taking its colour
            from the surrounding text. */}
        <div className="flex items-end justify-between text-line-strong">
          <LoopingScrollCue length="4rem" />
          <span className="meta">Scroll</span>
        </div>
      </section>

      <section className="border-t border-line px-6 py-5">
        <div className="flex items-end gap-8">
          <div className="flex items-end gap-2 text-fg">
            {DELAYS.map((delay) => (
              <LoopingScrollCue key={delay} delay={delay} length="2.5rem" />
            ))}
          </div>
          <p className="meta">Staggered — one period, three offsets</p>
        </div>
      </section>
    </div>
  );
}
