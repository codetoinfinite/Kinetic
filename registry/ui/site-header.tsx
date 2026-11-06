/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Site Header" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { RiArrowDownSLine, RiGithubFill, RiMenuLine, RiSearchLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { MENU_ITEM, MENU_ITEM_ACTIVE, MENU_ITEM_INTERACTIVE } from "@/registry/lib/menu-styles";
import { Drawer, DrawerBody, DrawerHeader, DrawerTrigger } from "@/registry/ui/drawer";
import { Dropdown, DropdownPopover, DropdownTrigger } from "@/registry/ui/dropdown";
import { IconButton } from "@/registry/ui/icon-button";
import { Kbd } from "@/registry/ui/kbd";
import { ThemeToggle } from "@/registry/ui/theme-toggle";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export interface SiteHeaderMenuItem {
  label: string;
  href: string;
  /** One muted line under the label. */
  description?: string;
  icon?: IconComponent;
}

export interface SiteHeaderLink {
  label: string;
  /** Plain link target. Ignored when `items` is given. */
  href?: string;
  /** Turns the link into a menu button that opens these rows. */
  items?: SiteHeaderMenuItem[];
}

export interface SiteHeaderSocial {
  label: string;
  href: string;
  icon: IconComponent;
}

export interface SiteHeaderProps {
  /** Brand lockup on the start edge. Defaults to the board mark plus "BoardUI". */
  brand?: ReactNode;
  brandHref?: string;
  links?: SiteHeaderLink[];
  /** Marks the matching link (or menu row) with `aria-current="page"`. */
  currentHref?: string;
  /** Called for every link and menu row; call `event.preventDefault()` for client routing. */
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  /** Search trigger press. The trigger is hidden when this is omitted. */
  onSearch?: () => void;
  searchLabel?: string;
  /** Shortcut shown in the trigger. Display only: bind the key where the search lives. */
  searchShortcut?: string;
  socials?: SiteHeaderSocial[];
  githubHref?: string;
  /** Star count on the GitHub pill; the pill is hidden without `githubHref`. */
  githubStars?: number;
  /** Extra controls before the theme toggle, e.g. a "Get Pro" button. */
  actions?: ReactNode;
  showThemeToggle?: boolean;
  /** Pins the bar to the top of its scroll container. */
  sticky?: boolean;
  menuLabel?: string;
  className?: string;
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** The default lockup: a four-tile board in the accent colour. */
export function SiteHeaderLogo({ name = "BoardUI" }: { name?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="grid size-8 place-items-center rounded-2lg bg-accent-500 shadow-xs">
        <svg viewBox="0 0 20 20" className="size-5 text-text-white" fill="currentColor">
          <rect x="2" y="2" width="7" height="7" rx="2" opacity="0.55" />
          <rect x="11" y="2" width="7" height="7" rx="2" />
          <rect x="2" y="11" width="7" height="7" rx="2" />
          <rect x="11" y="11" width="7" height="7" rx="2" opacity="0.55" />
        </svg>
      </span>
      <span className="text-body-semibold text-text-primary">{name}</span>
    </span>
  );
}

const linkClass = cx(
  "inline-flex h-9 items-center gap-0.5 rounded-full px-3 text-body-medium whitespace-nowrap",
  "text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary",
  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
  "aria-[current=page]:text-text-primary",
);

function MenuRow({
  item,
  current,
  onClick,
}: {
  item: SiteHeaderMenuItem;
  current: boolean;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
      className={cx(MENU_ITEM, current ? MENU_ITEM_ACTIVE : MENU_ITEM_INTERACTIVE, "items-start gap-3")}
    >
      {Icon ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border-button-default bg-background-primary-default shadow-xs">
          <Icon className="size-4 text-foreground-icon-secondary" aria-hidden />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-col">
        <span className="text-body-medium text-text-primary">{item.label}</span>
        {item.description ? <span className="text-body-2-regular text-text-tertiary">{item.description}</span> : null}
      </span>
    </a>
  );
}

// #region critical
/** A link counts as current when it, or any row of its menu, matches the page. */
function isCurrentLink(link: SiteHeaderLink, currentHref: string | undefined) {
  if (currentHref === undefined) return false;
  return link.href === currentHref || (link.items ?? []).some((item) => item.href === currentHref);
}

/**
 * A nav link with rows: a real menu button (Enter, Space, Escape, outside
 * press all handled by the kit Dropdown) whose panel holds plain anchors, so
 * middle-click and "open in new tab" still work on every destination. The
 * chevron flips with the open state; picking a row closes the panel.
 */
function NavMenu({
  link,
  items,
  currentHref,
  isOpen,
  onOpenChange,
  onNavigate,
}: {
  link: SiteHeaderLink;
  items: SiteHeaderMenuItem[];
  currentHref: string | undefined;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: SiteHeaderProps["onNavigate"];
}) {
  return (
    <Dropdown isOpen={isOpen} onOpenChange={onOpenChange}>
      <DropdownTrigger className={cx(linkClass, "cursor-pointer", isCurrentLink(link, currentHref) && "text-text-primary")}>
        {link.label}
        <RiArrowDownSLine
          aria-hidden
          className={cx(
            "size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
            isOpen && "rotate-180",
          )}
        />
      </DropdownTrigger>
      <DropdownPopover aria-label={link.label} className="w-[320px]">
        {items.map((item) => (
          <MenuRow
            key={item.href}
            item={item}
            current={item.href === currentHref}
            onClick={(event) => {
              onNavigate?.(item.href, event);
              onOpenChange(false);
            }}
          />
        ))}
      </DropdownPopover>
    </Dropdown>
  );
}
// #endregion

export function SiteHeader({
  brand,
  brandHref = "/",
  links = [],
  currentHref,
  onNavigate,
  onSearch,
  searchLabel = "Quick Search",
  searchShortcut = "⌘K",
  socials = [],
  githubHref,
  githubStars,
  actions,
  showThemeToggle = true,
  sticky = false,
  menuLabel = "Open menu",
  className,
}: SiteHeaderProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navigate = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => onNavigate?.(href, event);
  const isCurrent = (link: SiteHeaderLink) => isCurrentLink(link, currentHref);

  const github = githubHref ? (
    <a
      href={githubHref}
      target="_blank"
      rel="noreferrer"
      aria-label={githubStars === undefined ? "GitHub" : `Star on GitHub, ${githubStars} stars`}
      className={cx(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-background-secondary-default px-3",
        "text-body-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-background-secondary-hover",
        "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
      )}
    >
      <RiGithubFill className="size-5 shrink-0" aria-hidden />
      {githubStars === undefined ? null : <span className="tabular-nums">{compact.format(githubStars)}</span>}
    </a>
  ) : null;

  return (
    <header
      className={cx(
        "@container/site-header z-30 w-full bg-background-full/80 backdrop-blur-md",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center gap-2 px-4 @3xl/site-header:px-8">
        <a
          href={brandHref}
          onClick={navigate(brandHref)}
          className="me-3 shrink-0 rounded-2lg outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          {brand ?? <SiteHeaderLogo />}
        </a>

        <nav aria-label="Main" className="hidden items-center @4xl/site-header:flex">
          {links.map((link) =>
            link.items?.length ? (
              <NavMenu
                key={link.label}
                link={link}
                items={link.items}
                currentHref={currentHref}
                isOpen={openMenu === link.label}
                onOpenChange={(open) => setOpenMenu(open ? link.label : null)}
                onNavigate={onNavigate}
              />
            ) : (
              <a
                key={link.label}
                href={link.href ?? "#"}
                aria-current={isCurrentLink(link, currentHref) ? "page" : undefined}
                onClick={navigate(link.href ?? "#")}
                className={linkClass}
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          {onSearch ? (
            <button
              type="button"
              onClick={onSearch}
              aria-label={searchLabel}
              aria-keyshortcuts={searchShortcut === "⌘K" ? "Meta+K" : undefined}
              className={cx(
                "group/search flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-background-secondary-default",
                "size-10 justify-center @4xl/site-header:w-[220px] @4xl/site-header:justify-start @4xl/site-header:ps-3 @4xl/site-header:pe-2",
                "transition-colors duration-150 ease-out hover:bg-background-secondary-hover",
                "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              )}
            >
              <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
              <span className="hidden flex-1 text-start text-body-regular text-text-tertiary @4xl/site-header:inline">
                {searchLabel}
              </span>
              <Kbd className="hidden px-1.5 @4xl/site-header:inline-flex">{searchShortcut}</Kbd>
            </button>
          ) : null}

          <div className="hidden items-center gap-1.5 @4xl/site-header:flex">
            {socials.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className={cx(
                  "grid size-10 place-items-center rounded-full text-foreground-icon-primary",
                  "transition-colors duration-150 ease-out hover:bg-background-secondary-default",
                  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </a>
            ))}
            {github}
            {actions}
            {showThemeToggle ? <ThemeToggle appearance="segmented" /> : null}
          </div>

          <DrawerTrigger>
            <IconButton icon={RiMenuLine} aria-label={menuLabel} className="rounded-full @4xl/site-header:hidden" />
            <Drawer placement="end" size="sm">
              {({ close }) => (
                <>
                  <DrawerHeader title="Menu" />
                  <DrawerBody className="flex flex-col gap-5 pt-4 pb-6">
                    <nav aria-label="Main" className="flex flex-col gap-1">
                      {links.map((link) =>
                        link.items?.length ? (
                          <div key={link.label} role="group" aria-label={link.label} className="flex flex-col gap-1 py-1">
                            <span className="px-2 pb-0.5 text-body-2-medium text-text-tertiary">{link.label}</span>
                            {link.items.map((item) => (
                              <MenuRow
                                key={item.href}
                                item={item}
                                current={item.href === currentHref}
                                onClick={(event) => {
                                  onNavigate?.(item.href, event);
                                  close();
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <a
                            key={link.label}
                            href={link.href ?? "#"}
                            aria-current={isCurrent(link) ? "page" : undefined}
                            onClick={(event) => {
                              onNavigate?.(link.href ?? "#", event);
                              close();
                            }}
                            className={cx(MENU_ITEM, isCurrent(link) ? MENU_ITEM_ACTIVE : MENU_ITEM_INTERACTIVE, "text-body-medium")}
                          >
                            {link.label}
                          </a>
                        ),
                      )}
                    </nav>
                    {github || actions ? (
                      <div className="flex flex-wrap items-center gap-2 border-t border-separator-border pt-5">
                        {github}
                        {actions}
                      </div>
                    ) : null}
                    {showThemeToggle ? (
                      <div className="flex items-center justify-between">
                        <span className="text-body-medium text-text-secondary">Theme</span>
                        <ThemeToggle appearance="segmented" />
                      </div>
                    ) : null}
                  </DrawerBody>
                </>
              )}
            </Drawer>
          </DrawerTrigger>
        </div>
      </div>
    </header>
  );
}
