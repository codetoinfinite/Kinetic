/*
 * Adapted from BoardUI — https://github.com/BoardUI/boardui (components/application/medical/patient-info-card.tsx)
 * Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI). MIT License.
 * SPDX-License-Identifier: MIT
 */
"use client";

import { useTemplateCopy } from "@/registry/lib/template-copy";

import { RiAddLine, RiAsterisk, RiDropLine, RiMenLine, RiStethoscopeLine } from "@remixicon/react";
import type { ComponentType } from "react";
import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { cx } from "@/registry/lib/cx";

/**
 * Figma source: Board UI → medical profile dashboard → Frame 125 (node
 * 3950:5657). Patient photo, name, and a stack of label/value rows.
 *
 * Vertical rhythm from Figma's absolute positions: avatar top 24, name top
 * 105 (avatar bottom 90 → 15px gap), details top 146 (name bottom 131 →
 * 15px gap again) — hence the odd-looking `gap-[15px]`, replicated rather
 * than rounded to a spacing step.
 */

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

type Detail = { icon: IconComponent; label: string; value: string };

const DETAILS: Detail[] = [
  { icon: RiAsterisk, label: "Date of Birth", value: "28 July, 1997" },
  { icon: RiMenLine, label: "Gender", value: "Male" },
  { icon: RiDropLine, label: "Blood Type", value: "A rh+" },
  { icon: RiStethoscopeLine, label: "GP Doctor", value: "Mattheus Clarkson" },
];

// #region critical
export function PatientInfoCard({ className }: { className?: string } = {}) {
  const localize = useTemplateCopy();
  return localize((
    <section
      className={cx(
        "flex h-[330px] w-full min-w-0 flex-col items-center gap-[15px] rounded-[20px] bg-background-secondary-default px-2.5 pt-6 pb-2.5",
        className,
      )}
    >
      <div className="relative">
        <Avatar size="lg" initials="JL" className="size-[66px] text-[24.75px]" />
        <Button
          variant="secondary"
          size="xs"
          iconOnly
          leadingIcon={RiAddLine}
          aria-label="Add profile photo"
          className="absolute -top-0.5 -end-0.5 rounded-full"
        />
      </div>
      <p className="text-title-2-medium whitespace-nowrap text-text-primary">Jordan Lee</p>
      <div className="flex w-full flex-1 flex-col gap-2.5">
        {DETAILS.map((detail) => (
          <div
            key={detail.label}
            className="flex w-full items-center justify-between rounded-2lg bg-background-inner-default px-2.5 py-2"
          >
            <div className="flex items-center gap-1.5">
              <detail.icon className="size-4 shrink-0 text-text-secondary" aria-hidden />
              <span className="text-body-regular whitespace-nowrap text-text-secondary">
                {detail.label}
              </span>
            </div>
            <span className="text-body-medium whitespace-nowrap text-text-primary">{detail.value}</span>
          </div>
        ))}
      </div>
    </section>
  ));
}
// #endregion
