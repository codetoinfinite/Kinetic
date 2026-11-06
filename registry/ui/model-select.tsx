/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Model Select" (boardui.com/components/composer-panel).
 * No BoardUI source was used.
 */
"use client";

import { RiCheckLine } from "@remixicon/react";
import { useState, type ReactNode } from "react";
import { Text } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { Badge } from "@/registry/ui/badge";
import { Select, SelectItem, type SelectSize } from "@/registry/ui/select";

export type ModelTone = "blue" | "cyan" | "lime" | "orange" | "purple" | "rose" | "yellow" | "neutral";
export type ModelBadge = "new" | "pro";

export interface ModelOption {
  id: string;
  name: string;
  /** One line under the name in the menu. */
  description?: string;
  /** Two characters at most. Derived from the name when omitted ("Deep 1" → "D1"). */
  monogram?: string;
  /** Colour of the monogram square. */
  tone?: ModelTone;
  badges?: ModelBadge[];
  isDisabled?: boolean;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "swift-2", name: "Swift 2", description: "Balanced for everyday work", tone: "blue" },
  { id: "swift-2-mini", name: "Swift 2 Mini", description: "Fastest replies, lightest load", monogram: "SM", tone: "cyan" },
  { id: "atlas-3", name: "Atlas 3", description: "Reads long files and whole repos", tone: "orange", badges: ["new"] },
  { id: "deep-1", name: "Deep 1", description: "Slower, reasons for longer", tone: "purple", badges: ["pro"] },
  { id: "lumen-1", name: "Lumen 1", description: "Reads images and screenshots", tone: "lime", badges: ["new", "pro"] },
];

const TONE: Record<ModelTone, string> = {
  blue: "bg-status-blue-background text-status-blue-text",
  cyan: "bg-status-cyan-background text-status-cyan-text",
  lime: "bg-status-lime-background text-status-lime-text",
  orange: "bg-status-orange-background text-status-orange-text",
  purple: "bg-status-purple-background text-status-purple-text",
  rose: "bg-status-rose-background text-status-rose-text",
  yellow: "bg-status-yellow-background text-status-yellow-text",
  neutral: "bg-background-tertiary-default text-text-secondary",
};

/** First character of the first two words, upper-cased: "Swift 2" → "S2", "Atlas" → "A". */
export function monogramOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function ModelMonogram({ model, small = false }: { model: ModelOption; small?: boolean }) {
  const tone = model.tone ?? "neutral";
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center font-semibold tracking-tight tabular-nums",
        small ? "size-5 rounded-md text-[9px]/none" : "size-8 rounded-lg text-[11px]/none",
        TONE[tone],
      )}
    >
      {(model.monogram ?? monogramOf(model.name)).slice(0, 2)}
    </span>
  );
}

function ModelBadges({ badges }: { badges?: ModelBadge[] }) {
  if (!badges?.length) return null;
  return (
    <>
      {badges.includes("new") && (
        <Badge className="bg-badge-new-background text-badge-new-text">New</Badge>
      )}
      {badges.includes("pro") && <Badge color="neutral">Pro</Badge>}
    </>
  );
}

export interface ModelSelectProps {
  models?: ModelOption[];
  /** Controlled selection (a model id). */
  value?: string;
  /** Starting model when uncontrolled. Defaults to the first enabled model. */
  defaultValue?: string;
  onChange?: (id: string, model: ModelOption) => void;
  /** `ghost` sits inside a composer toolbar; `outline` is the kit's bordered field. */
  variant?: "ghost" | "outline";
  size?: SelectSize;
  /** Visible label above the trigger. Without it the select is named by `aria-label`. */
  label?: ReactNode;
  "aria-label"?: string;
  isDisabled?: boolean;
  /** Hide the name in the trigger and show only the monogram. */
  compact?: boolean;
  className?: string;
}

const GHOST_TRIGGER =
  "rounded-full border-transparent bg-transparent shadow-none text-text-secondary hover:border-transparent hover:bg-background-secondary-default hover:text-text-primary data-[pressed]:bg-background-secondary-default";

// #region critical
export function ModelSelect({
  models = MODEL_OPTIONS,
  value,
  defaultValue,
  onChange,
  variant = "ghost",
  size = "md",
  label,
  "aria-label": ariaLabel = "Model",
  isDisabled,
  compact = false,
  className,
}: ModelSelectProps) {
  const fallback = models.find((m) => !m.isDisabled)?.id ?? models[0]?.id ?? null;
  const [internal, setInternal] = useState<string | null>(defaultValue ?? fallback);
  // Controlled when `value` is passed; otherwise the select keeps its own pick.
  const selectedId = value ?? internal;
  const selected = models.find((m) => m.id === selectedId);

  return (
    <Select<ModelOption>
      label={label}
      aria-label={label ? undefined : ariaLabel}
      size={size}
      isDisabled={isDisabled}
      selectedKey={selectedId}
      disabledKeys={models.filter((m) => m.isDisabled).map((m) => m.id)}
      onSelectionChange={(key) => {
        if (key == null) return;
        const id = String(key);
        const model = models.find((m) => m.id === id);
        if (!model) return;
        if (value === undefined) setInternal(id);
        onChange?.(id, model);
      }}
      className={cx("w-fit", className)}
      triggerClassName={variant === "ghost" ? GHOST_TRIGGER : undefined}
      // The kit listbox caps at 240px; five two-line rows need about 300px.
      popoverClassName="w-[320px] [&_[role=listbox]]:max-h-[336px]"
      renderValue={
        selected ? (
          <>
            <ModelMonogram model={selected} small />
            <span data-model-name className={cx("truncate", compact && "sr-only")}>{selected.name}</span>
          </>
        ) : (
          <span className="text-text-placeholder">Choose a model</span>
        )
      }
    >
      {models.map((model) => {
        const isSelected = model.id === selectedId;
        return (
          <SelectItem key={model.id} id={model.id} textValue={model.name} className="gap-2.5">
            <ModelMonogram model={model} small={size === "sm"} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text slot="label" className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{model.name}</span>
                <ModelBadges badges={model.badges} />
              </Text>
              {model.description && (
                <Text slot="description" className="truncate text-body-2-regular text-text-tertiary">
                  {model.description}
                </Text>
              )}
            </span>
            <RiCheckLine
              aria-hidden
              className={cx(
                "size-4 shrink-0 text-accent-500 transition-opacity duration-150 ease-out motion-reduce:transition-none",
                isSelected ? "opacity-100" : "opacity-0",
              )}
            />
          </SelectItem>
        );
      })}
    </Select>
  );
}
// #endregion
