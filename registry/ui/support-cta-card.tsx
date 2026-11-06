/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Support CTA Card" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import type { ComponentProps, ReactNode } from "react";
import { Avatar } from "@/registry/ui/avatar";
import type { AvatarProps } from "@/registry/ui/avatar";
import { Button, ButtonLink } from "@/registry/ui/button";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Support CTA Card: the "Still have a question?" strip that closes a FAQ.
 * Stacked initials avatars for the people who answer, a title and a line of
 * copy, and one contact action. A thin accent beam drifts along the top
 * border.
 *
 *   <SupportCtaCard
 *     people={[{ name: "Ada Park", initials: "AP", color: "blue" }]}
 *     actionLabel="Ask on Discord"
 *     actionIcon={RiDiscordFill}
 *     href="https://discord.gg/…"
 *   />
 *
 * Pass `href` to render the action as a link (new tab by default), or
 * `onAction` to render it as a button. The row stacks below 36rem of
 * container width.
 */

export interface SupportPerson {
  name: string;
  initials: string;
  color?: AvatarProps["color"];
}

type ActionIcon = ComponentProps<typeof Button>["leadingIcon"];

export interface SupportCtaCardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** People who answer. The first `maxAvatars` show; the rest collapse into "+N". */
  people?: SupportPerson[];
  /** Default 3. */
  maxAvatars?: number;
  actionLabel?: ReactNode;
  actionIcon?: ActionIcon;
  /** Renders the action as a link. */
  href?: string;
  /** Default "_blank" when `href` is set. */
  target?: string;
  /** Renders the action as a button when there is no `href`. */
  onAction?: () => void;
  /** Show the drifting beam on the top border. Default true. */
  beam?: boolean;
  /** Level of the title heading. Default 3. */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

const BEAM_CSS = `
@keyframes kx-support-beam {
  from { transform: translateX(-100%); }
  to { transform: translateX(400%); }
}
.kx-support-beam {
  animation: kx-support-beam 7s cubic-bezier(0.45, 0, 0.55, 1) infinite alternate;
}
@media (prefers-reduced-motion: reduce) {
  .kx-support-beam { animation: none; transform: translateX(150%); }
}
`;

const styles = sortCx({
  card: "@container relative w-full rounded-3xl border border-separator-border-strong bg-background-primary-default shadow-2xs",
  row: "relative flex flex-col items-start gap-4 px-6 py-5 @xl:flex-row @xl:items-center @xl:gap-5",
  avatars: "flex shrink-0 items-center -space-x-1.5",
  avatar: "text-caption-1-semibold ring-2 ring-background-primary-default",
  // The kit's dark neutral avatar equals the card surface; quaternary stays visible on it.
  neutral: "bg-background-quaternary-default",
  copy: "flex min-w-0 flex-1 flex-col gap-0.5",
  title: "text-headline-medium text-text-primary",
  description: "text-body-regular text-text-secondary",
  beamLayer: "pointer-events-none absolute -inset-px overflow-hidden rounded-[inherit]",
  beamTrack: "kx-support-beam absolute top-0 left-0 h-6 w-1/4",
  beamLine: "absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent-500 to-transparent",
  beamGlow:
    "absolute inset-x-3 top-0 h-4 bg-linear-to-r from-transparent via-accent-400/25 to-transparent blur-md",
});

const HEADINGS = { 2: "h2", 3: "h3", 4: "h4" } as const;

function listNames(names: string[], extra: number) {
  if (names.length === 0) return "";
  const tail = extra > 0 ? `${names.join(", ")} and ${extra} more` : names.join(", ").replace(/, ([^,]*)$/, " and $1");
  return `Answered by ${tail}`;
}

// #region critical
export function SupportCtaCard({
  title = "Still have a question?",
  description = "We answer in the open, usually the same day.",
  people = [],
  maxAvatars = 3,
  actionLabel = "Get in touch",
  actionIcon,
  href,
  target,
  onAction,
  beam = true,
  headingLevel = 3,
  className,
}: SupportCtaCardProps) {
  const shown = people.slice(0, Math.max(0, maxAvatars));
  const extra = people.length - shown.length;
  const Heading = HEADINGS[headingLevel];
  const linkTarget = target ?? "_blank";

  return (
    <div className={cx(styles.card, className)}>
      {beam ? (
        <>
          <style href="kinetic-support-cta-card" precedence="medium">
            {BEAM_CSS}
          </style>
          <div aria-hidden className={styles.beamLayer}>
            <div className={styles.beamTrack}>
              <span className={styles.beamGlow} />
              <span className={styles.beamLine} />
            </div>
          </div>
        </>
      ) : null}

      <div className={styles.row}>
        {shown.length > 0 ? (
          <div role="img" aria-label={listNames(shown.map((p) => p.name), extra)} className={styles.avatars}>
            {shown.map((person) => (
              <Avatar
                key={person.name}
                size="md"
                color={person.color ?? "neutral"}
                initials={person.initials}
                aria-hidden
                className={cx(styles.avatar, (person.color ?? "neutral") === "neutral" && styles.neutral)}
              />
            ))}
            {extra > 0 ? <Avatar size="md" initials={`+${extra}`} aria-hidden className={cx(styles.avatar, styles.neutral)} /> : null}
          </div>
        ) : null}

        <div className={styles.copy}>
          <Heading className={styles.title}>{title}</Heading>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>

        {href ? (
          <ButtonLink
            href={href}
            target={linkTarget}
            rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
            variant="secondary"
            leadingIcon={actionIcon}
            className="shrink-0"
          >
            {actionLabel}
          </ButtonLink>
        ) : (
          <Button variant="secondary" leadingIcon={actionIcon} onClick={onAction} className="shrink-0">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
// #endregion
