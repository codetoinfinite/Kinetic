'use client';

import { PointerVarGradient } from '@/registry/ui/pointer-var-gradient';

export default function Demo() {
  return (
    <PointerVarGradient className="h-full w-full" intensity={0.14}>
      <div className="flex h-full w-full flex-col justify-between p-6 sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
          Two properties
        </p>
        <div>
          <h2 className="max-w-md text-3xl leading-[0.95] tracking-tight text-fg sm:text-5xl">
            Let&rsquo;s
            <br />
            collaborate.
          </h2>
          {/* Plain labels, not links: the gallery wraps every preview in a
              link to its page, and an <a> inside an <a> is invalid HTML. */}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span>Studio</span>
            <span>Index</span>
            <span>Contact</span>
          </div>
        </div>
      </div>
    </PointerVarGradient>
  );
}
