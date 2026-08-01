'use client';

import { StepEndCaret } from '@/registry/ui/step-end-caret';

export default function Demo() {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-6 bg-bg px-6 py-8">
      <div>
        <p className="meta">Enquiries</p>
        <p className="mt-2 text-[clamp(18px,4vw,30px)] leading-tight tracking-tight text-fg">
          Tell us what you are printing
          <StepEndCaret className="ml-[0.12em]" />
        </p>
      </div>

      <div className="rule" />

      <div className="flex flex-col gap-3 font-mono text-xs text-muted">
        <p>
          <span className="text-faint">$</span> press build --edition 12
          <StepEndCaret width={7} height="0.9em" period={0.72} className="ml-[0.35em]" />
        </p>
        <p>
          <span className="text-faint">$</span> awaiting proof
          <StepEndCaret paused className="ml-[0.35em]" />
          <span className="ml-3 text-faint">held while keys are down</span>
        </p>
      </div>
    </div>
  );
}
