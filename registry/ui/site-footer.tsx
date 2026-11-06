/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Site Footer" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import type { ComponentType, MouseEvent, ReactNode } from "react";
import { RiArrowRightLine } from "@remixicon/react";
import { ButtonLink } from "@/registry/ui/button";
import { IconLinkButton } from "@/registry/ui/icon-button";
import { ThemeToggle } from "@/registry/ui/theme-toggle";
import { LanguageSelect } from "@/registry/ui/language-select";
import type { LanguageSelectProps } from "@/registry/ui/language-select";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Site Footer: the marketing-site footer. Brand mark and tagline on the
 * left, social buttons and one call to action on the right, up to six link
 * columns, then a bottom bar with the language select, the theme toggle, an
 * optional centre slot and the copyright and legal links.
 *
 *   <SiteFooter
 *     logo={<Logo />}
 *     tagline="A dashboard kit for React."
 *     columns={[{ title: "Components", links: [...], viewAll: { href: "/components", count: 96 } }]}
 *     socials={[{ label: "GitHub", href: "…", icon: RiGithubFill, count: "963" }]}
 *     copyright="© 2026 Acme"
 *   />
 *
 * Every link goes through `onLinkClick`, so a router can take over
 * navigation (call `event.preventDefault()` there).
 */

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export interface FooterLink {
  label: ReactNode;
  href: string;
  /** Small pill after the label, e.g. "Earn 40%" or "New". */
  badge?: ReactNode;
  /** Opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
}

export interface FooterColumn {
  title: string;
  links: readonly FooterLink[];
  /** Trailing "View all (N) →" link. */
  viewAll?: { href: string; count?: number; label?: string };
}

export interface FooterSocial {
  /** Accessible name, e.g. "GitHub". */
  label: string;
  href: string;
  icon: IconComponent;
  /** Visible counter next to the icon (e.g. stars). Turns the square button into a labelled one. */
  count?: ReactNode;
}

export interface SiteFooterProps {
  /** Brand mark shown above the tagline. */
  logo?: ReactNode;
  /** Name of the brand link around the logo. */
  brandLabel?: string;
  brandHref?: string;
  tagline?: ReactNode;
  socials?: readonly FooterSocial[];
  /** Extra action after the socials, e.g. a "Get Pro" ButtonLink. */
  cta?: ReactNode;
  columns: readonly FooterColumn[];
  /** Props for the bottom-bar LanguageSelect, or false to hide it. */
  language?: false | LanguageSelectProps;
  /** Show the kit ThemeToggle (segmented) in the bottom bar. */
  themeToggle?: boolean;
  /** Centre slot of the bottom bar, e.g. AccentSwatches. */
  bottomCenter?: ReactNode;
  copyright?: ReactNode;
  legal?: readonly FooterLink[];
  /** Called for every footer link click. Call preventDefault to route client-side. */
  onLinkClick?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}

const styles = sortCx({
  root: "@container w-full border-t border-separator-border bg-background-primary-default",
  inner: "mx-auto w-full max-w-[1152px] px-4 @md:px-6 @min-[1200px]:px-0",
  top: "flex flex-col gap-6 pt-12 @3xl:flex-row @3xl:items-start @3xl:justify-between @3xl:pt-14",
  tagline: "mt-4 max-w-[430px] text-body-regular text-text-tertiary",
  actions: "flex flex-wrap items-center gap-2",
  grid: "grid grid-cols-2 gap-x-6 gap-y-10 py-12 @xl:grid-cols-3 @5xl:grid-cols-6 @5xl:py-14",
  heading: "text-caption-1-semibold uppercase tracking-[0.06em] text-text-tertiary",
  list: "mt-4 flex flex-col gap-3",
  link: [
    "inline-flex items-center gap-1.5 rounded-sm text-body-regular text-text-secondary outline-none",
    "transition-colors duration-150 ease-out hover:text-text-primary motion-reduce:transition-none",
    "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary-default",
  ].join(" "),
  viewAll: "group/view text-body-medium text-text-primary",
  badge: "rounded-full bg-status-blue-background px-1.5 py-px text-caption-2-semibold text-status-blue-text",
  bottom: [
    "grid grid-cols-1 items-center gap-4 border-t border-separator-border py-6",
    "@3xl:grid-cols-[1fr_auto_1fr]",
  ].join(" "),
  bottomStart: "flex flex-wrap items-center gap-3",
  bottomCenter: "flex @3xl:justify-center",
  legal: "flex flex-wrap items-center gap-x-2 gap-y-1 text-caption-1-regular text-text-tertiary @3xl:justify-end",
  legalLink: "rounded-sm outline-none transition-colors duration-150 ease-out hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
});

