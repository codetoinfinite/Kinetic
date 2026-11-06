'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Floating Stickers" (boardui.com/).
 * No BoardUI source was used.
 */
import { useState } from "react";
import { RiArrowGoBackLine, RiDragMove2Line } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { FloatingStickers } from "@/registry/ui/floating-stickers";
import type { StickerItem, StickerOffset } from "@/registry/ui/floating-stickers";

const STICKERS: StickerItem[] = [
  { id: "blob", label: "Teal blob", kind: "blob", x: 0.12, y: 0.24, size: 96, rotate: -6 },
  { id: "star", label: "Sleepy star", kind: "star", x: 0.88, y: 0.2, size: 92, rotate: 8 },
  { id: "chart", label: "Bar chart", kind: "chart", x: 0.85, y: 0.78, size: 80, rotate: 10 },
  { id: "cloud", label: "Cloud", kind: "cloud", x: 0.15, y: 0.8, size: 88, rotate: -4 },
  { id: "heart", label: "Heart", kind: "heart", x: 0.6, y: 0.88, size: 68, rotate: 12 },
];

const NAME = Object.fromEntries(STICKERS.map((s) => [s.id, s.label]));

export default function Demo() {
  const [round, setRound] = useState(0);
  const [status, setStatus] = useState("Grab a sticker, or focus one and use the arrow keys.");

  const moved = (id: string, { x, y }: StickerOffset) => {
    const sx = x > 0 ? `+${x}` : `${x}`;
    const sy = y > 0 ? `+${y}` : `${y}`;
    setStatus(`${NAME[id] ?? id} moved ${sx}, ${sy} px`);
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[960px] overflow-hidden rounded-2xl border border-border-component-detail-container bg-background-primary-default shadow-card">
        <FloatingStickers
          key={round}
          seed="kinetic-landing"
          stickers={STICKERS}
          onGrab={(id) => setStatus(`Holding ${NAME[id] ?? id}`)}
          onMove={moved}
          className="h-[380px] bg-background-secondary-default sm:h-[420px]"
        >
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default px-2.5 py-1 text-caption-1-medium text-text-secondary shadow-xs">
              <RiDragMove2Line aria-hidden className="size-3.5 text-foreground-icon-secondary" />
              Drag them around
            </span>
            <h3 className="mt-4 max-w-[420px] text-title-1-semibold text-text-primary">Make it yours</h3>
            <p className="mt-2 max-w-[400px] text-body-regular text-text-secondary">
              Every sticker floats on its own seeded rhythm. Pick one up and it rises above the rest, then stays inside the frame.
            </p>
          </div>
        </FloatingStickers>
        <div className="flex items-center justify-between gap-3 border-t border-separator-border px-4 py-3">
          <p role="status" data-sticker-status="" className="min-w-0 truncate text-caption-1-regular text-text-tertiary">
            {status}
          </p>
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiArrowGoBackLine}
            className="shrink-0"
            onClick={() => {
              setRound((r) => r + 1);
              setStatus("Stickers back in place");
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
