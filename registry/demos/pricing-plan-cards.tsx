'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Pricing Plan Cards" (boardui.com/pricing).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import {
  RiArrowDownCircleLine,
  RiBox3Line,
  RiCalendarLine,
  RiContrastLine,
  RiDiscordLine,
  RiFileList2Line,
  RiGroupLine,
  RiInfinityLine,
  RiLayoutGridLine,
  RiPaletteLine,
  RiPlugLine,
  RiPriceTag3Line,
  RiRefreshLine,
  RiRocket2Line,
  RiSeedlingLine,
  RiShieldStarLine,
  RiShieldUserLine,
  RiShoppingBag3Line,
  RiStackLine,
  RiTerminalBoxLine,
} from '@remixicon/react';
import { PricingPlanCards } from '@/registry/ui/pricing-plan-cards';
import type { BillingCycle, PricingPlan } from '@/registry/ui/pricing-plan-cards';

const discord = { label: 'Join now', href: '#discord' };

const PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'The fundamentals, free. Perfect for indie developers.',
    icon: RiSeedlingLine,
    price: { monthly: 0, yearly: 0 },
    caption: ['all the basics', 'no card required'],
    cta: { label: 'Install now', icon: RiArrowDownCircleLine },
    features: [
      { label: 'Free user license', icon: RiFileList2Line },
      { label: 'Use it in unlimited projects', icon: RiStackLine },
      { label: 'Installation via CLI', icon: RiTerminalBoxLine },
      { label: 'Fundamental components', icon: RiBox3Line },
      { label: 'Discord access', icon: RiDiscordLine, action: discord },
      { label: 'MCP support for AI agents', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: (
      <>
        Every <strong>Pro</strong> component, block and token for one builder.
      </>
    ),
    icon: RiCalendarLine,
    price: { monthly: 19, yearly: 180 },
    cta: { label: 'Start with Pro', icon: RiShoppingBag3Line },
    features: [
      { label: 'Single-user license', icon: RiShieldUserLine },
      { label: 'Use it in unlimited projects', icon: RiStackLine },
      { label: 'Keep the code forever', icon: RiInfinityLine },
      { label: 'Pro updates while subscribed', icon: RiRefreshLine },
      { label: 'MCP support for AI agents', icon: RiPlugLine },
      { label: 'Discord access', icon: RiDiscordLine, action: discord },
    ],
  },
  {
    id: 'team',
    name: 'Team',
    description: (
      <>
        Every <strong>Pro</strong> component plus templates, shared across a team.
      </>
    ),
    icon: RiShieldStarLine,
    price: { monthly: 49, yearly: 468 },
    badge: 'Most popular',
    highlighted: true,
    cta: { label: 'Start with Team', icon: RiShoppingBag3Line },
    features: [
      { label: '3-seat license', icon: RiShieldUserLine },
      { label: 'Use it in unlimited projects', icon: RiStackLine },
      { label: 'Every Pro block & template', icon: RiLayoutGridLine },
      { label: 'Pro updates while subscribed', icon: RiRefreshLine },
      { label: 'Design tokens and dark mode', icon: RiContrastLine },
      { label: 'Discord access', icon: RiDiscordLine, action: discord },
    ],
  },
  {
    id: 'startup',
    name: 'Startup',
    description: (
      <>
        Everything in Team, licensed for <strong>up to 10 developers</strong>.
      </>
    ),
    icon: RiRocket2Line,
    price: { monthly: 99, yearly: 948 },
    cta: { label: 'Start with Startup', icon: RiShoppingBag3Line },
    features: [
      { label: '10-seat license', icon: RiGroupLine },
      { label: 'Use it in unlimited projects', icon: RiStackLine },
      { label: 'Every Pro block & template', icon: RiLayoutGridLine },
      { label: 'Custom theme tokens', icon: RiPaletteLine },
      { label: 'MCP support for AI agents', icon: RiPlugLine },
      { label: 'Priority Discord channel', icon: RiDiscordLine, action: discord },
    ],
  },
];

export default function Demo() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="h-full w-full overflow-y-auto bg-background-full">
      <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-8">
        <PricingPlanCards
          plans={PLANS}
          cycle={cycle}
          onCycleChange={setCycle}
          onSelectPlan={(id, c) => {
            const plan = PLANS.find((p) => p.id === id);
            setPicked(`${plan?.name ?? id} on ${c} billing`);
          }}
          icon={RiPriceTag3Line}
          heading="Pick a plan. Build forever."
          description="Keep the code you install and use it in unlimited projects. Pay monthly, or yearly and get two months free."
        />
        <p role="status" data-demo="picked" className="mt-6 min-h-5 text-center text-body-regular text-text-secondary">
          {picked ? `Selected: ${picked}` : ''}
        </p>
      </div>
    </div>
  );
}
