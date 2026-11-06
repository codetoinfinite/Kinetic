/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Newsletter Card" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { RiCheckLine, RiMailLine } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { Input } from "@/registry/ui/input";
import { SpinnerGlyph } from "@/registry/ui/spinner";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Newsletter Card: an email sign-up with the whole round trip.
 *
 *   idle → (submit) → invalid        bad address: inline message, focus stays
 *        → (submit) → submitting     spinner, field read-only, repeat submits ignored
 *                   → success        confirmation with the address, "use a different address"
 *                   → error          the failure message on the field, try again
 *
 *   <NewsletterCard onSubscribe={(email) => api.subscribe(email)} />
 *
 * `onSubscribe` may return a promise; a rejection (or a throw) becomes the
 * error state with its message. The submitting state lasts at least
 * `submitDelay` ms either way, so a fast response does not flash a spinner,
 * and with no `onSubscribe` that delay is the whole simulated request. The
 * timer is cleared on reset and unmount, and a run counter drops results
 * from a submission that was reset or unmounted.
 */

export type NewsletterStatus = "idle" | "submitting" | "success" | "error";

export interface NewsletterCardProps {
  title?: ReactNode;
  description?: ReactNode;
  placeholder?: string;
  submitLabel?: ReactNode;
  /** Called with the trimmed address once it validates. Throw or reject to show the error state. */
  onSubscribe?: (email: string) => void | Promise<void>;
  /** Minimum time in the submitting state, in ms. Default 1200. */
  submitDelay?: number;
  /** Return a message to block submission, or null when the address is fine. */
  validate?: (email: string) => string | null;
  successTitle?: ReactNode;
  successMessage?: (email: string) => ReactNode;
  resetLabel?: ReactNode;
  /** Fired on every state change. */
  onStatusChange?: (status: NewsletterStatus) => void;
  /** Soft coloured streaks along the top edge. Default true. */
  decoration?: boolean;
  className?: string;
}

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function validateEmail(email: string): string | null {
  if (email === "") return "Enter your email address.";
  if (!EMAIL.test(email)) return "That doesn't look like an email address. Check for a typo.";
  return null;
}

function messageOf(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  return "Something went wrong. Try again in a moment.";
}

const STREAKS = [
  { left: "8%", width: "w-10", tone: "bg-chart-5/30", height: "h-24" },
  { left: "17%", width: "w-6", tone: "bg-chart-3/25", height: "h-20" },
  { left: "31%", width: "w-4", tone: "bg-accent-400/25", height: "h-16" },
  { left: "63%", width: "w-8", tone: "bg-chart-3/25", height: "h-24" },
  { left: "78%", width: "w-12", tone: "bg-accent-500/35", height: "h-28" },
  { left: "88%", width: "w-6", tone: "bg-chart-4/30", height: "h-20" },
] as const;

const styles = sortCx({
  card: "@container relative w-full overflow-hidden rounded-3xl border border-separator-border-strong bg-background-primary-default",
  streaks:
    "pointer-events-none absolute inset-x-0 top-0 h-32 mask-b-from-10% mask-b-to-100% motion-safe:transition-opacity motion-safe:duration-500",
  streak: "absolute -top-4 rounded-full blur-xl",
  body: "relative flex flex-col items-center gap-2 px-6 pt-12 pb-10 text-center @md:px-10",
  title: "text-title-2-medium text-balance text-text-primary",
  description: "max-w-[500px] text-body-regular text-pretty text-text-secondary",
  form: "mt-5 flex w-full max-w-[380px] flex-col items-stretch gap-2 @md:flex-row @md:items-start",
  success:
    "mt-5 flex flex-col items-center gap-3 outline-none motion-safe:animate-[kx-newsletter-in_320ms_cubic-bezier(0.2,0.8,0.2,1)]",
  badge: "flex size-10 items-center justify-center rounded-full bg-status-lime-background text-status-lime-text",
});

const ENTER_CSS = `@keyframes kx-newsletter-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`;

