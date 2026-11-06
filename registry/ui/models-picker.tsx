/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Models Picker" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  Radio as AriaRadio,
  RadioGroup as AriaRadioGroup,
  Switch as AriaSwitch,
} from "react-aria-components";
import { RadioDot } from "@/registry/ui/radio";
import { SearchField } from "@/registry/ui/search-field";
import { SwitchTrack } from "@/registry/ui/switch";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Models Picker — the list of models an agent can run on, each with a small
 * provider monogram. `selectionMode="single"` (default) is a radio group for
 * the active model; `"multiple"` gives every row a switch for the models
 * offered in the composer, with an "N of M enabled" count in the header.
 *
 *   <ModelsPicker models={MODELS} defaultValue="fable-5" />
 *   <ModelsPicker selectionMode="multiple" models={MODELS} defaultValue={["fable-5"]} searchable />
 *
 * A search field filters by name and provider. `children` render under a
 * divider (an effort control, a "manage models" link).
 */

export type ModelMonogramTone = "neutral" | "blue" | "purple" | "pink" | "teal" | "yellow" | "lime" | "orange";

export interface ModelOption {
  id: string;
  name: string;
  /** Provider name; read out to screen readers and matched by search. */
  provider: string;
  /** One or two letters drawn in the provider glyph. Default: provider's first letter. */
  monogram?: string;
  /** Glyph tint. Default `neutral`. */
  tone?: ModelMonogramTone;
  /** Caption under the name, e.g. "Anthropic · 1M context". */
  description?: string;
  isDisabled?: boolean;
}

interface BaseProps {
  models: ModelOption[];
  /** Header label; also the group's accessible name when it is a string. Default "Models". */
  label?: ReactNode;
  /** Show the search field. Default: when there are more than 5 models. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Footer content under a divider. */
  children?: ReactNode;
  className?: string;
}

export interface ModelsPickerSingleProps extends BaseProps {
  selectionMode?: "single";
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
}

export interface ModelsPickerMultipleProps extends BaseProps {
  selectionMode: "multiple";
  value?: string[];
  defaultValue?: string[];
  onChange?: (ids: string[]) => void;
}

export type ModelsPickerProps = ModelsPickerSingleProps | ModelsPickerMultipleProps;

const DEFAULT_TONE: ModelMonogramTone = "neutral";

const tones = sortCx({
  neutral: "bg-badge-neutral-background text-text-secondary",
  blue: "bg-status-blue-background text-status-blue-text",
  purple: "bg-status-purple-background text-status-purple-text",
  pink: "bg-status-rose-background text-status-rose-text",
  teal: "bg-status-cyan-background text-status-cyan-text",
  yellow: "bg-status-yellow-background text-status-yellow-text",
  lime: "bg-status-lime-background text-status-lime-text",
  orange: "bg-status-orange-background text-status-orange-text",
});

const row =
  "flex w-full items-center gap-2.5 rounded-2lg px-2.5 py-2 text-start outline-none transition-colors duration-150 ease-out motion-reduce:transition-none";

/** The provider glyph: tinted rounded square with one or two letters. */
export function ModelMonogram({ model, className }: { model: ModelOption; className?: string }) {
  const letters = (model.monogram ?? model.provider.charAt(0)).slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className={cx(
        "flex size-7 shrink-0 items-center justify-center rounded-[8px] text-caption-1-semibold tracking-tight",
        tones[model.tone ?? DEFAULT_TONE],
        className,
      )}
    >
      {letters}
    </span>
  );
}

function ModelText({ model }: { model: ModelOption }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-body-medium text-text-primary">{model.name}</span>
      {model.description ? (
        <span className="truncate text-caption-1-medium text-text-tertiary">{model.description}</span>
      ) : (
        <span className="sr-only">, {model.provider}</span>
      )}
    </span>
  );
}

