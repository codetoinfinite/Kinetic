'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Code Block" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { CodeBlock } from '@/registry/ui/code-block';

const USAGE = `{/* Straight segments between points instead of the monotone curve */}
<LineChartCard shape="sharp" />`;

const SOURCE = `import { useState } from "react";
import { LineChartCard } from "@/components/line-chart-card";

type Period = "weekly" | "monthly" | "yearly";

// Revenue per month, in dollars.
const revenue = [1420, 1860, 2310, 2040, 3180, 2950, 2600, 3720, 4410, 4060, 3550, 5240];

export function RevenuePanel({ currency = "USD" }: { currency?: string }) {
  const [period, setPeriod] = useState<Period>("weekly");
  const total = revenue.reduce((sum, value) => sum + value, 0);

  return (
    <section className="grid gap-4">
      <LineChartCard
        title="Revenue"
        data={revenue}
        period={period}
        onPeriodChange={setPeriod}
        headline={new Intl.NumberFormat("en-US", { style: "currency", currency }).format(total)}
      />
      <p>Updated every hour from the billing export.</p>
    </section>
  );
}`;

export default function Demo() {
  const [copies, setCopies] = useState(0);

  return (
    <div className="flex w-full max-w-[760px] flex-col gap-4" data-demo>
      <CodeBlock code={USAGE} filename="usage" showLineNumbers={false} onCopied={() => setCopies((n) => n + 1)} />
      <CodeBlock
        code={SOURCE}
        filename="revenue-panel.tsx"
        chipTone="file"
        highlightLines={[10, 11]}
        maxHeight={252}
        onCopied={() => setCopies((n) => n + 1)}
      />
      <p className="text-caption-1-regular text-text-tertiary" aria-live="polite">
        {copies === 0 ? 'Copy a snippet or toggle line wrapping from the block header.' : `Copied ${copies} ${copies === 1 ? 'snippet' : 'snippets'} this session.`}
      </p>
    </div>
  );
}
