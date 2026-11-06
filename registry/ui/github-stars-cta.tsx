/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "GitHub Stars CTA" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import {
  RiArrowRightLine,
  RiCheckLine,
  RiGitForkLine,
  RiGitRepositoryLine,
  RiScales3Line,
  RiSparkling2Line,
  RiStarFill,
  RiStarLine,
} from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { ButtonLink } from "@/registry/ui/button";

export interface GithubRepo {
  owner: string;
  name: string;
  href: string;
  description?: string;
  stars: number;
  forks?: number;
  license?: string;
  language?: string;
}

export interface GithubStarsCtaProps {
  repo: GithubRepo;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Short reasons shown as a checklist under the copy. */
  points?: ReactNode[];
  secondaryAction?: { label: string; href: string };
  className?: string;
}

const COUNT_MS = 1200;
const numberFormat = new Intl.NumberFormat("en-US");

// #region critical
/** Counts from 0 to `target` the first time `ref` is 40% visible. Reduced motion shows the target at once. */
function useCountUp(target: number, ref: RefObject<HTMLElement | null>) {
  const [value, setValue] = useState(target);

  // Layout effect: the reset to 0 lands before the first paint, so the final number never flashes first.
  useLayoutEffect(() => {
    const node = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!node || reduce || typeof IntersectionObserver === "undefined") {
      setValue(target);
      return;
    }
    setValue(0);
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
          setValue(Math.round(target * (1 - (1 - t) ** 3)));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, ref]);

  return value;
}

function StarCount({ stars }: { stars: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const value = useCountUp(stars, ref);
  return (
    <>
      <span ref={ref} aria-hidden className="tabular-nums">
        {numberFormat.format(value)}
      </span>
      <span className="sr-only">{numberFormat.format(stars)} stars</span>
    </>
  );
}
// #endregion

function RepoCard({ repo }: { repo: GithubRepo }) {
  const fullName = `${repo.owner}/${repo.name}`;
  return (
    <article
      aria-label={`${fullName} on GitHub`}
      className="relative w-full overflow-hidden rounded-3xl bg-background-primary-default shadow-card ring-1 ring-separator-border"
    >
      <div
        aria-hidden
        className="relative h-28 bg-linear-to-br from-accent-200 via-accent-100 to-background-primary-default dark:from-accent-800 dark:via-accent-950"
      >
        <div className="absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1.5px)] bg-size-[14px_14px] text-accent-500/35 mask-l-from-10% mask-l-to-90%" />
      </div>

      <div className="px-6 pb-6">
        <span className="relative -mt-7 grid size-14 place-items-center rounded-2xl bg-background-primary-default shadow-sm ring-1 ring-separator-border">
          <RiGitRepositoryLine aria-hidden className="size-6 text-foreground-icon-primary" />
        </span>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate font-mono text-body-medium text-text-primary">
            <span className="text-text-tertiary">{repo.owner} / </span>
            {repo.name}
          </h3>
          <span className="rounded-full px-2 py-0.5 text-caption-2-medium text-text-secondary ring-1 ring-separator-border">
            Public
          </span>
        </div>
        {repo.description && (
          <p className="mt-2 text-body-2-regular text-pretty text-text-secondary">{repo.description}</p>
        )}

        <div className="mt-6 flex items-end justify-between gap-4 rounded-2xl bg-background-secondary-default p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-caption-1-medium text-text-tertiary">
              <RiStarFill aria-hidden className="size-3.5 text-status-yellow-text" />
              Stars
            </p>
            <p data-stars className="mt-1 text-display-3-semibold text-text-primary">
              <StarCount stars={repo.stars} />
            </p>
          </div>
          <ButtonLink
            href={repo.href}
            size="small"
            leadingIcon={RiStarLine}
            aria-label={`Star ${fullName} on GitHub`}
          >
            Star
          </ButtonLink>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-caption-1-regular text-text-secondary">
          {repo.forks !== undefined && (
            <div className="flex items-center gap-1.5">
              <dt>
                <RiGitForkLine aria-hidden className="size-4 text-foreground-icon-tertiary" />
                <span className="sr-only">Forks</span>
              </dt>
              <dd className="tabular-nums">{numberFormat.format(repo.forks)} forks</dd>
            </div>
          )}
          {repo.license && (
            <div className="flex items-center gap-1.5">
              <dt>
                <RiScales3Line aria-hidden className="size-4 text-foreground-icon-tertiary" />
                <span className="sr-only">License</span>
              </dt>
              <dd>{repo.license} license</dd>
            </div>
          )}
          {repo.language && (
            <div className="flex items-center gap-1.5">
              <dt>
                <span aria-hidden className="block size-2.5 rounded-full bg-accent-500" />
                <span className="sr-only">Language</span>
              </dt>
              <dd>{repo.language}</dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}

export function GithubStarsCta({
  repo,
  eyebrow = "Open source",
  title = "The free tier lives on GitHub",
  description = "Every free component lives in one public, MIT-licensed repository. Read the source, fork it, file an issue, and leave a star if it saved you an afternoon.",
  points,
  secondaryAction,
  className,
}: GithubStarsCtaProps) {
  return (
    <section className={cx("@container w-full", className)}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] @4xl:gap-16 @4xl:px-12">
        <div className="max-w-xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background-primary-default px-3 py-1 text-caption-1-medium text-text-secondary shadow-xs ring-1 ring-separator-border">
              <RiSparkling2Line aria-hidden className="size-3.5 text-foreground-icon-secondary" />
              {eyebrow}
            </span>
          )}
          <h2 className="mt-5 text-display-3-semibold text-balance text-text-primary @4xl:text-display-2-semibold">
            {title}
          </h2>
          <p className="mt-4 text-body-regular text-pretty text-text-secondary">{description}</p>

          {points && points.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-body-2-regular text-text-primary">
                  <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-300">
                    <RiCheckLine aria-hidden className="size-3.5" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          )}

          {secondaryAction && (
            <div className="mt-8">
              <ButtonLink href={secondaryAction.href} variant="secondary" trailingIcon={RiArrowRightLine}>
                {secondaryAction.label}
              </ButtonLink>
            </div>
          )}
        </div>

        <RepoCard repo={repo} />
      </div>
    </section>
  );
}
