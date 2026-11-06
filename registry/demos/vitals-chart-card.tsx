'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Vitals Chart Card" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */

import { useState } from "react";
import { RiDropLine, RiHeartPulseLine, RiPulseLine } from "@remixicon/react";
import type { ComponentType } from "react";

import { VitalsChartCard } from "@/registry/ui/vitals-chart-card";
import type { VitalReading, VitalsChartCardProps } from "@/registry/ui/vitals-chart-card";

/* Three fixed weeks, Monday 15 Jun to Sunday 5 Jul 2026. */
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_LABELS = ["15 - 21 Jun", "22 - 28 Jun", "29 Jun - 5 Jul"];

function dayDetail(week: number, day: number) {
  const date = 15 + week * 7 + day;
  const weekday = WEEKDAYS[day] ?? "";
  return date <= 30 ? `${weekday}, ${date} Jun` : `${weekday}, ${date - 30} Jul`;
}

function week(index: number, values: number[], lows?: number[]): VitalReading[] {
  return values.map((value, day) => ({
    label: WEEKDAYS[day] ?? "",
    detail: dayDetail(index, day),
    value,
    low: lows?.[day],
  }));
}

const HEART_RATE = [
  week(0, [68, 72, 75, 70, 66, 74, 71]),
  week(1, [70, 76, 104, 73, 69, 71, 67]),
  week(2, [72, 69, 74, 78, 71, 106, 70]),
];

const BLOOD_PRESSURE = [
  week(0, [118, 121, 116, 119, 117, 115, 120], [76, 79, 75, 77, 74, 73, 78]),
  week(1, [117, 119, 126, 118, 116, 121, 114], [75, 77, 84, 76, 74, 78, 72]),
  week(2, [116, 118, 115, 131, 117, 119, 114], [74, 76, 73, 86, 75, 77, 72]),
];

const BLOOD_OXYGEN = [
  week(0, [97, 98, 97, 96, 98, 97, 98]),
  week(1, [98, 97, 96, 97, 98, 98, 97]),
  week(2, [97, 98, 93, 97, 98, 96, 98]),
];

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

function WeeklyVital({
  weeks,
  icon,
  ...props
}: Omit<VitalsChartCardProps, "readings" | "period"> & { weeks: VitalReading[][]; icon: IconComponent }) {
  const last = weeks.length - 1;
  const [weekIndex, setWeekIndex] = useState(last);
  return (
    <VitalsChartCard
      {...props}
      icon={icon}
      readings={weeks[weekIndex] ?? []}
      period={{
        label: WEEK_LABELS[weekIndex] ?? "",
        onPrevious: () => setWeekIndex((w) => Math.max(0, w - 1)),
        onNext: () => setWeekIndex((w) => Math.min(last, w + 1)),
        previousDisabled: weekIndex === 0,
        nextDisabled: weekIndex === last,
      }}
    />
  );
}

export default function Demo() {
  return (
    <div className="flex w-full max-w-[1100px] min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
      <div data-demo="heart-rate" className="w-[296px] shrink-0 snap-start lg:w-auto lg:min-w-0">
        <WeeklyVital
          title="Heart rate"
          unit="bpm"
          icon={RiHeartPulseLine}
          weeks={HEART_RATE}
          normalRange={[60, 100]}
          domain={[40, 130]}
          color="teal"
        />
      </div>
      <div data-demo="blood-pressure" className="w-[296px] shrink-0 snap-start lg:w-auto lg:min-w-0">
        <WeeklyVital
          title="Blood pressure"
          unit="mmHg"
          icon={RiPulseLine}
          weeks={BLOOD_PRESSURE}
          variant="range"
          normalRange={[90, 120]}
          lowNormalRange={[60, 80]}
          domain={[50, 145]}
          color="purple"
        />
      </div>
      <div data-demo="blood-oxygen" className="w-[296px] shrink-0 snap-start lg:w-auto lg:min-w-0">
        <WeeklyVital
          title="Blood oxygen"
          unit="% SpO2"
          icon={RiDropLine}
          weeks={BLOOD_OXYGEN}
          normalRange={[95, 100]}
          domain={[88, 100]}
          summary="latest"
          color="blue"
        />
      </div>
    </div>
  );
}
