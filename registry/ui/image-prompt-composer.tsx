/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Prompt Composer" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { RiCheckLine, RiImage2Line, RiSparkling2Line, RiStopFill } from "@remixicon/react";
import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import type { Key } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { Button } from "@/registry/ui/button";
import { Kbd } from "@/registry/ui/kbd";
import { NumberField } from "@/registry/ui/number-field";
import { Select, SelectItem } from "@/registry/ui/select";
import { Textarea } from "@/registry/ui/textarea";

/**
 * Image Prompt Composer: the request form of an image-generation chat.
 *
 * A white card on a grey tray holds style chips (a multi-select toggle
 * group), an auto-growing prompt, an aspect-ratio select, an image-count
 * stepper and the Generate button. ⌘/Ctrl + Enter submits from the prompt.
 * While `isGenerating` is true every control locks, Generate turns into Stop
 * and the tray's footer shimmers with what is being made.
 */

export interface AspectRatioOption {
  /** Shown in the trigger, e.g. "16:9". */
  id: string;
  /** Shown beside it in the list, e.g. "Wide". */
  label: string;
  width: number;
  height: number;
}

export interface StyleOption {
  id: string;
  label: string;
  /** Two colours for the chip's swatch. */
  swatch: readonly [string, string];
}

export interface ImagePromptRequest {
  prompt: string;
  aspectRatio: AspectRatioOption;
  count: number;
  styles: string[];
}

export const ASPECT_RATIOS: readonly AspectRatioOption[] = [
  { id: "1:1", label: "Square", width: 1024, height: 1024 },
  { id: "4:5", label: "Portrait", width: 896, height: 1120 },
  { id: "3:2", label: "Photo", width: 1216, height: 832 },
  { id: "16:9", label: "Wide", width: 1344, height: 768 },
  { id: "9:16", label: "Story", width: 768, height: 1344 },
];

export const IMAGE_STYLES: readonly StyleOption[] = [
  { id: "photo", label: "Photo", swatch: ["#c9a27e", "#3d5a73"] },
  { id: "illustration", label: "Illustration", swatch: ["#f3b13c", "#e0533d"] },
  { id: "3d", label: "3D render", swatch: ["#9ad0ff", "#6c5ce7"] },
  { id: "anime", label: "Anime", swatch: ["#ff9ec7", "#5b7cfa"] },
  { id: "watercolor", label: "Watercolor", swatch: ["#a8e0d1", "#f4c6a5"] },
  { id: "pixel", label: "Pixel art", swatch: ["#7bd88f", "#2d3a8c"] },
];

export interface ImagePromptComposerProps {
  defaultPrompt?: string;
  placeholder?: string;
  aspectRatios?: readonly AspectRatioOption[];
  /** Id of the starting ratio. Defaults to the first option. */
  defaultAspectRatio?: string;
  styleOptions?: readonly StyleOption[];
  defaultStyles?: Iterable<string>;
  defaultCount?: number;
  /** Upper bound of the image-count stepper. */
  maxImages?: number;
  maxLength?: number;
  /** Locks the form and turns Generate into Stop. */
  isGenerating?: boolean;
  onGenerate?: (request: ImagePromptRequest) => void;
  onStop?: () => void;
  className?: string;
}

/** A rounded outline in the option's proportions, at most 14px on its long side. */
function RatioGlyph({ ratio }: { ratio: AspectRatioOption }) {
  const long = Math.max(ratio.width, ratio.height);
  return (
    <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
      <span
        className="rounded-[3px] border-[1.5px] border-current"
        style={{ width: (14 * ratio.width) / long, height: (14 * ratio.height) / long }}
      />
    </span>
  );
}

/** Two-tone dot: artwork, so it carries the option's own colours. */
function Swatch({ colors }: { colors: readonly [string, string] }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="size-3 shrink-0 rounded-full">
      <path d="M0 0H12L0 12Z" fill={colors[0]} />
      <path d="M12 0V12H0Z" fill={colors[1]} />
    </svg>
  );
}

const chip = cx(
  "flex h-7 cursor-default items-center gap-1.5 rounded-full px-2.5 text-caption-1-medium outline-none",
  "bg-background-secondary-default text-text-secondary ring-1 ring-transparent ring-inset",
  "transition-[background-color,color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
  "data-[hovered]:bg-background-tertiary-default data-[hovered]:text-text-primary",
  "data-[selected]:bg-status-blue-background data-[selected]:text-status-blue-text data-[selected]:ring-status-blue-text/25",
  "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
  "data-[disabled]:opacity-60",
);

