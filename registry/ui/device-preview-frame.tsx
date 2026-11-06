/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Device Preview Frame" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { RiComputerLine, RiLockLine, RiRefreshLine, RiSmartphoneLine, RiTabletLine } from "@remixicon/react";
import type { Key } from "react-aria-components";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { cx } from "@/registry/lib/cx";
import { easeOutQuart } from "@/registry/lib/easing";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

/** CSS-pixel widths each device lays its content out at. */
export const DEVICE_WIDTHS: Record<PreviewDevice, number> = { desktop: 1280, tablet: 768, mobile: 375 };

const DEVICES: { id: PreviewDevice; label: string; icon: typeof RiComputerLine }[] = [
  { id: "desktop", label: "Desktop", icon: RiComputerLine },
  { id: "tablet", label: "Tablet", icon: RiTabletLine },
  { id: "mobile", label: "Mobile", icon: RiSmartphoneLine },
];

/** Frame border (2) + frame padding (12) + screen border (2). */
const CHROME_X = 16;
const DURATION = 560;

export interface DevicePreviewFrameProps {
  /** Content laid out at the device width and scaled into the screen. It can use `@…/frame:` container queries. */
  children: ReactNode;
  device?: PreviewDevice;
  defaultDevice?: PreviewDevice;
  onDeviceChange?: (device: PreviewDevice) => void;
  /** Override device widths in CSS px. */
  widths?: Partial<Record<PreviewDevice, number>>;
  /** Height of the visible screen in px. The frame keeps this height on every device. */
  height?: number;
  /** Address shown in the title bar. */
  url?: string;
  /** Hide the Desktop / Tablet / Mobile toggle, e.g. when `device` is driven from outside. */
  showToggle?: boolean;
  /** Extra controls placed next to the toggle. */
  toolbar?: ReactNode;
  className?: string;
}

// #region critical
/**
 * One number drives everything: `p`, the virtual width the content is laid out
 * at. For a given p the screen scale is s = min(1, (available - chrome) / p),
 * the frame is p * s + chrome wide and the content box is p wide, scaled by s,
 * and height / s tall so it always fills the screen. Switching device tweens p
 * from the old width to the new one in a rAF loop that writes those styles
 * straight to the DOM, so the page inside reflows continuously like a window
 * being resized and frame and content can never drift apart mid-animation.
 * `available` comes from a ResizeObserver content box: layout pixels, which
 * stay correct inside CSS-scaled previews where rects would not.
 */
function useDeviceFit(targetWidth: number, height: number, reduced: boolean) {
  const measureRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fit = useRef({ p: targetWidth, available: 0, raf: 0, height });
  fit.current.height = height;

  const apply = () => {
    const { p, available, height: h } = fit.current;
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content || available <= CHROME_X) return;
    const s = Math.min(1, (available - CHROME_X) / p);
    frame.style.width = `${p * s + CHROME_X}px`;
    content.style.width = `${p}px`;
    content.style.height = `${h / s}px`;
    content.style.scale = String(s);
  };

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const box = entry?.contentBoxSize?.[0];
      fit.current.available = box ? box.inlineSize : el.clientWidth;
      apply();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const state = fit.current;
    cancelAnimationFrame(state.raf);
    const from = state.p;
    if (reduced || from === targetWidth || state.available === 0) {
      state.p = targetWidth;
      apply();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION));
      state.p = from + (targetWidth - from) * easeOutQuart(t);
      apply();
      if (t < 1) state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(state.raf);
  }, [targetWidth, reduced, height]);

  return { measureRef, frameRef, contentRef };
}
// #endregion

/**
 * A browser-window frame with an optional Desktop / Tablet / Mobile toggle.
 * Children render at the chosen device width and are scaled down to fit.
 */
export function DevicePreviewFrame({
  children,
  device,
  defaultDevice = "desktop",
  onDeviceChange,
  widths,
  height = 420,
  url = "app.example.com",
  showToggle = true,
  toolbar,
  className,
}: DevicePreviewFrameProps) {
  const reduced = useReducedMotion();
  const [internal, setInternal] = useState<PreviewDevice>(defaultDevice);
  const current = device ?? internal;
  const sizes = { ...DEVICE_WIDTHS, ...widths };
  const { measureRef, frameRef, contentRef } = useDeviceFit(sizes[current], height, reduced);

  const choose = (keys: Set<Key>) => {
    const [next] = keys;
    if (next === undefined) return;
    const value = String(next) as PreviewDevice;
    if (device === undefined) setInternal(value);
    onDeviceChange?.(value);
  };

  return (
    <div className={cx("flex w-full flex-col items-center gap-4", className)} data-device={current}>
      {showToggle || toolbar ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {showToggle ? (
            <SegmentedControl aria-label="Preview device" selectedKeys={[current]} onSelectionChange={choose}>
              {DEVICES.map(({ id, label, icon: Icon }) => (
                <SegmentedControlItem key={id} id={id}>
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                  </span>
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          ) : null}
          {toolbar}
        </div>
      ) : null}

      <div ref={measureRef} className="flex w-full justify-center">
        <div
          ref={frameRef}
          className="flex w-full max-w-full flex-col overflow-hidden rounded-[22px] border border-border-button-default bg-background-secondary-default p-1.5 shadow-sm"
        >
          <div className="flex h-9 shrink-0 items-center gap-3 px-2" aria-hidden="true">
            <span className="flex shrink-0 gap-1.5">
              <span className="size-2.5 rounded-full bg-background-quaternary-default" />
              <span className="size-2.5 rounded-full bg-background-quaternary-default" />
              <span className="size-2.5 rounded-full bg-background-quaternary-default" />
            </span>
            <span className="mx-auto flex h-6 max-w-[320px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-background-primary-default px-2 text-caption-1-regular text-text-tertiary">
              <RiLockLine className="size-3 shrink-0" />
              <span className="truncate">{url}</span>
            </span>
            <RiRefreshLine className="size-3.5 shrink-0 text-foreground-icon-tertiary" />
          </div>
          <div
            className="relative overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default"
            style={{ height }}
          >
            <div
              ref={contentRef}
              data-preview-screen=""
              className="@container/frame absolute top-0 left-0 h-full w-full origin-top-left overflow-y-auto overscroll-contain"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
