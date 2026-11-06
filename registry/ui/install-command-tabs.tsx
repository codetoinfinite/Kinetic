/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Install Command Tabs" (boardui.com/components/line-chart-card).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { ReactNode, Ref } from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { CopyButton } from "@/registry/ui/code-block-copy";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export const PACKAGE_MANAGERS: readonly PackageManager[] = ["pnpm", "npm", "yarn", "bun"];

export interface InstallCommandSource {
  /** Run a package binary without installing it: `boardui@latest add line-chart-card`. */
  run?: string;
  /** Add packages to the project: `"recharts"` or `["recharts", "motion"]`. */
  install?: string | readonly string[];
  /** With `install`: add as a dev dependency. */
  dev?: boolean;
  /** Exact command per manager. Wins over `run` and `install`. */
  commands?: Partial<Record<PackageManager, string>>;
}

const RUNNERS: Record<PackageManager, string> = {
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
  bun: "bunx --bun",
};

const ADDERS: Record<PackageManager, { add: string; dev: string }> = {
  npm: { add: "npm install", dev: "-D" },
  pnpm: { add: "pnpm add", dev: "-D" },
  yarn: { add: "yarn add", dev: "-D" },
  bun: { add: "bun add", dev: "--dev" },
};

/** The command a given package manager needs for `source`. */
export function getInstallCommand(manager: PackageManager, source: InstallCommandSource): string {
  const explicit = source.commands?.[manager];
  if (explicit) return explicit;
  if (source.run) return `${RUNNERS[manager]} ${source.run}`;
  const packages = typeof source.install === "string" ? [source.install] : (source.install ?? []);
  const { add, dev } = ADDERS[manager];
  return [add, source.dev ? dev : "", ...packages].filter(Boolean).join(" ");
}

/**
 * Split a command into the runner (`npx`, `pnpm dlx`, `bun add`…) and the
 * rest, so the two can be coloured differently. Falls back to the first word.
 */
function splitRunner(command: string): [string, string] {
  const runners = [...Object.values(RUNNERS), ...Object.values(ADDERS).map((a) => a.add)].sort(
    (a, b) => b.length - a.length,
  );
  const hit = runners.find((r) => command === r || command.startsWith(`${r} `));
  if (hit) return [hit, command.slice(hit.length)];
  const space = command.indexOf(" ");
  return space === -1 ? [command, ""] : [command.slice(0, space), command.slice(space)];
}

export interface InstallCommandTabsProps extends InstallCommandSource {
  /** Which managers get a tab, in order. */
  managers?: readonly PackageManager[];
  /** Selected manager (controlled); share it between blocks to keep them in sync. */
  value?: PackageManager;
  /** Initial manager when uncontrolled. Defaults to the first of `managers`. */
  defaultValue?: PackageManager;
  onValueChange?: (manager: PackageManager) => void;
  /** Accessible name of the tab list. */
  "aria-label"?: string;
  onCopied?: (command: string) => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const TAB_CLASS = cx(
  "inline-flex h-7 cursor-pointer items-center rounded-lg px-2.5 text-body-medium outline-none",
  "text-text-secondary transition-[color,background-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
  "hover:text-text-primary",
  "data-[selected]:bg-background-primary-default data-[selected]:text-text-primary data-[selected]:shadow-2xs",
  "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
);

/**
 * One install command, four package managers. The tab row switches between
 * pnpm, npm, yarn and bun spellings of the same command; the copy button
 * always copies the one on screen. Control `value` to keep several blocks on
 * the reader's manager.
 */
export function InstallCommandTabs({
  run,
  install,
  dev,
  commands,
  managers = PACKAGE_MANAGERS,
  value,
  defaultValue,
  onValueChange,
  "aria-label": ariaLabel = "Package manager",
  onCopied,
  className,
  ref,
}: InstallCommandTabsProps) {
  const first = managers[0] ?? "pnpm";
  const [uncontrolled, setUncontrolled] = useState<PackageManager>(defaultValue ?? first);
  const selected = value ?? uncontrolled;
  const active = managers.includes(selected) ? selected : first;

  // #region critical
  // Every command is derived, never stored: changing `run` or `install`
  // updates all four spellings at once, and the copy button reads the one
  // that matches the selected tab at click time.
  const source: InstallCommandSource = { run, install, dev, commands };
  const lines = managers.map((manager) => {
    const command = getInstallCommand(manager, source);
    const [runner, rest] = splitRunner(command);
    return { manager, command, runner, rest };
  });
  const current = lines.find((line) => line.manager === active)?.command ?? "";

  const select = (key: PackageManager) => {
    setUncontrolled(key);
    onValueChange?.(key);
  };
  // #endregion

  return (
    <Tabs
      ref={ref}
      selectedKey={active}
      onSelectionChange={(key) => {
        const next = managers.find((m) => m === key);
        if (next) select(next);
      }}
      className={cx("flex w-full min-w-0 flex-col rounded-2xl bg-background-secondary-default p-1.5", className)}
    >
      <div className="flex min-h-9 items-center justify-between gap-2 pb-1.5 ps-0.5 pe-0.5">
        <TabList aria-label={ariaLabel} className="flex min-w-0 flex-wrap gap-0.5">
          {managers.map((manager) => (
            <Tab key={manager} id={manager} className={TAB_CLASS}>
              {manager}
            </Tab>
          ))}
        </TabList>
        <CopyButton value={() => current} label={`Copy ${active} command`} onCopied={onCopied} />
      </div>
      {lines.map(({ manager, runner, rest }) => (
        <TabPanel
          key={manager}
          id={manager}
          className="overflow-x-auto rounded-xl bg-docs-code-background px-4 py-3.5 shadow-xs outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset data-[focus-visible]:ring-border-focus-ring"
        >
          <code className="block whitespace-pre font-mono text-body-regular">
            <span className="text-status-purple-text">{runner}</span>
            <span className="text-docs-command-accent">{rest}</span>
          </code>
        </TabPanel>
      ))}
    </Tabs>
  );
}

export interface InstallStepsProps {
  children: ReactNode;
  className?: string;
}

/** Numbered docs steps joined by the `docs-install-rail` line. */
export function InstallSteps({ children, className }: InstallStepsProps) {
  return <ol className={cx("flex w-full min-w-0 flex-col", className)}>{children}</ol>;
}

export interface InstallStepProps {
  /** 1-based step number, shown zero-padded (`01`). */
  step: number;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

export function InstallStep({ step, title, description, children }: InstallStepProps) {
  return (
    <li className="group/step relative flex gap-4 pb-8 last:pb-0">
      <span aria-hidden className="relative flex w-7 shrink-0 flex-col items-center">
        <span className="flex size-7 items-center justify-center rounded-full bg-background-secondary-default font-mono text-caption-1-medium text-text-secondary">
          {String(step).padStart(2, "0")}
        </span>
        {/* The rail runs down to the next badge; the last step has none. */}
        <span className="mt-2 w-px flex-1 bg-docs-install-rail group-last/step:hidden" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-headline-semibold text-text-primary">
            <span className="sr-only">Step {step}: </span>
            {title}
          </span>
          {description && <span className="text-body-regular text-text-secondary">{description}</span>}
        </div>
        {children}
      </div>
    </li>
  );
}