/** "GitHub, 963" when the count is plain text, otherwise just the label. */
function countLabel({ label, count }: FooterSocial) {
  return typeof count === "string" || typeof count === "number" ? `${label}, ${count}` : label;
}

function externalProps(external?: boolean) {
  return external ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

// #region critical
export function SiteFooter({
  logo,
  brandLabel = "Home",
  brandHref = "/",
  tagline,
  socials = [],
  cta,
  columns,
  language = {},
  themeToggle = true,
  bottomCenter,
  copyright,
  legal = [],
  onLinkClick,
  className,
}: SiteFooterProps) {
  const click = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => onLinkClick?.(href, event);

  return (
    <footer className={cx(styles.root, className)}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className="min-w-0">
            {logo ? (
              <a
                href={brandHref}
                aria-label={brandLabel}
                onClick={click(brandHref)}
                className={cx(styles.link, "inline-flex")}
              >
                {logo}
              </a>
            ) : null}
            {tagline ? <p className={styles.tagline}>{tagline}</p> : null}
          </div>

          {socials.length > 0 || cta ? (
            <div className={styles.actions}>
              {socials.map((social) =>
                social.count !== undefined ? (
                  <ButtonLink
                    key={social.label}
                    href={social.href}
                    variant="secondary"
                    leadingIcon={social.icon}
                    aria-label={countLabel(social)}
                    onClick={click(social.href)}
                    {...externalProps(true)}
                  >
                    {social.count}
                  </ButtonLink>
                ) : (
                  <IconLinkButton
                    key={social.label}
                    href={social.href}
                    icon={social.icon}
                    aria-label={social.label}
                    onClick={click(social.href)}
                    {...externalProps(true)}
                  />
                ),
              )}
              {cta}
            </div>
          ) : null}
        </div>

        <nav aria-label="Footer" className={styles.grid}>
          {columns.map((column) => (
            <div key={column.title} className="min-w-0">
              <h2 className={styles.heading}>{column.title}</h2>
              <ul className={styles.list}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={click(link.href)}
                      className={styles.link}
                      {...externalProps(link.external)}
                    >
                      {link.label}
                      {link.badge ? <span className={styles.badge}>{link.badge}</span> : null}
                    </a>
                  </li>
                ))}
                {column.viewAll ? (
                  <li>
                    <a
                      href={column.viewAll.href}
                      onClick={click(column.viewAll.href)}
                      className={cx(styles.link, styles.viewAll)}
                    >
                      {column.viewAll.label ?? "View all"}
                      {column.viewAll.count !== undefined ? (
                        <span className="text-body-regular text-text-tertiary">({column.viewAll.count})</span>
                      ) : null}
                      <RiArrowRightLine
                        aria-hidden
                        className="size-4 transition-transform duration-150 ease-out group-hover/view:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover/view:translate-x-0 rtl:-scale-x-100"
                      />
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.bottom}>
          <div className={styles.bottomStart}>
            {language !== false ? <LanguageSelect {...language} /> : null}
            {themeToggle ? <ThemeToggle appearance="segmented" size="small" /> : null}
          </div>
          <div className={styles.bottomCenter}>{bottomCenter}</div>
          {copyright || legal.length > 0 ? (
            <p className={styles.legal}>
              {copyright ? <span>{copyright}</span> : null}
              {legal.map((link, i) => (
                <span key={link.href} className="inline-flex items-center gap-2">
                  {copyright || i > 0 ? <span aria-hidden>·</span> : null}
                  <a
                    href={link.href}
                    onClick={click(link.href)}
                    className={styles.legalLink}
                    {...externalProps(link.external)}
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
// #endregion
