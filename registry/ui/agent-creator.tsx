/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Creator" (boardui.com/components/agent-creator).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { FieldError, Input, Label, TextArea, TextField } from "react-aria-components";
import {
  RiCalendarLine,
  RiCheckLine,
  RiCodeSSlashLine,
  RiErrorWarningLine,
  RiFileTextLine,
  RiGlobalLine,
  RiMailLine,
  RiNotification3Line,
  RiSearchLine,
  RiSpeedLine,
  RiUserVoiceLine,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { motion } from "motion/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { useResizeObserver } from "@/registry/hooks/use-resize-observer";
import { Button } from "@/registry/ui/button";
import { Select, SelectItem } from "@/registry/ui/select";
import { Switch } from "@/registry/ui/switch";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { Spinner } from "@/registry/ui/spinner";
import { AGENT_FACES, AGENT_SHAPES, FaceDisc, PaperAvatar } from "@/registry/ui/agent-creator-avatar";
import type { AgentFaceId, AgentShapeId } from "@/registry/ui/agent-creator-avatar";

/**
 * Agent Creator: a "make an agent" card. A paper avatar sits in the middle of
 * a ring of faces with an arc of shapes underneath, a colour pill below it,
 * and grouped profile / capability / preference fields under that. Creating
 * validates the draft, awaits `onCreate`, then swaps to a created summary.
 */

export interface AgentDraft {
  name: string;
  label: string;
  description: string;
  shape: AgentShapeId;
  face: AgentFaceId;
  /** Paper colour, 6-digit hex. */
  color: string;
  model: string;
  tools: string[];
  language: string;
  notifications: boolean;
  voice: string;
  speed: string;
}

export interface AgentOption {
  id: string;
  label: string;
  icon?: RemixiconComponentType;
}

export interface AgentColor {
  id: string;
  label: string;
  hex: string;
}

export type AgentField = "name" | "label" | "description" | "tools";
export type AgentErrors = Partial<Record<AgentField, string>>;

export const AGENT_COLORS: readonly AgentColor[] = [
  { id: "blue", label: "Blue", hex: "#3B82F6" },
  { id: "teal", label: "Teal", hex: "#14B8A6" },
  { id: "violet", label: "Violet", hex: "#8B5CF6" },
  { id: "pink", label: "Pink", hex: "#EC4899" },
  { id: "red", label: "Red", hex: "#EF4444" },
  { id: "orange", label: "Orange", hex: "#F97316" },
  { id: "cyan", label: "Cyan", hex: "#06B6D4" },
  { id: "lime", label: "Lime", hex: "#84CC16" },
  { id: "green", label: "Green", hex: "#22C55E" },
];

export const AGENT_MODELS: readonly AgentOption[] = [
  { id: "swift", label: "Swift mini" },
  { id: "balanced", label: "Balanced" },
  { id: "deep", label: "Deep reasoning" },
];

export const AGENT_TOOLS: readonly AgentOption[] = [
  { id: "web", label: "Web search", icon: RiSearchLine },
  { id: "code", label: "Code runner", icon: RiCodeSSlashLine },
  { id: "files", label: "Files", icon: RiFileTextLine },
  { id: "calendar", label: "Calendar", icon: RiCalendarLine },
  { id: "email", label: "Email", icon: RiMailLine },
];

export const AGENT_LANGUAGES: readonly AgentOption[] = [
  { id: "auto", label: "Auto-detect" },
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "de", label: "German" },
  { id: "ja", label: "Japanese" },
];

export const AGENT_VOICES: readonly AgentOption[] = [
  { id: "alice", label: "Alice" },
  { id: "jonas", label: "Jonas" },
  { id: "mira", label: "Mira" },
  { id: "theo", label: "Theo" },
];

export const AGENT_SPEEDS: readonly AgentOption[] = [
  { id: "0.75", label: "0.75×" },
  { id: "1", label: "1×" },
  { id: "1.25", label: "1.25×" },
  { id: "1.5", label: "1.5×" },
];

export const DEFAULT_AGENT_DRAFT: AgentDraft = {
  name: "",
  label: "",
  description: "",
  shape: "cloud",
  face: "focused",
  color: "#F2A285",
  model: "balanced",
  tools: ["web"],
  language: "auto",
  notifications: true,
  voice: "alice",
  speed: "1",
};

/* Stage geometry, in px. The avatar sits at (CX, CY); faces ring it at FACE_R
   and the shape arc hangs below on a wider radius. */
