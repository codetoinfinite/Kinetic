/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "MCP Install Card" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { RiArrowRightLine, RiCheckLine, RiErrorWarningLine, RiFileCodeLine, RiFileCopyLine, RiPlugLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { Button } from "@/registry/ui/button";
import { Tab, TabList, TabPanel, Tabs } from "@/registry/ui/tabs";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export interface McpClient {
  id: string;
  label: string;
  icon?: IconComponent;
  /** Where the snippet goes, e.g. ".cursor/mcp.json". Shell snippets usually leave it out. */
  file?: string;
  language: "json" | "shell";
  code: string;
  /** One line under the snippet. */
  note?: ReactNode;
}

export interface McpInstallCardProps {
  clients: McpClient[];
  defaultClient?: string;
  title?: ReactNode;
  description?: ReactNode;
  guide?: { label: string; href: string };
  /** Called after a successful copy. */
  onCopy?: (clientId: string) => void;
  className?: string;
}

const RESET_MS = 2000;

type Token = { text: string; cls?: string };

/** Tiny highlighter: JSON keys, JSON strings and punctuation, or the program name of a shell line. */
function tokenize(code: string, language: McpClient["language"]): Token[] {
  if (language === "shell") {
    return code.split("\n").flatMap((line, i) => {
      const lead: Token[] = i > 0 ? [{ text: "\n" }] : [];
      const match = /^(\s*)(\S+)(.*)$/.exec(line);
      if (!match) return [...lead, { text: line }];
      return [
        ...lead,
        { text: "$ ", cls: "select-none text-text-tertiary" },
        { text: (match[1] ?? "") + (match[2] ?? ""), cls: "text-accent-600 dark:text-accent-400" },
        { text: match[3] ?? "" },
      ];
    });
  }
  const out: Token[] = [];
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|([{}[\],])/g;
  let last = 0;
  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m.index > last) out.push({ text: code.slice(last, m.index) });
    if (m[1]) {
      out.push({ text: m[1], cls: m[2] ? "text-accent-600 dark:text-accent-400" : "text-state-success-text" });
      if (m[2]) out.push({ text: m[2], cls: "text-text-tertiary" });
    } else {
      out.push({ text: m[0], cls: "text-text-tertiary" });
    }
    last = re.lastIndex;
  }
  if (last < code.length) out.push({ text: code.slice(last) });
  return out;
}

// #region critical
type CopyState = { id: string; ok: boolean } | null;

export function McpInstallCard({
  clients,
  defaultClient,
  title = "Install with your agent through MCP",
  description,
  guide,
  onCopy,
  className,
}: McpInstallCardProps) {
  const [copy, setCopy] = useState<CopyState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = (next: CopyState) => {
    if (timer.current) clearTimeout(timer.current);
    setCopy(next);
    timer.current = setTimeout(() => setCopy(null), RESET_MS);
  };

  const copyCode = async (client: McpClient) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(client.code);
      flash({ id: client.id, ok: true });
      onCopy?.(client.id);
    } catch {
      flash({ id: client.id, ok: false });
    }
  };

  return (
    <article
      className={cx(
        "w-full max-w-xl rounded-3xl bg-background-secondary-default p-1 ring-1 ring-separator-border",
        className,
      )}
    >
      <div className="rounded-[20px] bg-background-primary-default px-5 pt-5 pb-1 shadow-xs ring-1 ring-separator-border">
        <div className="flex items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background-secondary-default ring-1 ring-separator-border">
            <RiPlugLine aria-hidden className="size-5 text-foreground-icon-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="text-headline-semibold text-balance text-text-primary">{title}</h3>
            {description && <p className="mt-1 text-body-2-regular text-pretty text-text-secondary">{description}</p>}
          </div>
        </div>

        <Tabs
          className="mt-4"
          defaultSelectedKey={defaultClient ?? clients[0]?.id}
          onSelectionChange={() => {
            if (timer.current) clearTimeout(timer.current);
            setCopy(null);
          }}
        >
          <TabList aria-label="MCP client" className="overflow-x-auto">
            {clients.map((client) => (
              <Tab key={client.id} id={client.id} icon={client.icon}>
                {client.label}
              </Tab>
            ))}
          </TabList>

          {clients.map((client) => {
            const state = copy?.id === client.id ? copy : null;
            return (
              <TabPanel key={client.id} id={client.id} className="py-4 outline-none">
                <div className="overflow-hidden rounded-2xl bg-background-secondary-default ring-1 ring-separator-border">
                  <div className="flex items-center gap-2 border-b border-separator-border py-1.5 pr-1.5 pl-3">
                    <RiFileCodeLine aria-hidden className="size-4 shrink-0 text-foreground-icon-tertiary" />
                    <span className="min-w-0 flex-1 truncate font-mono text-caption-1-regular text-text-secondary">
                      {client.file ?? "Terminal"}
                    </span>
                    <Button
                      size="xs"
                      variant="secondary"
                      leadingIcon={state ? (state.ok ? RiCheckLine : RiErrorWarningLine) : RiFileCopyLine}
                      onClick={() => void copyCode(client)}
                      aria-label={`Copy ${client.label} ${client.language === "shell" ? "command" : "config"}`}
                      className="min-w-[84px]"
                    >
                      {state ? (state.ok ? "Copied" : "Failed") : "Copy"}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-5 text-text-primary">
                    <code>
                      {tokenize(client.code, client.language).map((token, i) => (
                        <span key={i} className={token.cls}>
                          {token.text}
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>
                {client.note && <p className="mt-2.5 px-1 text-caption-1-regular text-text-tertiary">{client.note}</p>}
                <span role="status" className="sr-only">
                  {state ? (state.ok ? "Copied to clipboard" : "Copy failed, select the text and copy it manually") : ""}
                </span>
              </TabPanel>
            );
          })}
        </Tabs>
      </div>

      {guide && (
        <a
          href={guide.href}
          className="group flex items-center justify-center gap-1.5 rounded-b-[20px] px-4 py-3 text-body-medium text-accent-600 outline-none hover:text-accent-700 focus-visible:ring-2 focus-visible:ring-border-focus-ring dark:text-accent-400 dark:hover:text-accent-300"
        >
          {guide.label}
          <RiArrowRightLine
            aria-hidden
            className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </a>
      )}
    </article>
  );
}
// #endregion
