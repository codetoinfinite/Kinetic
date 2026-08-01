'use client';

import { NestedSplitRestore } from '@/registry/ui/nested-splittext-restore';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col justify-between p-5 sm:p-7">
      <span className="meta">Colophon</span>

      {/* Deliberately mixed markup: a heading, an em and a strong. All of it is
          still here, tag for tag, after the split has been reverted. */}
      <NestedSplitRestore>
        <h2 className="text-2xl leading-[1.15] tracking-tight text-fg sm:text-3xl">
          Set in Meridian, drawn between jobs since 2021.
        </h2>
        <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted">
          Every line rises out of its own mask, and the{' '}
          <em className="text-fg">emphasis</em> and the{' '}
          <strong className="font-normal text-accent">weight</strong> survive it —
          the paragraph is handed back exactly as it was written.
        </p>
      </NestedSplitRestore>

      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="meta">Two sizes</span>
        <span className="meta">Lines, masked</span>
      </div>
    </div>
  );
}
