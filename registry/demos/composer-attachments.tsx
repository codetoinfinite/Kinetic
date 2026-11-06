'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Composer Attachments" (boardui.com/components/composer-attachments).
 * No BoardUI source was used.
 */
import { RiAddLine, RiStackLine } from "@remixicon/react";
import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { Button } from "@/registry/ui/button";
import {
  ComposerAttachButton,
  ComposerAttachments,
  attachmentsFromFiles,
  formatBytes,
  type ComposerAttachment,
} from "@/registry/ui/composer-attachments";

const SEED: ComposerAttachment[] = [
  { id: "seed-brief", name: "launch-brief.pdf", size: 2_411_724 },
  { id: "seed-sheet", name: "pricing-tiers.xlsx", size: 48_230 },
  { id: "seed-shot", name: "onboarding-step-2.png", size: 811_008 },
];

const SAMPLES = [
  { name: "q3-roadmap.pptx", size: 5_872_025 },
  { name: "checkout.tsx", size: 7_340 },
  { name: "walkthrough.mp4", size: 38_797_312 },
];

/** Simulated upload: +4% every 40ms, so one file lands in about a second. */
const STEP = 4;
const TICK_MS = 40;

export default function Demo() {
  const reduced = useReducedMotion();
  const [items, setItems] = useState<ComposerAttachment[]>(SEED);
  const batch = useRef(0);

  // One file uploads at a time; the rest wait at 0 in queue order.
  const active = items.find((a) => a.progress !== undefined && a.progress < 100)?.id;

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setItems((list) =>
        list.map((a) =>
          a.id === active ? { ...a, progress: Math.min(100, (a.progress ?? 0) + STEP) } : a,
        ),
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  // Under reduced motion files land at once instead of drawing their ring.
  const start = reduced ? undefined : 0;

  const addFiles = (files: File[]) => {
    const prefix = `pick-${batch.current++}`;
    setItems((list) => [...list, ...attachmentsFromFiles(files, prefix, start)]);
  };

  const addSamples = () => {
    const prefix = `sample-${batch.current++}`;
    setItems((list) => [
      ...list,
      ...SAMPLES.map((f, i) => ({ id: `${prefix}-${i}`, name: f.name, size: f.size, progress: start })),
    ]);
  };

  const remove = (id: string) => setItems((list) => list.filter((a) => a.id !== id));
  const total = items.reduce((sum, a) => sum + a.size, 0);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex w-full max-w-[560px] flex-col gap-3 rounded-3xl bg-background-primary-default p-3 shadow-card">
        {items.length > 0 ? (
          <ComposerAttachments attachments={items} onRemove={remove} />
        ) : (
          <p className="px-1 py-[19px] text-body-regular text-text-tertiary">No files attached.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <ComposerAttachButton
            onFiles={addFiles}
            aria-label="Attach files"
            className="grid size-9 place-items-center rounded-full bg-composer-panel-add-background text-foreground-icon-primary outline-none transition-colors duration-150 ease-out hover:bg-composer-panel-add-hover-background focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
          >
            <RiAddLine className="size-5" aria-hidden />
          </ComposerAttachButton>
          <Button variant="secondary" size="small" leadingIcon={RiStackLine} onClick={addSamples}>
            Add sample files
          </Button>
          <span className="ms-auto text-caption-1-regular text-text-tertiary tabular-nums" aria-live="polite">
            {items.length} {items.length === 1 ? "file" : "files"} · {formatBytes(total)}
          </span>
        </div>
      </div>
      <p className="max-w-[560px] text-center text-caption-1-regular text-text-tertiary">
        Only names and sizes are read. Nothing is uploaded; the progress ring is simulated.
      </p>
    </div>
  );
}