const STAGE_W = 320;
const CX = 160;
const CY = 124;
const AVATAR = 136;
const FACE_R = 104;
const FACE_SIZE = 32;
const SHAPE_R = 162;
const SHAPE_STEP_DEG = 24;
const SHAPE_VISIBLE = 2;
const TILE = 48;
const STAGE_H = CY + SHAPE_R + TILE / 2 + 10;

const FIELD_ORDER: readonly AgentField[] = ["name", "label", "description", "tools"];

// #region critical
/** Field-level problems with a draft; an empty object means it can be created. */
export function validateAgent(draft: AgentDraft): AgentErrors {
  const errors: AgentErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Give the agent a name.";
  else if (name.length < 2) errors.name = "Use at least 2 characters.";
  else if (name.length > 40) errors.name = "Keep the name under 40 characters.";
  const label = draft.label.trim();
  if (!label) errors.label = "Add a short label.";
  else if (label.length > 16) errors.label = "Labels fit 16 characters.";
  if (draft.description.trim().length < 12) errors.description = "Say what it helps with (12+ characters).";
  if (draft.tools.length === 0) errors.tools = "Pick at least one tool.";
  return errors;
}

/** Place shape `index` on the arc relative to the selected one; k wraps to -n/2..n/2. */
function arcSlot(index: number, selected: number, count: number) {
  let k = (index - selected + count) % count;
  if (k > count / 2) k -= count;
  const theta = ((90 - k * SHAPE_STEP_DEG) * Math.PI) / 180;
  const visible = Math.abs(k) <= SHAPE_VISIBLE;
  return {
    k,
    visible,
    x: CX + SHAPE_R * Math.cos(theta) - TILE / 2,
    y: CY + SHAPE_R * Math.sin(theta) - TILE / 2,
    scale: k === 0 ? 1 : visible ? 0.86 : 0.5,
  };
}

