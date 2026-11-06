/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Typewriter Install" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { Key } from "react-aria-components";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";

/**
 * Typewriter Install — an install command that types itself out behind a
 * caret. Package-manager tabs swap the command and start the typing again;
 * the copy button always copies the whole line, typed or not.
 *
 *   <TypewriterInstall packageName="motion" />
 *   <TypewriterInstall commands={[{ id: "cli", label: "CLI", command: "npx kinetic add tabs" }]} />
 *
 * Each tab's panel owns its own typing state, so switching tabs remounts the
 * line and the typing restarts from the first character with nothing to
 * reset by hand. Under reduced motion the full line is shown at once.
 */

export interface InstallCommand {
  id: string;
  /** Tab label, e.g. "pnpm". */
  label: string;
  /** The full command the line types out and the copy button copies. */
  command: string;
}

export interface TypewriterInstallProps {
  /** Package used to build the default pnpm / npm / yarn / bun commands. */
  packageName?: string;
  /** Overrides the default commands entirely. */
  commands?: InstallCommand[];
  /** Controlled tab id. */
  value?: string;
  /** Initial tab id when uncontrolled. Default: the first command. */
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Base milliseconds per character. Default 42. */
  speed?: number;
  /** Pause before the first character, in ms. Default 320. */
  startDelay?: number;
  /** Glyph shown before the command. Default "$". */
  prompt?: string;
  /** Accessible name of the tab list. */
  label?: string;
  className?: string;
}

export function installCommands(packageName: string): InstallCommand[] {
  return [
    { id: "pnpm", label: "pnpm", command: `pnpm add ${packageName}` },
    { id: "npm", label: "npm", command: `npm install ${packageName}` },
    { id: "yarn", label: "yarn", command: `yarn add ${packageName}` },
    { id: "bun", label: "bun", command: `bun add ${packageName}` },
  ];
}

const CARET_CSS = `
@keyframes kinetic-typewriter-caret {
  0%, 55% { opacity: 1; }
  56%, 100% { opacity: 0; }
}
[data-typewriter-caret][data-idle="true"] {
  animation: kinetic-typewriter-caret 1.06s step-end infinite;
}
@media (prefers-reduced-motion: reduce) {
  [data-typewriter-caret][data-idle="true"] { animation: none; }
}
`;

const COPIED_MS = 1600;

// #region critical
/**
 * Delay before character `i`. Deterministic, so server and client agree and
 * every replay has the same rhythm: ±20% around `speed` from the index, a
 * longer beat after a space (the eye reads word by word) and after `@`/`/`.
 */
function charDelay(text: string, i: number, speed: number) {
  const jitter = 0.8 + ((i * 37) % 9) / 20;
  const prev = text[i - 1];
  const beat = prev === " " ? 2.4 : prev === "@" || prev === "/" ? 1.6 : 1;
  return speed * jitter * beat;
}

/** One typed line. Mounted per tab, so a tab change restarts it. */
function TypedLine({ text, speed, startDelay, prompt }: { text: string; speed: number; startDelay: number; prompt: string }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    let timer = window.setTimeout(function step() {
      i += 1;
      setCount(i);
      if (i < text.length) timer = window.setTimeout(step, charDelay(text, i, speed));
    }, startDelay);
    return () => window.clearTimeout(timer);
  }, [text, speed, startDelay, reduced]);

  // Derived, not stored: reduced motion shows the whole line on the same
  // render the preference is known, with no typing frame in between.
  const shown = reduced ? text.length : Math.min(count, text.length);
  const done = shown >= text.length;

  return (
    <div className="flex min-w-0 items-baseline gap-2.5 font-mono text-body-2-regular">
      <span aria-hidden className="shrink-0 select-none text-text-tertiary">
        {prompt}
      </span>
      {/* The full line sits invisibly underneath to hold the final width and
          wrap, so the card never grows while the line types. */}
      <span className="grid min-w-0 flex-1 break-all">
        <span aria-hidden className="invisible col-start-1 row-start-1">
          {text}
          <span className="inline-block w-[2px]" />
        </span>
        <span aria-hidden className="col-start-1 row-start-1 text-text-primary">
          {text.slice(0, shown)}
          <span
            data-idle={done ? "true" : "false"}
            data-typewriter-caret=""
            className="ms-px inline-block h-[1em] w-[2px] rounded-full bg-accent-500 align-[-0.14em]"
          />
        </span>
        <span className="sr-only">{text}</span>
      </span>
    </div>
  );
}

/** Copies the whole command; the icon swaps to a check for 1.6s. */
function CopyCommandButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    timer.current = window.setTimeout(() => setStatus("idle"), COPIED_MS);
  };

  const copied = status === "copied";
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className={cx(
          "relative -my-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-icon-secondary",
          "transition-colors duration-150 ease-out hover:bg-background-secondary-default hover:text-foreground-icon-primary",
          "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          "active:bg-background-secondary-hover",
        )}
      >
        <RiFileCopyLine
          aria-hidden
          className={cx(
            "absolute size-4 transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none",
            copied ? "scale-50 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <RiCheckLine
          aria-hidden
          className={cx(
            "absolute size-4 text-state-success-text transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </button>
      <span role="status" className="sr-only">
        {status === "copied" ? "Copied to clipboard" : status === "failed" ? "Copy failed, select the command instead" : ""}
      </span>
    </>
  );
}

export function TypewriterInstall({
  packageName = "motion",
  commands,
  value,
  defaultValue,
  onChange,
  speed = 42,
  startDelay = 320,
  prompt = "$",
  label = "Package manager",
  className,
}: TypewriterInstallProps) {
  const list = commands ?? installCommands(packageName);
  const [inner, setInner] = useState(defaultValue ?? list[0]?.id ?? "");
  const selected = value ?? inner;
  const current = list.find((c) => c.id === selected) ?? list[0];

  const select = (key: Key) => {
    const id = String(key);
    setInner(id);
    onChange?.(id);
  };

  return (
    <Tabs
      selectedKey={current?.id}
      onSelectionChange={select}
      className={cx(
        "w-full max-w-[560px] overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-card",
        className,
      )}
    >
      <style href="kinetic-typewriter-install" precedence="medium">
        {CARET_CSS}
      </style>
      <div className="flex items-center border-b border-border-button-default px-2 py-1.5">
        <TabList aria-label={label} className="flex items-center gap-0.5">
          {list.map((c) => (
            <Tab
              key={c.id}
              id={c.id}
              className={cx(
                "cursor-pointer rounded-md px-2.5 py-1 font-mono text-caption-1-medium text-text-secondary outline-none",
                "transition-colors duration-150 ease-out hover:text-text-primary",
                "data-selected:bg-background-secondary-default data-selected:text-text-primary",
                "data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring",
              )}
            >
              {c.label}
            </Tab>
          ))}
        </TabList>
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {list.map((c) => (
          <TabPanel key={c.id} id={c.id} className="min-w-0 flex-1 rounded-sm outline-none data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring">
            <TypedLine text={c.command} speed={speed} startDelay={startDelay} prompt={prompt} />
          </TabPanel>
        ))}
        {current && <CopyCommandButton text={current.command} />}
      </div>
    </Tabs>
  );
}
// #endregion