// #region critical
export function ImagePromptComposer({
  defaultPrompt = "",
  placeholder = "Describe the image you want…",
  aspectRatios = ASPECT_RATIOS,
  defaultAspectRatio,
  styleOptions = IMAGE_STYLES,
  defaultStyles,
  defaultCount = 1,
  maxImages = 4,
  maxLength = 600,
  isGenerating = false,
  onGenerate,
  onStop,
  className,
}: ImagePromptComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [ratioId, setRatioId] = useState<Key | null>(defaultAspectRatio ?? aspectRatios[0]?.id ?? null);
  const [count, setCount] = useState(defaultCount);
  const [styles, setStyles] = useState<Set<Key>>(() => new Set(defaultStyles));

  const ratio = aspectRatios.find((option) => option.id === ratioId) ?? aspectRatios[0];
  const trimmed = prompt.trim();
  const canGenerate = trimmed.length > 0 && ratio !== undefined && !isGenerating;
  const images = `${count} ${count === 1 ? "image" : "images"}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isGenerating) {
      onStop?.();
      return;
    }
    if (!canGenerate) return;
    onGenerate?.({
      prompt: trimmed,
      aspectRatio: ratio,
      count,
      // Keep the option order, not the click order.
      styles: styleOptions.filter((option) => styles.has(option.id)).map((option) => option.id),
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      aria-busy={isGenerating || undefined}
      className={cx("flex w-full flex-col rounded-[26px] bg-background-secondary-default p-1.5", className)}
    >
      <div
        className={cx(
          "flex flex-col gap-3 rounded-[20px] bg-background-primary-default p-3 shadow-xs ring-1 ring-border-ai-profile-card",
          "transition-shadow duration-200 ease-out motion-reduce:transition-none has-[textarea:focus]:ring-border-button-hover",
        )}
      >
        <ToggleButtonGroup
          aria-label="Style"
          selectionMode="multiple"
          selectedKeys={styles}
          onSelectionChange={setStyles}
          isDisabled={isGenerating}
          className="flex flex-wrap gap-1.5"
        >
          {styleOptions.map((option) => (
            <ToggleButton key={option.id} id={option.id} className={chip}>
              {({ isSelected }) => (
                <>
                  {isSelected ? <RiCheckLine aria-hidden className="size-3 shrink-0" /> : <Swatch colors={option.swatch} />}
                  {option.label}
                </>
              )}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Textarea
          aria-label="Prompt"
          placeholder={placeholder}
          value={prompt}
          onChange={setPrompt}
          isReadOnly={isGenerating}
          maxLength={maxLength}
          rows={2}
          maxRows={6}
          autoResize
          onKeyDown={(event) => {
            // ⌘ / Ctrl + Enter sends; a plain Enter is a new line.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              if (!isGenerating) formRef.current?.requestSubmit();
            } else {
              event.continuePropagation();
            }
          }}
          fieldClassName="bg-transparent p-0 ring-transparent"
          inputClassName="px-0.5 text-body-regular"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Aspect ratio"
            size="sm"
            value={ratioId}
            onChange={(key) => {
              if (key !== null) setRatioId(key);
            }}
            isDisabled={isGenerating}
            renderValue={
              ratio ? (
                <>
                  <RatioGlyph ratio={ratio} />
                  {ratio.id}
                </>
              ) : null
            }
            triggerClassName="h-8 min-w-[84px] tabular-nums"
          >
            {aspectRatios.map((option) => (
              <SelectItem key={option.id} id={option.id} textValue={`${option.id} ${option.label}`}>
                <RatioGlyph ratio={option} />
                <span className="tabular-nums">{option.id}</span>
                <span className="ms-auto text-text-tertiary">{option.label}</span>
              </SelectItem>
            ))}
          </Select>

          <NumberField
            aria-label="Number of images"
            size="small"
            leadingIcon={RiImage2Line}
            minValue={1}
            maxValue={maxImages}
            value={count}
            onChange={(next) => setCount(Number.isNaN(next) ? 1 : next)}
            isDisabled={isGenerating}
            className="w-[108px]"
          />

          {/* One submit button that turns into Stop, so focus stays on it. Two
              buttons swapped in place would share a DOM node: a click on Stop
              re-renders it as a submit button before the browser runs the
              click's default action, which then submits the form again. */}
          <Button
            type="submit"
            variant={isGenerating ? "secondary" : "primary"}
            size="small"
            leadingIcon={isGenerating ? RiStopFill : RiSparkling2Line}
            // aria-disabled keeps it focusable; the footer says what is missing.
            aria-disabled={(!isGenerating && !canGenerate) || undefined}
            aria-keyshortcuts={isGenerating ? undefined : "Meta+Enter Control+Enter"}
            className="ms-auto"
          >
            {isGenerating ? "Stop" : "Generate"}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1.5 text-caption-1-medium">
        <p aria-live="polite" className="min-w-0 truncate" data-testid="composer-footer">
          {isGenerating ? (
            <span className="agent-progress-loading-text">
              Generating {images} · {ratio?.id}
            </span>
          ) : trimmed ? (
            <span className="text-text-secondary tabular-nums">
              {images} · {ratio ? `${ratio.width} × ${ratio.height}` : "no size"}
            </span>
          ) : (
            <span className="text-text-tertiary">Write a prompt to generate</span>
          )}
        </p>
        <p className="hidden shrink-0 items-center gap-1 text-text-tertiary sm:flex">
          <Kbd aria-hidden>⌘</Kbd>
          <Kbd aria-hidden>↵</Kbd>
          <span aria-hidden>to generate</span>
          <span className="sr-only">Press Command or Control and Enter to generate</span>
        </p>
      </div>
    </form>
  );
}
// #endregion