// #region critical
export function NewsletterCard({
  title = "Get new components in your inbox",
  description = "One short email when a component, block or template ships. No digests, no drip sequences, and you can leave any time.",
  placeholder = "you@company.com",
  submitLabel = "Subscribe",
  onSubscribe,
  submitDelay = 1200,
  validate = validateEmail,
  successTitle = "You're on the list",
  successMessage = (email) => (
    <>
      We'll write to <span className="font-medium text-text-primary">{email}</span> when something new ships.
    </>
  ),
  resetLabel = "Use a different address",
  onStatusChange,
  decoration = true,
  className,
}: NewsletterCardProps) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<NewsletterStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const runRef = useRef(0);
  const focusRef = useRef<"input" | "success" | null>(null);
  const statusChangeRef = useRef(onStatusChange);
  const titleId = useId();

  useEffect(() => {
    statusChangeRef.current = onStatusChange;
  });

  // Unmount: stop the timer and orphan any pending result.
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      runRef.current += 1;
    },
    [],
  );

  // Move focus once the next state has rendered, so keyboard users are never left on a removed node.
  useEffect(() => {
    const target = focusRef.current;
    focusRef.current = null;
    if (target === "input") inputRef.current?.focus();
    if (target === "success") successRef.current?.focus();
  }, [status, error]);

  const go = (next: NewsletterStatus) => {
    setStatus(next);
    statusChangeRef.current?.(next);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;
    const email = value.trim();
    const invalid = validate(email);
    if (invalid) {
      setError(invalid);
      if (status !== "idle") go("idle");
      focusRef.current = "input";
      return;
    }

    const run = ++runRef.current;
    setError(null);
    go("submitting");

    let outcome: Promise<unknown>;
    try {
      outcome = Promise.resolve(onSubscribe?.(email)).then(
        () => null,
        (reason: unknown) => ({ reason }),
      );
    } catch (reason) {
      outcome = Promise.resolve({ reason });
    }
    const delay = new Promise<void>((resolve) => {
      timerRef.current = window.setTimeout(resolve, Math.max(0, submitDelay));
    });

    void Promise.all([outcome, delay]).then(([failure]) => {
      if (runRef.current !== run) return;
      timerRef.current = undefined;
      if (failure) {
        setError(messageOf((failure as { reason: unknown }).reason));
        focusRef.current = "input";
        go("error");
      } else {
        setSubscribed(email);
        focusRef.current = "success";
        go("success");
      }
    });
  };

  const reset = () => {
    window.clearTimeout(timerRef.current);
    runRef.current += 1;
    setValue("");
    setError(null);
    setSubscribed("");
    focusRef.current = "input";
    go("idle");
  };

  const submitting = status === "submitting";
  const announcement =
    status === "submitting" ? "Subscribing…" : status === "success" ? `Subscribed as ${subscribed}.` : "";
  // #endregion

  return (
    <section aria-labelledby={titleId} className={cx(styles.card, className)}>
      <style href="kinetic-newsletter-card" precedence="medium">
        {ENTER_CSS}
      </style>
      {decoration ? (
        <div aria-hidden className={cx(styles.streaks, status === "success" && "opacity-60")}>
          {STREAKS.map((s) => (
            <span key={s.left} className={cx(styles.streak, s.width, s.height, s.tone)} style={{ left: s.left }} />
          ))}
        </div>
      ) : null}

      <div className={styles.body}>
        <h3 id={titleId} className={styles.title}>
          {title}
        </h3>
        {description ? <p className={styles.description}>{description}</p> : null}

        {status === "success" ? (
          <div ref={successRef} tabIndex={-1} data-newsletter-success="" className={styles.success}>
            <span className={styles.badge}>
              <RiCheckLine className="size-5" aria-hidden />
            </span>
            <p className="text-headline-medium text-text-primary">{successTitle}</p>
            <p className="max-w-[360px] text-body-regular text-text-secondary">{successMessage(subscribed)}</p>
            <Button variant="ghost" size="small" onClick={reset}>
              {resetLabel}
            </Button>
          </div>
        ) : (
          <form noValidate onSubmit={submit} aria-busy={submitting} className={styles.form}>
            <Input
              ref={inputRef}
              className="min-w-0 flex-1 text-start"
              type="email"
              name="email"
              autoComplete="email"
              aria-label="Email address"
              placeholder={placeholder}
              leadingIcon={RiMailLine}
              value={value}
              onChange={(next) => {
                setValue(next);
                if (error) setError(null);
                if (status === "error") go("idle");
              }}
              validationBehavior="aria"
              isInvalid={error !== null}
              errorMessage={error ?? undefined}
              // Read-only, not disabled: disabling the focused field would drop focus to <body>.
              isReadOnly={submitting}
            />
            <Button type="submit" variant="secondary" aria-disabled={submitting || undefined} className="shrink-0">
              {submitting ? <SpinnerGlyph size="sm" className="mr-1" /> : null}
              {submitting ? "Subscribing" : submitLabel}
            </Button>
          </form>
        )}

        <p role="status" className="sr-only">
          {announcement}
        </p>
      </div>
    </section>
  );
}
