'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Rotating Word Hero" (boardui.com/).
 * No BoardUI source was used.
 */
import { RiArrowDownCircleLine, RiCodeSSlashLine, RiReactjsLine, RiTableLine, RiTailwindCssLine } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { HeroAnnouncement, RotatingWordHero } from "@/registry/ui/rotating-word-hero";
import type { HeroBadgeItem } from "@/registry/ui/rotating-word-hero";

const WORDS = ["Finance", "Healthcare", "Agentic", "Marketing", "Analytics"];

const BADGES: HeroBadgeItem[] = [
  { label: "React", version: "v19.2", icon: RiReactjsLine },
  { label: "Tailwind CSS", version: "v4", icon: RiTailwindCssLine },
  { label: "React Aria", version: "v1.17", icon: RiCodeSSlashLine },
  { label: "TanStack Table", version: "v8.21", icon: RiTableLine },
];

const STEPS = [62, 22, 18, 74, 88, 64, 34];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function StepsCard() {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
      <div className="flex flex-col">
        <span className="text-body-medium text-text-secondary">Steps</span>
        <span className="text-title-2-semibold text-text-primary">
          31,600 <span className="text-caption-1-regular text-text-tertiary">total steps</span>
        </span>
      </div>
      <div className="grid h-32 grid-cols-7 items-end gap-1.5">
        {STEPS.map((value, i) => (
          <div key={i} className="flex h-full flex-col justify-end gap-1">
            <div className="relative flex-1 overflow-hidden rounded-lg bg-background-secondary-default">
              <div className="absolute inset-x-0 bottom-0 rounded-lg bg-chart-1" style={{ height: `${value}%` }} />
            </div>
            <span className="text-center text-caption-2-regular text-text-tertiary">{DAYS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreCard() {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
      <div className="flex flex-col">
        <span className="text-body-medium text-text-secondary">Sleep score</span>
        <span className="text-title-2-semibold text-text-primary">Excellent</span>
      </div>
      <div className="relative mx-auto size-32">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="12" className="stroke-chart-track" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray="120 251" className="stroke-chart-3" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray="90 251" strokeDashoffset="-128" className="stroke-chart-5" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray="22 251" strokeDashoffset="-226" className="stroke-chart-6" />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-display-4-medium text-text-primary">98</span>
      </div>
    </div>
  );
}

function DaysCard() {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
      <div className="flex flex-col">
        <span className="text-body-medium text-text-secondary">Most active days</span>
        <span className="text-title-2-semibold text-text-primary">
          32,459 <span className="text-caption-1-regular text-text-tertiary">total steps</span>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-caption-2-medium text-text-secondary">{i + 15}</span>
            <span
              className="size-5 rounded-full border-[3px] border-chart-4 border-r-chart-3 border-b-chart-2"
              style={{ transform: `rotate(${(i * 47) % 360}deg)` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Demo() {
  return (
    <div className="h-full w-full overflow-y-auto bg-background-full">
      <div className="pt-20 pb-16">
        <RotatingWordHero
          announcement={<HeroAnnouncement tag="New">BoardUI Pro is out</HeroAnnouncement>}
          before={
            <>
              <span className="block">React Design System</span>for
            </>
          }
          words={WORDS}
          after="Interface"
          description="BoardUI is a React design system with 103 unique components, including 19 data charts, plus 10 Pro templates and 400+ design tokens, designed in Figma."
          actions={
            <>
              <Button variant="primary">Choose your plan</Button>
              <Button variant="secondary" leadingIcon={RiArrowDownCircleLine}>
                Start for free
              </Button>
            </>
          }
          badges={BADGES}
        >
          <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-4 px-4 mask-b-from-40% @2xl/hero:grid-cols-3 @3xl/hero:px-8">
            <StepsCard />
            <ScoreCard />
            <DaysCard />
          </div>
        </RotatingWordHero>
      </div>
    </div>
  );
}