// #region critical
export function ModelsPicker(props: ModelsPickerProps) {
  const { models, label = "Models", searchPlaceholder = "Search models", children, className } = props;
  const multiple = props.selectionMode === "multiple";
  const searchable = props.searchable ?? models.length > 5;

  const [query, setQuery] = useState("");
  const [single, setSingle] = useState<string | undefined>(
    props.selectionMode === "multiple" ? undefined : props.defaultValue,
  );
  const [many, setMany] = useState<string[]>(
    props.selectionMode === "multiple" ? (props.defaultValue ?? []) : [],
  );

  const selectedOne = props.selectionMode === "multiple" ? undefined : (props.value ?? single);
  const selectedMany = props.selectionMode === "multiple" ? (props.value ?? many) : [];

  const pick = (id: string) => {
    if (props.selectionMode === "multiple") return;
    setSingle(id);
    props.onChange?.(id);
  };

  const toggle = (id: string, on: boolean) => {
    if (props.selectionMode !== "multiple") return;
    // Keep the models' own order so the value is stable however it was toggled.
    const next = models.filter((m) => (m.id === id ? on : selectedMany.includes(m.id))).map((m) => m.id);
    setMany(next);
    props.onChange?.(next);
  };

  const q = query.trim().toLowerCase();
  const shown = q
    ? models.filter((m) => `${m.name} ${m.provider} ${m.description ?? ""}`.toLowerCase().includes(q))
    : models;

  const groupLabel = typeof label === "string" ? label : "Models";
  const count = multiple
    ? `${models.filter((m) => selectedMany.includes(m.id)).length} of ${models.length} enabled`
    : `${models.length} available`;

  const empty = (
    <p className="px-2.5 py-6 text-center text-caption-1-medium text-text-tertiary">
      No models match “{query.trim()}”
    </p>
  );

  return (
    <section
      className={cx(
        // Dark: primary and tertiary are both neutral-800, so the card drops to
        // secondary or the off switch tracks and the search field disappear.
        "flex w-full min-w-0 flex-col gap-1 rounded-2xl border border-border-table bg-background-primary-default p-1.5 shadow-xs dark:bg-background-secondary-default",
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-3 px-2.5 pt-1.5 pb-1">
        <h3 className="text-body-medium text-text-secondary">{label}</h3>
        <span className="text-caption-1-medium text-text-tertiary tabular-nums" aria-live="polite">
          {count}
        </span>
      </header>

      {searchable ? (
        <SearchField
          aria-label={`Search ${groupLabel.toLowerCase()}`}
          placeholder={searchPlaceholder}
          size="small"
          value={query}
          onChange={setQuery}
          className="px-1 pb-1"
        />
      ) : null}

      {multiple ? (
        <div role="group" aria-label={groupLabel} className="flex flex-col gap-0.5">
          {shown.length === 0
            ? empty
            : shown.map((m) => (
                <AriaSwitch
                  key={m.id}
                  isSelected={selectedMany.includes(m.id)}
                  isDisabled={m.isDisabled}
                  onChange={(on) => toggle(m.id, on)}
                  className={({ isHovered, isDisabled }) =>
                    cx(
                      row,
                      isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                      isHovered && "bg-background-primary-hover",
                    )
                  }
                >
                  {(state) => (
                    <>
                      <ModelMonogram model={m} />
                      <ModelText model={m} />
                      <SwitchTrack state={state} size="sm" />
                    </>
                  )}
                </AriaSwitch>
              ))}
        </div>
      ) : (
        <AriaRadioGroup
          aria-label={groupLabel}
          value={selectedOne ?? null}
          onChange={pick}
          className="flex flex-col gap-0.5"
        >
          {shown.length === 0
            ? empty
            : shown.map((m) => (
                <AriaRadio
                  key={m.id}
                  value={m.id}
                  isDisabled={m.isDisabled}
                  className={({ isSelected, isHovered, isDisabled }) =>
                    cx(
                      row,
                      isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                      isSelected
                        ? "bg-background-secondary-default dark:bg-background-primary-default"
                        : isHovered && "bg-background-primary-hover",
                    )
                  }
                >
                  {({ isSelected, isFocusVisible }) => (
                    <>
                      <ModelMonogram model={m} />
                      <ModelText model={m} />
                      <RadioDot selected={isSelected} focusVisible={isFocusVisible} />
                    </>
                  )}
                </AriaRadio>
              ))}
        </AriaRadioGroup>
      )}

      {children != null && children !== false ? (
        <>
          <hr className="mx-1 mt-1 border-border-table" />
          <div className="px-2.5 pt-1.5 pb-2">{children}</div>
        </>
      ) : null}
    </section>
  );
}
// #endregion
