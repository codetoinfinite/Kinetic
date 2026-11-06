'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

export interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = 'Copy', className }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clearing on unmount matters here: copy, navigate away inside two seconds,
  // and the timeout would call setState on a component that no longer exists.
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    if (timer.current !== null) clearTimeout(timer.current);
    try {
      // Only available over https and localhost. Anywhere else this throws,
      // which is why the failure branch exists rather than a silent no-op.
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
    timer.current = setTimeout(() => setState('idle'), 2000);
  }

  return (
    <>
      <button
        type="button"
        data-copy-state={state}
        // The visible text — and so the accessible name — becomes "Copied" for
        // two seconds after a copy. This keeps one stable handle on the button
        // across that swap, for anything that has to find it again afterwards.
        data-copy={label}
        // Pinned, because the visible text is not a label but a status: without
        // this the button a screen reader is sitting on renames itself to
        // "Copied" and then back, which reads as the control having changed
        // rather than as the copy having happened. The status goes to the live
        // region below instead.
        aria-label={label}
        onClick={() => void copy()}
        className={cn(
          'meta inline-flex items-center gap-1.5 rounded-sm border border-line px-2 py-1.5 transition-colors duration-200',
          state === 'copied'
            ? 'border-accent text-accent'
            : state === 'failed'
              ? 'border-danger text-danger'
              : 'text-muted hover:border-line-strong hover:text-fg',
          className,
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          {state === 'copied' ? (
            <path d="m4 12.5 5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="9" y="9" width="12" height="12" rx="1.5" />
              <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-9A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16" />
            </>
          )}
        </svg>
        {/* Neither outcome is announced by the colour change, and the failure
            branch used to name a Mac keystroke to every visitor regardless of
            platform. "Select and copy" is the instruction on every one. */}
        <span aria-hidden="true">
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : label}
        </span>
      </button>

      {/* Outside the button, so it is a status rather than part of the name.
          Empty at rest: a live region that already holds text when it is
          inserted announces nothing, and one that keeps its text announces
          again on the next unrelated update. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied'
          ? `${label}: copied to clipboard`
          : state === 'failed'
            ? `${label} failed. Select the text and copy it manually.`
            : ''}
      </span>
    </>
  );
}
