'use client';

import { CharStaggerScaleUp } from '@/registry/ui/char-stagger-scale-up';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-5 sm:p-7">
      <span className="meta">Slow Radio — season three</span>

      <CharStaggerScaleUp
        text="Nine Hours"
        delay={0.2}
        className="gap-4"
        textClassName="text-4xl leading-none tracking-tight text-fg sm:text-6xl"
      >
        <p className="max-w-[34ch] text-center text-sm leading-relaxed text-muted">
          Field recordings from the coast road, unedited, playing until morning.
        </p>
      </CharStaggerScaleUp>

      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="meta">Continuous</span>
        <span className="meta text-accent">Listen</span>
      </div>
    </div>
  );
}
