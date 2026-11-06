/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Not Found Page" (boardui.com (404 page)).
 * No BoardUI source was used.
 */
"use client";

import { useId } from "react";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { RiArrowLeftLine, RiArrowRightLine, RiLayoutGridLine } from "@remixicon/react";
import { ButtonLink } from "@/registry/ui/button";
import { cx } from "@/registry/lib/cx";
import { directionalIconClass } from "@/registry/lib/directional-icon";

/**
 * Not Found Page: the 404 block. A big error code, a plain-language title and
 * description, two ways out (home and browse), a grid of suggested pages and
 * an optional footnote, such as machine-readable entry points for agents.
 * Content rises in on mount with a CSS stagger (`@starting-style`).
 *
 *   <NotFoundPage
 *     path="/charts/bubble"
 *     destinations={[{ title: "Components", description: "Every block.", href: "/components" }]}
 *   />
 */

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export interface NotFoundAction {
  label: string;
  href: string;
}

export interface NotFoundDestination {
  title: string;
  description: string;
  href: string;
  icon?: IconType;
}

export interface NotFoundFootnoteLink {
  label: string;
  href: string;
  description?: string;
}

export interface NotFoundFootnote {
  title: string;
  /** Paragraph under the title. `<code>` and `<a>` children are styled. */
  body?: ReactNode;
  links?: readonly NotFoundFootnoteLink[];
}

export interface NotFoundPageProps {
  /** The big error code. */
  code?: string;
  /** The requested path, shown in mono next to the code. */
  path?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Primary way out. `false` hides it. */
  homeAction?: NotFoundAction | false;
  /** Secondary way out. `false` hides it. */
  browseAction?: NotFoundAction | false;
  destinations?: readonly NotFoundDestination[];
  footnote?: NotFoundFootnote;
  /** Called for every link in the block. `preventDefault()` there to route client-side. */
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}

const DEFAULT_HOME: NotFoundAction = { label: "Back home", href: "/" };
const DEFAULT_BROWSE: NotFoundAction = { label: "Browse components", href: "/components" };

// #region critical
/** Entry stagger: each band starts 8px low and transparent, then settles. Static strings so Tailwind sees them. */
const STEP_DELAYS = ["delay-0", "delay-75", "delay-150", "delay-200", "delay-300", "delay-[400ms]", "delay-500"] as const;

function rise(step: number) {
  return cx(
    "transition-[opacity,translate] duration-500 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
    STEP_DELAYS[Math.min(step, STEP_DELAYS.length - 1)],
  );
}

function DestinationCard({
  item,
  step,
  onNavigate,
}: {
  item: NotFoundDestination;
  step: number;
  onNavigate?: NotFoundPageProps["onNavigate"];
}) {
  const Icon = item.icon;
  return (
    <li className={rise(step)}>
      <a
        href={item.href}
        data-destination=""
        onClick={(event) => onNavigate?.(item.href, event)}
        className="group flex h-full items-start gap-3 rounded-xl border border-border-component-detail-container bg-background-secondary-default p-4 outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
      >
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-button-default bg-background-primary-default shadow-xs">
            <Icon aria-hidden className="size-[18px] text-foreground-icon-secondary" />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-headline-semibold text-text-primary">
            {item.title}
            <RiArrowRightLine
              aria-hidden
              className={cx(
                "size-4 text-foreground-icon-tertiary transition-[translate,color] duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground-icon-secondary motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 rtl:group-hover:-translate-x-0.5",
                directionalIconClass(RiArrowRightLine),
              )}
            />
          </span>
          <span className="mt-1 block text-body-regular text-text-secondary">{item.description}</span>
        </span>
      </a>
    </li>
  );
}
// #endregion

export function NotFoundPage({
  code = "404",
  path,
  title = "Page not found",
  description = "There is nothing at this address. It may have moved, or the link that brought you here may have been wrong.",
  homeAction = DEFAULT_HOME,
  browseAction = DEFAULT_BROWSE,
  destinations = [],
  footnote,
  onNavigate,
  className,
}: NotFoundPageProps) {
  const footnoteId = useId();
  const hasActions = Boolean(homeAction || browseAction);

  return (
    <section data-not-found="" className={cx("@container w-full", className)}>
      <div className="mx-auto w-full max-w-[672px] px-4 py-12 @xl:px-6 @3xl:py-20">
        <header>
          <p
            aria-hidden
            className={cx(
              "w-fit bg-linear-to-b from-text-primary to-text-tertiary bg-clip-text text-display-2-semibold tracking-tight text-transparent tabular-nums @xl:text-large-title-semibold",
              rise(0),
            )}
          >
            {code}
          </p>
          <p className={cx("mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption-1-medium text-text-tertiary", rise(1))}>
            <span>Error {code}</span>
            {path ? (
              <>
                <span aria-hidden>·</span>
                <code data-not-found-path="" className="min-w-0 break-all font-mono text-text-secondary">
                  {path}
                </code>
              </>
            ) : null}
          </p>
          <h1 className={cx("mt-2 text-display-4-semibold text-text-primary @xl:text-display-3-semibold", rise(1))}>{title}</h1>
          <p className={cx("mt-3 text-headline-regular text-text-secondary @xl:text-title-2-regular", rise(2))}>{description}</p>
          {hasActions ? (
            <div className={cx("mt-6 flex flex-wrap gap-2", rise(3))}>
              {homeAction ? (
                <ButtonLink
                  href={homeAction.href}
                  variant="primary"
                  leadingIcon={RiArrowLeftLine}
                  onClick={(event) => onNavigate?.(homeAction.href, event)}
                >
                  {homeAction.label}
                </ButtonLink>
              ) : null}
              {browseAction ? (
                <ButtonLink
                  href={browseAction.href}
                  variant="secondary"
                  leadingIcon={RiLayoutGridLine}
                  onClick={(event) => onNavigate?.(browseAction.href, event)}
                >
                  {browseAction.label}
                </ButtonLink>
              ) : null}
            </div>
          ) : null}
        </header>

        {destinations.length > 0 ? (
          <nav aria-label="Suggested pages" className="mt-10">
            <ul className="grid gap-3 @xl:grid-cols-2">
              {destinations.map((item, i) => (
                <DestinationCard key={item.href} item={item} step={4 + Math.floor(i / 2)} onNavigate={onNavigate} />
              ))}
            </ul>
          </nav>
        ) : null}

        {footnote ? (
          <section aria-labelledby={footnoteId} className={cx("mt-12 border-t border-separator-border pt-8", rise(6))}>
            <h2 id={footnoteId} className="text-headline-semibold text-text-primary">
              {footnote.title}
            </h2>
            {footnote.body ? (
              <div className="mt-2 text-body-regular text-text-secondary [&_a]:text-text-primary [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded-md [&_code]:bg-background-secondary-default [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-text-primary">
                {footnote.body}
              </div>
            ) : null}
            {footnote.links?.length ? (
              <ul className="mt-4 flex flex-col gap-2">
                {footnote.links.map((link) => (
                  <li key={link.href} className="text-body-regular text-text-tertiary">
                    <a
                      href={link.href}
                      onClick={(event) => onNavigate?.(link.href, event)}
                      className="rounded-sm font-mono text-text-primary underline decoration-border-button-default underline-offset-4 outline-none transition-colors duration-150 ease-out hover:decoration-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
                    >
                      {link.label}
                    </a>
                    {link.description ? <span> — {link.description}</span> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}
