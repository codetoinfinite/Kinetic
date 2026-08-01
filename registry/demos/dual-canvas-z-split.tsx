'use client';

import { DualCanvasZSplit } from '@/registry/ui/dual-canvas-z-split';

export default function Demo() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <DualCanvasZSplit density={900} split={0.36} sizeRange={[3, 30]}>
        <div className="flex h-full w-full flex-col justify-between p-6">
          <div className="flex items-start justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-fg mix-blend-difference">
            <span>Depth</span>
            <span>Two canvases</span>
          </div>

          <div className="mix-blend-difference">
            <h2 className="max-w-[12ch] text-3xl leading-[0.95] tracking-tight text-fg">
              Inside the field, not on it
            </h2>
            <p className="mt-2 max-w-[36ch] text-xs leading-relaxed text-fg/70">
              Half the dust passes behind this sentence and half in front — and the sentence is
              still text you can select.
            </p>
          </div>
        </div>
      </DualCanvasZSplit>
    </div>
  );
}
