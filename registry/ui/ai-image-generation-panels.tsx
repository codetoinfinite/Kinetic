/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Image Generation" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import type { Key } from "react-aria-components";
import {
  RiAddLine,
  RiCheckLine,
  RiCollapseDiagonalLine,
  RiDeleteBinLine,
  RiExpandDiagonalLine,
  RiGalleryLine,
  RiImageAddLine,
  RiLayoutRight2Line,
  RiPlayLine,
  RiRobot2Line,
  RiSparkling2Line,
  RiTimeLine,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { Button } from "@/registry/ui/button";
import { GalleryArt, ImageGalleryMasonry, type GalleryItem } from "@/registry/ui/image-gallery-masonry";
import { ModelSelect } from "@/registry/ui/model-select";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { Switch } from "@/registry/ui/switch";
import { HintButton } from "@/registry/ui/ai-image-generation-thread";
import { ASPECTS, IMAGE_MODELS, STYLE_PRESETS } from "@/registry/ui/ai-image-generation-data";

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";

/* --------------------------------------------------------------- gallery */

export type PanelTab = "gallery" | "styles";

export interface GalleryPanelProps {
  items: GalleryItem[];
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  wide: boolean;
  onToggleWide: () => void;
  onNewImage: () => void;
  onHide: () => void;
  styles: string[];
  onToggleStyle: (id: string) => void;
  onDownload: (item: GalleryItem) => void;
  className?: string;
}

const tabClass = ({ isSelected }: { isSelected: boolean }) =>
  cx(
    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-body-2-medium",
    "transition-colors duration-150 ease-out motion-reduce:transition-none",
    isSelected
      ? "bg-status-blue-background text-status-blue-text"
      : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
    focusRing,
  );

export function GalleryPanel(props: GalleryPanelProps) {
  return (
    <Tabs
      selectedKey={props.tab}
      onSelectionChange={(key: Key) => props.onTabChange(key === "styles" ? "styles" : "gallery")}
      className={cx("flex h-full min-h-0 flex-col", props.className)}
    >
      <div className="flex h-14 shrink-0 items-center gap-1 px-3">
        <TabList aria-label="Library" className="flex flex-1 items-center gap-1">
          <Tab id="gallery" className={tabClass}>
            <RiGalleryLine className="size-4" aria-hidden />
            Gallery
            <span className="text-caption-1-medium opacity-70">{props.items.length}</span>
          </Tab>
          <Tab id="styles" className={tabClass}>
            <RiSparkling2Line className="size-4" aria-hidden />
            Styles
            {props.styles.length > 0 && <span className="text-caption-1-medium opacity-70">{props.styles.length}</span>}
          </Tab>
        </TabList>
        <HintButton icon={RiImageAddLine} label="New image" onPress={props.onNewImage} />
        <HintButton
          icon={props.wide ? RiCollapseDiagonalLine : RiExpandDiagonalLine}
          label={props.wide ? "Narrow gallery" : "Widen gallery"}
          pressed={props.wide}
          onPress={props.onToggleWide}
          className="max-lg:hidden"
        />
        <HintButton icon={RiLayoutRight2Line} label="Hide gallery" onPress={props.onHide} />
      </div>
      <TabPanel id="gallery" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 outline-none">
        <ImageGalleryMasonry
          items={props.items}
          defaultFavourites={["ape", "hanok"]}
          onDownload={props.onDownload}
          columnsClassName={props.wide ? "columns-2 sm:columns-4" : "columns-2 sm:columns-3"}
        />
      </TabPanel>
      <TabPanel id="styles" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 outline-none">
        <p className="px-1 pb-3 text-body-2-regular text-text-tertiary">Picked styles ride along with your next prompt.</p>
        <ul className={cx("grid gap-3", props.wide ? "grid-cols-3" : "grid-cols-2")}>
          {STYLE_PRESETS.map((preset) => {
            const on = props.styles.includes(preset.id);
            return (
              <li key={preset.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => props.onToggleStyle(preset.id)}
                  className={cx(
                    "group/style flex w-full flex-col gap-2 rounded-2xl border bg-background-primary-default p-1.5 text-left shadow-2xs",
                    "transition-colors duration-150 ease-out motion-reduce:transition-none",
                    on ? "border-accent-500" : "border-border-button-default hover:border-border-button-hover",
                    focusRing,
                  )}
                >
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-xl">
                    <GalleryArt item={preset.sample} className="size-full" />
                    {on && (
                      <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-accent-500 text-text-white">
                        <RiCheckLine className="size-3.5" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="truncate px-1 pb-0.5 text-body-2-medium text-text-primary">{preset.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </TabPanel>
    </Tabs>
  );
}

/* ----------------------------------------------------------- automations */

interface Automation {
  id: string;
  name: string;
  schedule: string;
  prompt: string;
  enabled: boolean;
  lastRun: string;
}

const SEED_AUTOMATIONS: Automation[] = [
  { id: "daily-hero", name: "Daily hero art", schedule: "Every day at 09:00", prompt: "Fresh hero illustration for the landing page", enabled: true, lastRun: "Today, 09:00" },
  { id: "weekly-social", name: "Weekly social set", schedule: "Mondays at 08:30", prompt: "Four square posts in the brand palette", enabled: true, lastRun: "Mon, 08:30" },
  { id: "release-cover", name: "Release cover", schedule: "On every tagged release", prompt: "Poster for the changelog entry", enabled: false, lastRun: "2 weeks ago" },
];

export function AutomationsView({ onRun, className }: { onRun: (name: string, prompt: string) => void; className?: string }) {
  const [list, setList] = useState(SEED_AUTOMATIONS);
  const [count, setCount] = useState(1);

  const patch = (id: string, change: Partial<Automation>) =>
    setList((prev) => prev.map((row) => (row.id === id ? { ...row, ...change } : row)));

  return (
    <section aria-labelledby="automations-title" className={cx("flex min-h-0 flex-1 flex-col", className)}>
      <header className="flex shrink-0 items-start gap-3 px-6 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h2 id="automations-title" className="text-headline-semibold text-text-primary">Automations</h2>
          <p className="text-body-2-regular text-text-tertiary">Prompts that generate on a schedule and file results in the gallery.</p>
        </div>
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiAddLine}
          onClick={() => {
            setList((prev) => [
              ...prev,
              { id: `custom-${count}`, name: `New automation ${count}`, schedule: "Fridays at 17:00", prompt: "Weekly mood board", enabled: false, lastRun: "Never" },
            ]);
            setCount((n) => n + 1);
          }}
        >
          New automation
        </Button>
      </header>
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6 pb-6">
        {list.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border-button-default p-6 text-center text-body-2-regular text-text-tertiary">
            No automations yet.
          </li>
        )}
        {list.map((row) => (
          <li key={row.id} className="flex items-center gap-3 rounded-2xl bg-background-primary-default p-3 shadow-2xs">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background-tertiary-default text-foreground-icon-secondary">
              <RiRobot2Line className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-medium text-text-primary">{row.name}</p>
              <p className="flex items-center gap-1 truncate text-caption-1-regular text-text-tertiary">
                <RiTimeLine className="size-3.5 shrink-0" aria-hidden />
                {row.schedule} · last run {row.lastRun}
              </p>
            </div>
            <Switch size="sm" isSelected={row.enabled} onChange={(on) => patch(row.id, { enabled: on })} aria-label={`Enable ${row.name}`} />
            <HintButton
              icon={RiPlayLine}
              label={`Run ${row.name} now`}
              onPress={() => {
                patch(row.id, { lastRun: "just now" });
                onRun(row.name, row.prompt);
              }}
            />
            <HintButton
              icon={RiDeleteBinLine}
              label={`Delete ${row.name}`}
              onPress={() => setList((prev) => prev.filter((item) => item.id !== row.id))}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------- customize */

export interface CustomizeViewProps {
  defaultModel: string;
  onDefaultModel: (id: string) => void;
  aspect: string;
  onAspect: (id: string) => void;
  saveToGallery: boolean;
  onSaveToGallery: (on: boolean) => void;
  onReset: () => void;
  className?: string;
}

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-background-primary-default p-4 shadow-2xs">
      <div className="min-w-[180px] flex-1">
        <p className="text-body-medium text-text-primary">{title}</p>
        <p className="text-caption-1-regular text-text-tertiary">{hint}</p>
      </div>
      {children}
    </div>
  );
}

export function CustomizeView(props: CustomizeViewProps) {
  return (
    <section aria-labelledby="customize-title" className={cx("flex min-h-0 flex-1 flex-col", props.className)}>
      <header className="flex shrink-0 items-start gap-3 px-6 pt-5 pb-4">
        <div className="min-w-0 flex-1">
          <h2 id="customize-title" className="text-headline-semibold text-text-primary">Customize</h2>
          <p className="text-body-2-regular text-text-tertiary">Defaults for every new generation in this workspace.</p>
        </div>
        <Button variant="ghost" size="small" onClick={props.onReset}>
          Reset
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6 pb-6">
        <Row title="Default model" hint="Used by new threads and the composer.">
          <ModelSelect
            models={IMAGE_MODELS}
            value={props.defaultModel}
            onChange={(id) => props.onDefaultModel(id)}
            variant="outline"
            size="sm"
            aria-label="Default model"
          />
        </Row>
        <Row title="Aspect ratio" hint="Shape of every new image.">
          <SegmentedControl
            aria-label="Aspect ratio"
            selectedKeys={[props.aspect]}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next !== undefined) props.onAspect(String(next));
            }}
          >
            {ASPECTS.map((option) => (
              <SegmentedControlItem key={option.id} id={option.id}>
                {option.id}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Row>
        <Row title="Save to gallery" hint="File finished images in the gallery automatically.">
          <Switch isSelected={props.saveToGallery} onChange={props.onSaveToGallery} aria-label="Save finished images to the gallery" />
        </Row>
      </div>
    </section>
  );
}