/** Roving-tabindex arrow handling shared by the face ring and shape arc. */
function rovingIndex(event: KeyboardEvent, index: number, count: number): number | null {
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
// #endregion

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";
const INPUT =
  "w-full rounded-lg bg-background-tertiary-default px-2.5 text-body-2-regular text-text-primary placeholder:text-text-tertiary " +
  "outline-none focus:ring-2 focus:ring-border-focus-ring data-[invalid]:ring-1 data-[invalid]:ring-border-error-default data-[invalid]:focus:ring-2";
const ERROR_TEXT = "text-caption-1-medium text-text-error-primary";

/* ------------------------------------------------------------------ stage */

interface StageProps {
  draft: AgentDraft;
  reduce: boolean;
  onShape: (shape: AgentShapeId) => void;
  onFace: (face: AgentFaceId) => void;
}

function AvatarStage({ draft, reduce, onShape, onFace }: StageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(frameRef);
  // Narrow cards shrink the whole stage instead of clipping the outer tiles.
  const fit = width > 0 ? Math.min(1, width / STAGE_W) : 1;
  const faceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const shapeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // The avatar only pops after a pick, never on first paint.
  const [picked, setPicked] = useState(false);
  const faceIndex = Math.max(0, AGENT_FACES.findIndex((f) => f.id === draft.face));
  const shapeIndex = Math.max(0, AGENT_SHAPES.findIndex((s) => s.id === draft.shape));
  const shapeLabel = AGENT_SHAPES[shapeIndex]?.label ?? "";
  const faceLabel = AGENT_FACES[faceIndex]?.label ?? "";

  const pickFace = (i: number, focus: boolean) => {
    const next = AGENT_FACES[i];
    if (!next) return;
    setPicked(true);
    onFace(next.id);
    if (focus) faceRefs.current[i]?.focus();
  };
  const pickShape = (i: number, focus: boolean) => {
    const next = AGENT_SHAPES[i];
    if (!next) return;
    setPicked(true);
    onShape(next.id);
    if (focus) shapeRefs.current[i]?.focus();
  };

  return (
    <div ref={frameRef} className="relative w-full shrink-0" style={{ height: STAGE_H * fit }}>
    <div
      className="absolute top-0 left-1/2 origin-top"
      style={{ width: STAGE_W, height: STAGE_H, transform: `translateX(-50%) scale(${fit})` }}
    >
      <motion.div
        key={`${draft.shape}-${draft.face}`}
        className="absolute"
        style={{ left: CX - AVATAR / 2, top: CY - AVATAR / 2 }}
        initial={picked && !reduce ? { scale: 0.86, rotate: -4 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
      >
        <PaperAvatar
          shape={draft.shape}
          face={draft.face}
          color={draft.color}
          size={AVATAR}
          animated={!reduce}
          label={`${shapeLabel} avatar, ${faceLabel.toLowerCase()} face`}
        />
      </motion.div>

      <div role="radiogroup" aria-label="Face">
        {AGENT_FACES.map((face, i) => {
          const theta = ((-90 + i * (360 / AGENT_FACES.length)) * Math.PI) / 180;
          const selected = i === faceIndex;
          return (
            <button
              key={face.id}
              ref={(el) => {
                faceRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={face.label}
              tabIndex={selected ? 0 : -1}
              onClick={() => pickFace(i, false)}
              onKeyDown={(e) => {
                const next = rovingIndex(e, i, AGENT_FACES.length);
                if (next === null) return;
                e.preventDefault();
                pickFace(next, true);
              }}
              className={cx(
                "absolute grid place-items-center rounded-full transition-transform duration-200 ease-out hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100",
                FOCUS_RING,
                selected && "ring-2 ring-foreground-icon-secondary ring-offset-1 ring-offset-background-primary-default",
              )}
              style={{
                left: CX + FACE_R * Math.cos(theta) - FACE_SIZE / 2,
                top: CY + FACE_R * Math.sin(theta) - FACE_SIZE / 2,
                width: FACE_SIZE,
                height: FACE_SIZE,
              }}
            >
              <FaceDisc face={face.id} color={draft.color} size={FACE_SIZE} />
            </button>
          );
        })}
      </div>

      {/* Socket under the selected shape. */}
      <span
        aria-hidden
        className="absolute rounded-xl border border-border-table bg-background-secondary-default"
        style={{ left: CX - TILE / 2 - 4, top: CY + SHAPE_R - TILE / 2 - 4, width: TILE + 8, height: TILE + 8 }}
      />
      <div role="radiogroup" aria-label="Shape">
        {AGENT_SHAPES.map((shape, i) => {
          const slot = arcSlot(i, shapeIndex, AGENT_SHAPES.length);
          const selected = slot.k === 0;
          return (
            <button
              key={shape.id}
              ref={(el) => {
                shapeRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={shape.label}
              tabIndex={selected ? 0 : -1}
              onClick={() => pickShape(i, false)}
              onKeyDown={(e) => {
                const next = rovingIndex(e, i, AGENT_SHAPES.length);
                if (next === null) return;
                e.preventDefault();
                pickShape(next, true);
              }}
              className={cx(
                "absolute top-0 left-0 grid place-items-center rounded-xl transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
                FOCUS_RING,
                !slot.visible && "pointer-events-none",
              )}
              style={{
                width: TILE,
                height: TILE,
                opacity: slot.visible ? 1 : 0,
                transform: `translate(${slot.x}px, ${slot.y}px) scale(${slot.scale})`,
              }}
            >
              <PaperAvatar shape={shape.id} face={null} color={draft.color} size={selected ? 40 : 44} grain={false} />
            </button>
          );
        })}
      </div>
    </div>
    </div>
  );
}

/* --------------------------------------------------------------- swatches */

function Swatches({
  colors,
  value,
  onChange,
}: {
  colors: readonly AgentColor[];
  value: string;
  onChange: (hex: string) => void;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const presetIndex = colors.findIndex((c) => c.hex.toLowerCase() === value.toLowerCase());
  const isCustom = presetIndex === -1;
  const ring = "ring-2 ring-foreground-icon-primary ring-offset-2 ring-offset-background-secondary-default";

  return (
    <div className="mx-auto flex w-fit max-w-full items-center gap-0.5 rounded-full bg-background-secondary-default p-1.5 sm:gap-1">
      <svg width={0} height={0} aria-hidden className="absolute">
        <defs>
          <radialGradient id={`${uid}-gloss`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
            <stop offset="55%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.18} />
          </radialGradient>
          <linearGradient id={`${uid}-rainbow`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="30%" stopColor="#facc15" />
            <stop offset="60%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
      <div role="radiogroup" aria-label="Paper colour" className="flex items-center gap-0.5 sm:gap-1">
        {colors.map((c, i) => {
          const selected = i === presetIndex;
          return (
            <button
              key={c.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.label}
              tabIndex={selected || (isCustom && i === 0) ? 0 : -1}
              onClick={() => onChange(c.hex)}
              onKeyDown={(e) => {
                const next = rovingIndex(e, i, colors.length);
                if (next === null) return;
                e.preventDefault();
                const target = colors[next];
                if (!target) return;
                onChange(target.hex);
                refs.current[next]?.focus();
              }}
              className={cx("size-5 shrink-0 rounded-full sm:size-6", FOCUS_RING, selected && ring)}
            >
              <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
                <circle cx={12} cy={12} r={12} fill={c.hex} />
                <circle cx={12} cy={12} r={12} fill={`url(#${uid}-gloss)`} />
              </svg>
            </button>
          );
        })}
      </div>
      <label
        className={cx(
          "relative size-5 shrink-0 cursor-pointer rounded-full sm:size-6 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-border-focus-ring",
          isCustom && ring,
        )}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom colour"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <svg viewBox="0 0 24 24" className="pointer-events-none size-full" aria-hidden>
          <circle cx={12} cy={12} r={12} fill={`url(#${uid}-rainbow)`} />
          {isCustom ? <circle cx={12} cy={12} r={5.5} fill={value} stroke="#ffffff" strokeWidth={1.5} /> : null}
        </svg>
      </label>
    </div>
  );
}

/* ----------------------------------------------------------------- fields */

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="rounded-2xl bg-background-secondary-default px-3">
      <div className="divide-y divide-background-primary-default">{children}</div>
    </section>
  );
}

function TextRow({
  label,
  value,
  onChange,
  error,
  placeholder,
  multiline,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
  multiline?: boolean;
  inputRef: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
}) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      isInvalid={Boolean(error)}
      className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-x-3 py-2.5"
    >
      <Label className="pt-1.5 text-body-2-medium text-text-primary">{label}</Label>
      <div className="flex min-w-0 flex-col gap-1">
        {multiline ? (
          <TextArea ref={inputRef} rows={2} placeholder={placeholder} className={cx(INPUT, "resize-none py-1.5")} />
        ) : (
          <Input ref={inputRef} placeholder={placeholder} className={cx(INPUT, "h-8")} />
        )}
        <FieldError className={ERROR_TEXT}>{error}</FieldError>
      </div>
    </TextField>
  );
}

function PrefRow({ icon: Icon, label, hint, children }: { icon: RemixiconComponentType; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5">
      <Icon aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
      <div className="min-w-0 flex-1">
        <p className="text-body-2-medium text-text-primary">{label}</p>
        {hint ? <p className="text-caption-1-regular text-text-tertiary">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function OptionSelect({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly AgentOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <Select
      aria-label={label}
      size="sm"
      className={cx("w-[136px] shrink-0", className)}
      value={value}
      onChange={(key) => {
        if (key !== null) onChange(String(key));
      }}
    >
      {options.map((o) => (
        <SelectItem key={o.id} id={o.id} textValue={o.label}>
          {o.label}
        </SelectItem>
      ))}
    </Select>
  );
}

/* --------------------------------------------------------------- creator */

export interface AgentCreatorProps {
  /** Controlled draft. Pair with `onChange`. */
  value?: AgentDraft;
  /** Uncontrolled starting draft, merged over DEFAULT_AGENT_DRAFT. Reset returns here. */
  defaultValue?: Partial<AgentDraft>;
  onChange?: (draft: AgentDraft) => void;
  /** Called with a valid draft. Return a promise to show the creating state; reject to show its message. */
  onCreate?: (draft: AgentDraft) => void | Promise<void>;
  /** Called after Reset or Create another restored the starting draft. */
  onReset?: () => void;
  models?: readonly AgentOption[];
  tools?: readonly AgentOption[];
  languages?: readonly AgentOption[];
  voices?: readonly AgentOption[];
  speeds?: readonly AgentOption[];
  colors?: readonly AgentColor[];
  submitLabel?: string;
  className?: string;
}

type Status = "editing" | "submitting" | "created";

export function AgentCreator({
  value,
  defaultValue,
  onChange,
  onCreate,
  onReset,
  models = AGENT_MODELS,
  tools = AGENT_TOOLS,
  languages = AGENT_LANGUAGES,
  voices = AGENT_VOICES,
  speeds = AGENT_SPEEDS,
  colors = AGENT_COLORS,
  submitLabel = "Create agent",
  className,
}: AgentCreatorProps) {
  const reduce = useReducedMotion();
  const initial = useRef<AgentDraft>({ ...DEFAULT_AGENT_DRAFT, ...defaultValue });
  const [inner, setInner] = useState<AgentDraft>(initial.current);
  const draft = value ?? inner;
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<Status>("editing");
  const [failure, setFailure] = useState<string | null>(null);
  const mounted = useRef(true);
  const fieldRefs = useRef<Partial<Record<AgentField, HTMLElement | null>>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toolsLabelId = useId();
  const toolsErrorId = useId();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (status === "created") headingRef.current?.focus();
  }, [status]);

  const errors = attempted ? validateAgent(draft) : {};
  const errorCount = Object.keys(errors).length;
  const title = draft.name.trim() || "New agent";

  const update = (patch: Partial<AgentDraft>) => {
    const next = { ...draft, ...patch };
    if (value === undefined) setInner(next);
    onChange?.(next);
    if (failure) setFailure(null);
  };

  const toggleTool = (id: string) =>
    update({ tools: draft.tools.includes(id) ? draft.tools.filter((t) => t !== id) : [...draft.tools, id] });

  const reset = () => {
    if (value === undefined) setInner(initial.current);
    onChange?.(initial.current);
    setAttempted(false);
    setFailure(null);
    setStatus("editing");
    bodyRef.current?.scrollTo({ top: 0 });
    onReset?.();
  };

  // #region critical
  const submit = async () => {
    if (status === "submitting") return;
    setAttempted(true);
    const found = validateAgent(draft);
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) {
      fieldRefs.current[first]?.focus();
      return;
    }
    setFailure(null);
    setStatus("submitting");
    try {
      await onCreate?.(draft);
      if (!mounted.current) return;
      setStatus("created");
    } catch (err) {
      if (!mounted.current) return;
      setStatus("editing");
      setFailure(err instanceof Error && err.message ? err.message : "Couldn't create the agent. Try again.");
    }
  };
  // #endregion

  const nameOf = (list: readonly AgentOption[], id: string) => list.find((o) => o.id === id)?.label ?? id;
  const submitting = status === "submitting";

  return (
    <div
      className={cx(
        "flex w-full max-w-[356px] flex-col overflow-hidden rounded-3xl border border-border-table bg-background-primary-default shadow-card",
        className,
      )}
    >
      <p role="status" className="sr-only">
        {submitting ? `Creating ${title}` : status === "created" ? `${title} created` : ""}
      </p>

      {status === "created" ? (
        <motion.div
          className="flex min-h-0 flex-1 flex-col"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5 pt-6 pb-4 text-center">
            <PaperAvatar
              shape={draft.shape}
              face={draft.face}
              color={draft.color}
              size={112}
              animated={!reduce}
              label={`${draft.name.trim()} avatar`}
            />
            <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-headline-semibold text-text-primary outline-none">
              {draft.name.trim()} is ready
            </h2>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-background-secondary-default px-2.5 py-0.5 text-caption-1-medium text-text-secondary">
              <RiCheckLine aria-hidden className="size-3.5 text-state-success-base" />
              {draft.label.trim()}
            </span>
            <p className="mt-3 text-body-2-regular text-text-secondary">{draft.description.trim()}</p>
            <dl className="mt-4 w-full divide-y divide-background-primary-default rounded-2xl bg-background-secondary-default px-3 text-left">
              {(
                [
                  ["Model", nameOf(models, draft.model)],
                  ["Tools", draft.tools.map((t) => nameOf(tools, t)).join(", ")],
                  ["Language", nameOf(languages, draft.language)],
                  ["Voice", `${nameOf(voices, draft.voice)} · ${nameOf(speeds, draft.speed)}`],
                ] as const
              ).map(([term, detail]) => (
                <div key={term} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-body-2-medium text-text-secondary">{term}</dt>
                  <dd className="min-w-0 text-right text-body-2-medium text-text-primary">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex gap-2 border-t border-border-table p-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStatus("editing")}>
              Edit details
            </Button>
            <Button variant="primary" className="flex-1" onClick={reset}>
              Create another
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          <header className="px-5 pt-4 pb-1 text-center">
            <h2 className="truncate text-body-semibold text-text-primary">{title}</h2>
          </header>
          <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pb-4">
            <AvatarStage
              draft={draft}
              reduce={reduce}
              onShape={(shape) => update({ shape })}
              onFace={(face) => update({ face })}
            />
            <Swatches colors={colors} value={draft.color} onChange={(color) => update({ color })} />

            <Group label="Profile">
              <TextRow
                label="Name"
                placeholder="Cloud engineer"
                value={draft.name}
                onChange={(name) => update({ name })}
                error={errors.name}
                inputRef={(el) => {
                  fieldRefs.current.name = el;
                }}
              />
              <TextRow
                label="Label"
                placeholder="Cloud"
                value={draft.label}
                onChange={(label) => update({ label })}
                error={errors.label}
                inputRef={(el) => {
                  fieldRefs.current.label = el;
                }}
              />
              <TextRow
                label="Description"
                placeholder="Helps with server architecture, cloud costs…"
                multiline
                value={draft.description}
                onChange={(description) => update({ description })}
                error={errors.description}
                inputRef={(el) => {
                  fieldRefs.current.description = el;
                }}
              />
            </Group>

            <Group label="Capabilities">
              <div className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-body-2-medium text-text-primary">Model</span>
                <OptionSelect label="Model" options={models} value={draft.model} onChange={(model) => update({ model })} />
              </div>
              <div className="flex flex-col gap-2 py-2.5">
                <span id={toolsLabelId} className="text-body-2-medium text-text-primary">
                  Tools
                </span>
                <div
                  role="group"
                  aria-labelledby={toolsLabelId}
                  aria-describedby={errors.tools ? toolsErrorId : undefined}
                  className="flex flex-wrap gap-1.5"
                >
                  {tools.map((tool, i) => {
                    const on = draft.tools.includes(tool.id);
                    const Icon = on ? RiCheckLine : (tool.icon ?? RiCheckLine);
                    return (
                      <button
                        key={tool.id}
                        ref={
                          i === 0
                            ? (el) => {
                                fieldRefs.current.tools = el;
                              }
                            : undefined
                        }
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleTool(tool.id)}
                        className={cx(
                          "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-caption-1-medium transition-colors duration-150 ease-out motion-reduce:transition-none",
                          FOCUS_RING,
                          on
                            ? "bg-background-primary-default text-text-primary shadow-xs ring-1 ring-border-button-default"
                            : "text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
                          errors.tools && "ring-1 ring-border-error-default",
                        )}
                      >
                        <Icon aria-hidden className="size-3.5" />
                        {tool.label}
                      </button>
                    );
                  })}
                </div>
                {errors.tools ? (
                  <p id={toolsErrorId} className={ERROR_TEXT}>
                    {errors.tools}
                  </p>
                ) : null}
              </div>
            </Group>

            <Group label="Preferences">
              <PrefRow icon={RiGlobalLine} label="Language">
                <OptionSelect
                  label="Language"
                  options={languages}
                  value={draft.language}
                  onChange={(language) => update({ language })}
                />
              </PrefRow>
              <PrefRow icon={RiNotification3Line} label="Notifications" hint="Show a notice when a reply is ready.">
                <Switch
                  aria-label="Notifications"
                  size="sm"
                  isSelected={draft.notifications}
                  onChange={(notifications) => update({ notifications })}
                />
              </PrefRow>
              <PrefRow icon={RiUserVoiceLine} label="Voice">
                <OptionSelect label="Voice" options={voices} value={draft.voice} onChange={(voice) => update({ voice })} />
              </PrefRow>
              <div className="flex flex-col gap-2 py-2.5">
                <div className="flex items-center gap-2.5">
                  <RiSpeedLine aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
                  <span className="text-body-2-medium text-text-primary">Playback speed</span>
                </div>
                <SegmentedControl
                  aria-label="Playback speed"
                  selectedKeys={[draft.speed]}
                  onSelectionChange={(keys) => {
                    const next = speeds.find((s) => keys.has(s.id));
                    if (next) update({ speed: next.id });
                  }}
                  className="w-full"
                >
                  {speeds.map((s) => (
                    <SegmentedControlItem key={s.id} id={s.id} className="flex-1">
                      {s.label}
                    </SegmentedControlItem>
                  ))}
                </SegmentedControl>
              </div>
            </Group>
          </div>

          <footer className="flex flex-col gap-2 border-t border-border-table p-3">
            {failure ? (
              <p role="alert" className={cx("flex items-center gap-1.5", ERROR_TEXT)}>
                <RiErrorWarningLine aria-hidden className="size-4 shrink-0" />
                {failure}
              </p>
            ) : errorCount > 0 ? (
              <p className={cx("flex items-center gap-1.5", ERROR_TEXT)}>
                <RiErrorWarningLine aria-hidden className="size-4 shrink-0" />
                {errorCount === 1 ? "Fix 1 field to continue." : `Fix ${errorCount} fields to continue.`}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset} disabled={submitting}>
                Reset
              </Button>
              <Button variant="primary" className="flex-1" onClick={submit} disabled={submitting} aria-busy={submitting}>
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" aria-hidden className="text-text-white" />
                    Creating…
                  </span>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
