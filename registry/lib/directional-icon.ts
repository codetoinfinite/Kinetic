/*
 * Adapted from BoardUI — https://github.com/BoardUI/boardui (utils/directional-icon.ts)
 * Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI). MIT License.
 * SPDX-License-Identifier: MIT
 */
import {
  RiArrowLeftLine,
  RiArrowLeftSLine,
  RiArrowRightLine,
  RiArrowRightSLine,
  RiSidebarFoldLine,
  RiSidebarUnfoldLine,
} from "@remixicon/react";

/** Navigation glyphs mirror; logos, media controls and trend arrows do not. */
const directionalIcons: ReadonlySet<unknown> = new Set([
  RiArrowLeftLine, RiArrowLeftSLine, RiArrowRightLine, RiArrowRightSLine,
  RiSidebarFoldLine, RiSidebarUnfoldLine,
]);

export function directionalIconClass(icon: unknown): string | undefined {
  return directionalIcons.has(icon) ? "rtl:rotate-180" : undefined;
}
