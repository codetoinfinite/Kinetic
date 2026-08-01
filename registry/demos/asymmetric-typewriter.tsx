'use client';

import { AsymmetricTypewriter } from '@/registry/ui/asymmetric-typewriter';

const PHRASES = ['field guides', 'wayfinding', 'type systems', 'quiet tools'];

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-5 sm:p-7">
      <span className="meta">Ferrule Studio</span>

      <h2 className="text-2xl leading-[1.1] tracking-tight text-fg sm:text-4xl">
        <span className="block">We make</span>
        <AsymmetricTypewriter phrases={PHRASES} className="text-accent" />
      </h2>

      <p className="max-w-[38ch] text-sm leading-relaxed text-muted">
        Four disciplines, one studio. The line above reserves the width of its
        longest phrase, so nothing under it ever moves.
      </p>
    </div>
  );
}
