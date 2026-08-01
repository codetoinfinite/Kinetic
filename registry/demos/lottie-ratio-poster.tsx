'use client';

import { useCallback, useState } from 'react';
import {
  LottieRatioPoster,
  type LottieRatioSource,
} from '@/registry/ui/lottie-ratio-poster';

/* A Lottie root object, built in code. No asset is committed to the registry,
   and none is needed: the only fields this technique reads are `w` and `h`. */
interface DemoLottie extends LottieRatioSource {
  v: string;
  fr: number;
  ip: number;
  op: number;
  nm: string;
  layers: { ty: number; nm: string }[];
}

const SOURCE: DemoLottie = {
  v: '5.13.0',
  fr: 30,
  ip: 0,
  op: 90,
  w: 900,
  h: 600,
  nm: 'ratio-demo',
  layers: [{ ty: 4, nm: 'ring' }],
};

/** A 16:9 guess against a 3:2 composition — a wrong guess, on purpose. */
const GUESS = 16 / 9;
/** Stand-in for a megabyte of JSON over a slow connection. */
const LATENCY = 1100;

export default function Demo() {
  const [nonce, setNonce] = useState(0);

  const load = useCallback(
    () =>
      new Promise<DemoLottie>((resolve) => {
        window.setTimeout(() => resolve(SOURCE), LATENCY);
      }),
    [],
  );

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="flex shrink-0 items-start gap-3 px-4 pt-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
            reserve · fetch · swap
          </p>
          <p className="mt-1 max-w-[42ch] text-[13px] leading-snug text-muted">
            The box is reserved at a guessed ratio before anything is fetched. The JSON
            arrives carrying its own <span className="font-mono">w</span> and{' '}
            <span className="font-mono">h</span>, the box corrects, and the readout prices
            the guess in pixels of shift.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNonce((n) => n + 1)}
          className="ml-auto shrink-0 rounded-sm border border-line-strong px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-fg transition-colors hover:bg-surface"
        >
          replay
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
        <div className="w-full max-w-[380px]">
          <LottieRatioPoster<DemoLottie>
            key={nonce}
            ratio={GUESS}
            load={load}
            label="ring · 900x600"
          >
            {({ source, reduced }) => (
              <div className="absolute inset-0 grid place-items-center bg-surface">
                <svg
                  viewBox={`0 0 ${source.w} ${source.h}`}
                  className="h-full w-full text-muted"
                  role="img"
                  aria-label={source.nm}
                >
                  <g
                    className={reduced ? undefined : 'origin-center animate-spin [animation-duration:6s]'}
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx={450} cy={300} r={150} strokeWidth={8} strokeDasharray="60 34" />
                    <circle cx={450} cy={300} r={96} strokeWidth={4} strokeDasharray="18 26" />
                  </g>
                  <circle cx={450} cy={300} r={14} className="fill-current text-accent" />
                </svg>
                <span className="absolute bottom-2 left-2 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
                  {reduced ? 'parked on last frame' : `player mounted · ${source.fr} fps`}
                </span>
              </div>
            )}
          </LottieRatioPoster>
        </div>
      </div>
    </div>
  );
}
