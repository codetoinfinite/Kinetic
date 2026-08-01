'use client';

import { useState } from 'react';
import { useSpringEasing, type SpringConfig } from '@/registry/ui/spring-to-linear-easing';

const PRESETS: { name: string; spring: SpringConfig }[] = [
  { name: 'Snap', spring: { stiffness: 220, bounce: 0.15 } },
  { name: 'Spring', spring: { stiffness: 100, damping: 10 } },
  { name: 'Loose', spring: { stiffness: 60, bounce: 0.6 } },
];

const BASE_CSS = `
.kx-spring-track {
  position: relative;
  container-type: inline-size;
}
.kx-spring-mover {
  position: absolute;
  top: 50%;
  left: 0;
  width: 1.1rem;
  height: 1.1rem;
  margin-top: -0.55rem;
  border-radius: 4px;
  background-color: var(--color-accent);
  translate: 0 0;
  transition-property: translate;
}
/* 100cqw is the track's own width, so the square lands flush with the right
   edge at any container size without measuring anything in JavaScript. */
.kx-spring-mover[data-run='1'] {
  translate: calc(100cqw - 1.1rem) 0;
}
`;

/** Plots the sampled curve. The dashed line is 100% — anything above it is overshoot. */
function Curve({ samples }: { samples: readonly number[] }) {
  const last = samples.length - 1;
  const points = samples
    .map((p, i) => `${((i / last) * 100).toFixed(2)},${(34 - p * 26).toFixed(2)}`)
    .join(' ');

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="h-7 w-14 shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <line x1="0" y1="8" x2="100" y2="8" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 3" className="text-line" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.4" className="text-accent" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Row({ name, spring, run }: { name: string; spring: SpringConfig; run: boolean }) {
  const { easing, fallback, durationMs, samples } = useSpringEasing(spring);
  const peak = Math.round(Math.max(...samples) * 100);
  const id = `kx-spring-${name.toLowerCase()}`;

  /* Two declarations of the same property, in this order. A browser without
     linear() cannot parse the second and keeps the first. Routing the value
     through a custom property would break that: an unsupported value inside
     var() is invalid at computed-value time and falls back to the property's
     initial value, not to the previous declaration. */
  const css = `
.${id} {
  transition-duration: ${durationMs}ms;
  transition-timing-function: ${fallback};
  transition-timing-function: ${easing};
}
`;

  return (
    <div className="flex items-center gap-3">
      <style>{css}</style>
      <span className="w-12 shrink-0 text-[11px] tracking-tight text-fg">{name}</span>
      <Curve samples={samples} />
      <div className="kx-spring-track h-7 min-w-0 flex-1 rounded border border-line bg-surface">
        <span className={`kx-spring-mover ${id}`} data-run={run ? '1' : '0'} />
      </div>
      <span className="w-20 shrink-0 text-right font-mono text-[10px] text-faint">
        {durationMs}ms &middot; {peak}%
      </span>
    </div>
  );
}

export default function Demo() {
  const [run, setRun] = useState(false);

  return (
    <div className="flex h-full w-full flex-col justify-center gap-5 p-6">
      <style href="kinetic-demo-spring-to-linear-easing" precedence="medium">
        {BASE_CSS}
      </style>

      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-sm tracking-tight text-fg">Compositor springs</span>
          <span className="meta">solved once, sampled to linear()</span>
        </div>
        <button
          type="button"
          onClick={() => setRun((r) => !r)}
          className="rounded-full border border-line-strong px-4 py-1 text-[11px] tracking-tight text-fg transition-colors hover:bg-surface"
        >
          {run ? 'Return' : 'Run'}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {PRESETS.map((preset) => (
          <Row key={preset.name} name={preset.name} spring={preset.spring} run={run} />
        ))}
      </div>
    </div>
  );
}
