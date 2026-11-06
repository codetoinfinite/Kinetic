'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Pro Access Card" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { RiCheckboxCircleFill, RiLockLine } from '@remixicon/react';
import { ProAccessCard } from '@/registry/ui/pro-access-card';
import { Button } from '@/registry/ui/button';

type Status = 'locked' | 'pending' | 'unlocked';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VALUES = [1.5, 2.1, 2.9, 2.5, 3.8, 3.4, 2.9, 4.1, 4.9, 4.4, 3.8, 5.8];
const W = 480;
const H = 150;
const POINTS = VALUES.map((v, i) => [(i / (VALUES.length - 1)) * W, H - (v / 6) * (H - 10)] as const);
const LINE = POINTS.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const AREA = `${LINE} L${W} ${H} L0 ${H} Z`;

function RevenuePreview() {
  const gradientId = useId();
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 rounded-2xl bg-background-secondary-default p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-body-medium text-text-secondary">Revenue</span>
          <span className="flex items-center gap-2">
            <span className="text-title-1-medium text-text-primary tabular-nums">$18,240</span>
            <span className="rounded-md bg-state-success-base px-1.5 text-caption-1-semibold text-state-success-text">+9.4%</span>
          </span>
        </div>
        <span className="flex items-center gap-1 text-body-regular text-text-tertiary">
          <span className="rounded-lg bg-background-primary-default px-2.5 py-1 text-text-primary shadow-xs">Weekly</span>
          <span className="px-2.5 py-1">Monthly</span>
          <span className="px-2.5 py-1">Yearly</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-auto w-full text-chart-2" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={AREA} fill={`url(#${gradientId})`} />
        <path d={LINE} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {MONTHS.map((m, i) => (
          <text
            key={m}
            x={(i / (MONTHS.length - 1)) * (W - 24) + 12}
            y={H + 15}
            textAnchor="middle"
            className="fill-text-tertiary text-[11px]"
          >
            {m}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function Demo() {
  const [status, setStatus] = useState<Status>('locked');
  const rootRef = useRef<HTMLDivElement>(null);
  const lockAgainRef = useRef<HTMLButtonElement>(null);
  const acted = useRef(false);

  // Simulated license activation: the timer is cleared if the demo unmounts.
  useEffect(() => {
    if (status !== 'pending') return;
    const t = window.setTimeout(() => setStatus('unlocked'), 900);
    return () => window.clearTimeout(t);
  }, [status]);

  // The clicked button unmounts when the state flips; hand focus to its replacement.
  useEffect(() => {
    if (!acted.current) return;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    if (status === 'unlocked') lockAgainRef.current?.focus();
    if (status === 'locked') rootRef.current?.querySelector('button')?.focus();
  }, [status]);

  return (
    <div data-demo ref={rootRef} className="w-full max-w-[760px]">
      <ProAccessCard
        title="Line Chart Card is a Pro component."
        description="Your Pro license unlocks this component and all of its source files. Activate your license once, then install it directly into your project with the CLI."
        locked={status !== 'unlocked'}
        pending={status === 'pending'}
        preview={<RevenuePreview />}
        lockedLabel="Unlock to use this component"
        footerTitle="This component is included in Pro"
        footerDescription="Get Pro now and install it right away."
        actionLabel={status === 'pending' ? 'Activating…' : 'Get Pro'}
        onAction={() => {
          acted.current = true;
          setStatus('pending');
        }}
        unlockedFooter={
          <>
            <p className="flex min-w-0 items-center gap-2 text-body-medium text-text-primary">
              <RiCheckboxCircleFill aria-hidden className="size-5 shrink-0 text-state-success-text" />
              License active. The source is ready to install.
            </p>
            <Button ref={lockAgainRef} type="button" variant="ghost" size="small" leadingIcon={RiLockLine} onClick={() => {
                acted.current = true;
                setStatus('locked');
              }}
            >
              Lock again
            </Button>
          </>
        }
      />
    </div>
  );
}
