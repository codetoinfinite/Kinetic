/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "FAQ Section" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useId } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { Key } from "react-aria-components";
import { Accordion, AccordionItem } from "@/registry/ui/accordion";
import type { AccordionVariant } from "@/registry/ui/accordion";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * FAQ Section — a landing-page question list: a heading block (eyebrow,
 * title, supporting copy, an optional aside such as a contact card) and the
 * kit Accordion in its `contained` tray with plus indicators.
 *
 *   <FaqSection
 *     title="Frequently asked questions"
 *     items={[{ id: "refunds", question: "Do you offer refunds?", answer: "…" }]}
 *   />
 *
 * Layout is container-driven, not viewport-driven, so the section behaves the
 * same inside a scaled preview, a sidebar layout or a full page:
 *   - below 64rem of container width everything stacks and centres;
 *   - from 64rem (`split`) the heading block moves to a sticky left column
 *     (5fr) and the questions take the right column (7fr).
 * `layout="stacked"` keeps the centred stack at every width.
 *
 * The list adds the optional WAI-ARIA accordion keys on top of React Aria's
 * Tab order: ArrowDown / ArrowUp move between question headers (wrapping),
 * Home / End jump to the first / last one.
 */

export interface FaqEntry {
  /** Stable key; also what `expandedKeys` holds. */
  id: string;
  question: ReactNode;
  answer: ReactNode;
  /** Greys the row out and skips it in arrow-key navigation. */
  isDisabled?: boolean;
}

export type FaqSectionLayout = "split" | "stacked";

export interface FaqSectionProps {
  items: FaqEntry[];
  title?: ReactNode;
  description?: ReactNode;
  /** Small label above the title, e.g. "Support". */
  eyebrow?: ReactNode;
  /** `split` (default) goes two-column at 64rem of container width; `stacked` never does. */
  layout?: FaqSectionLayout;
  /** Accordion look. Default `contained` (white cards on a tray). */
  variant?: AccordionVariant;
  /** Controlled expanded question ids. */
  expandedKeys?: Iterable<Key>;
  /** Uncontrolled initial expanded question ids. */
  defaultExpandedKeys?: Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  /** Let several answers stay open. Default false: opening one closes the other. */
  allowsMultipleExpanded?: boolean;
  /** Rendered under the heading block (left column when split). */
  aside?: ReactNode;
  /** Rendered under the question list. */
  footer?: ReactNode;
  /** Level of the section title; questions use the next level. Default 2. */
  headingLevel?: 2 | 3 | 4 | 5;
  id?: string;
  className?: string;
}

const styles = sortCx({
  grid: {
    split:
      "mx-auto grid w-full max-w-[1120px] grid-cols-1 gap-10 @5xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @5xl:gap-16",
    stacked: "mx-auto grid w-full max-w-[760px] grid-cols-1 gap-10",
  },
  head: {
    split:
      "flex flex-col items-center gap-4 text-center @5xl:sticky @5xl:top-10 @5xl:items-start @5xl:self-start @5xl:text-start",
    stacked: "flex flex-col items-center gap-4 text-center",
  },
  title:
    "text-balance text-display-4-medium tracking-[-0.02em] text-text-primary @xl:text-display-2-medium @xl:tracking-[-0.035em]",
  description: "max-w-[440px] text-pretty text-headline-regular text-text-secondary",
  eyebrow: "text-caption-1-medium uppercase tracking-[0.08em] text-text-tertiary",
});

const TITLE_TAGS = { 2: "h2", 3: "h3", 4: "h4", 5: "h5" } as const;

// #region critical
/** Question headers of this list only: answers may hold their own disclosure buttons. */
function questionButtons(list: HTMLElement) {
  return Array.from(list.querySelectorAll<HTMLButtonElement>("button[aria-expanded]")).filter(
    (button) => !button.disabled && button.closest("[data-faq-answer]") === null,
  );
}

function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const target = event.target as HTMLElement;
  if (target.closest("[data-faq-answer]")) return;
  const buttons = questionButtons(event.currentTarget);
  const index = buttons.indexOf(target as HTMLButtonElement);
  if (index === -1 || buttons.length === 0) return;

  let next: number;
  switch (event.key) {
    case "ArrowDown":
      next = (index + 1) % buttons.length;
      break;
    case "ArrowUp":
      next = (index - 1 + buttons.length) % buttons.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = buttons.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  buttons[next]?.focus();
}

export function FaqSection({
  items,
  title = "Frequently asked questions",
  description,
  eyebrow,
  layout = "split",
  variant = "contained",
  expandedKeys,
  defaultExpandedKeys,
  onExpandedChange,
  allowsMultipleExpanded = false,
  aside,
  footer,
  headingLevel = 2,
  id,
  className,
}: FaqSectionProps) {
  const autoId = useId();
  const titleId = `${id ?? autoId}-title`;
  const TitleTag = TITLE_TAGS[headingLevel];
  const questionLevel = (headingLevel + 1) as 3 | 4 | 5 | 6;

  return (
    <section id={id} aria-labelledby={titleId} className={cx("@container w-full", className)}>
      <div className={styles.grid[layout]}>
        <div className={styles.head[layout]}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <TitleTag id={titleId} className={styles.title}>
            {title}
          </TitleTag>
          {description ? <p className={styles.description}>{description}</p> : null}
          {aside ? <div className="mt-2 w-full max-w-[440px] text-start">{aside}</div> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div data-faq-list="" onKeyDown={moveFocus}>
            <Accordion
              variant={variant}
              indicator="plus"
              expandedKeys={expandedKeys}
              defaultExpandedKeys={defaultExpandedKeys}
              onExpandedChange={onExpandedChange}
              allowsMultipleExpanded={allowsMultipleExpanded}
            >
              {items.map((item) => (
                <AccordionItem
                  key={item.id}
                  id={item.id}
                  title={item.question}
                  headingLevel={questionLevel}
                  isDisabled={item.isDisabled}
                >
                  <div data-faq-answer="" className="max-w-[60ch] text-pretty">
                    {item.answer}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          {footer}
        </div>
      </div>
    </section>
  );
}
// #endregion
