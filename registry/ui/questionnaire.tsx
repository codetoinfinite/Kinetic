/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Questionnaire" (boardui.com/components/questionnaire).
 * No BoardUI source was used.
 */
'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Variants } from 'motion/react';
import { cx } from '@/registry/lib/cx';
import { useDirection } from '@/registry/lib/direction';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { Button } from '@/registry/ui/button';
import { CloseButton } from '@/registry/ui/close-button';
import { CheckboxGlyph } from '@/registry/ui/checkbox-glyph';

export type QuestionnaireSelect = 'single' | 'multiple';

export interface QuestionnaireOption {
  value: string;
  label: string;
  description?: string;
}

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  options: readonly QuestionnaireOption[];
  /** Adds the free-text row; an object relabels it. */
  other?: boolean | { label?: string; placeholder?: string };
  /** Overrides the card-level select for this question. */
  select?: QuestionnaireSelect;
  /** Pill label; "Step N" otherwise. */
  stepLabel?: string;
}

export interface QuestionnaireAnswer {
  /** Picked option values, in option order. */
  values: string[];
  /** Free text, present only while the Other row is selected. */
  other?: string;
}

export type QuestionnaireAnswers = Record<string, QuestionnaireAnswer>;

export interface QuestionnaireLabels {
  previous?: string;
  next?: string;
  complete?: string;
  other?: string;
  otherPlaceholder?: string;
  dismiss?: string;
  steps?: string;
}

export interface QuestionnaireProps {
  questions: readonly QuestionnaireQuestion[];
  select?: QuestionnaireSelect;
  /** Milliseconds a single-select pick stays visible before moving on. */
  advanceDelay?: number;
  answers?: QuestionnaireAnswers;
  defaultAnswers?: QuestionnaireAnswers;
  onAnswersChange?: (answers: QuestionnaireAnswers) => void;
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: (answers: QuestionnaireAnswers) => void;
  /** Shows the corner dismiss when set. */
  onDismiss?: () => void;
  labels?: QuestionnaireLabels;
  'aria-label'?: string;
  className?: string;
}

const EMPTY: QuestionnaireAnswer = { values: [] };
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function useControlled<T>(value: T | undefined, initial: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(initial);
  const current = value === undefined ? inner : value;
  const set = useCallback(
    (next: T) => {
      if (value === undefined) setInner(next);
      onChange?.(next);
    },
    [value, onChange],
  );
  return [current, set] as const;
}

function otherConfig(q: QuestionnaireQuestion, labels: QuestionnaireLabels) {
  if (!q.other) return null;
  const custom = typeof q.other === 'object' ? q.other : {};
  return {
    label: custom.label ?? labels.other ?? 'Other',
    placeholder: custom.placeholder ?? labels.otherPlaceholder ?? 'Enter your custom answer here',
  };
}

const ROW = cx(
  'group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start outline-none',
  'transition-colors duration-150 ease-out motion-reduce:transition-none',
  'hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring',
);

function RowText({ id, label, description }: { id: string; label: string; description?: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span id={`${id}-l`} className="text-body-medium text-text-primary">
        {label}
      </span>
      {description ? (
        <span id={`${id}-d`} className="text-body-regular text-text-secondary">
          {description}
        </span>
      ) : null}
    </span>
  );
}

function NumberKey({ n, on }: { n: number; on: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        'flex size-5 shrink-0 items-center justify-center rounded-md text-caption-1-medium tabular-nums',
        'transition-colors duration-150 ease-out motion-reduce:transition-none',
        on
          ? 'bg-accent-500 text-text-white'
          : 'bg-questionnaire-key-background text-text-primary group-hover:bg-questionnaire-key-hover-background',
      )}
    >
      {n}
    </span>
  );
}

function tick(on: boolean) {
  return <CheckboxGlyph state={{ isSelected: on, isIndeterminate: false, isFocusVisible: false, isDisabled: false, isHovered: false }} />;
}

// #region critical
export function Questionnaire({
  questions,
  select = 'multiple',
  advanceDelay = 180,
  answers: answersProp,
  defaultAnswers,
  onAnswersChange,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  onComplete,
  onDismiss,
  labels = {},
  'aria-label': ariaLabel = 'Questions',
  className,
}: QuestionnaireProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const rtl = useDirection() === 'rtl';
  const [answers, setAnswers] = useControlled<QuestionnaireAnswers>(answersProp, defaultAnswers ?? {}, onAnswersChange);
  const [rawStep, setStep] = useControlled<number>(stepProp, defaultStep, onStepChange);
  const last = Math.max(questions.length - 1, 0);
  const step = Math.min(Math.max(rawStep, 0), last);
  const q = questions[step];

  // Direction of travel: +1 forward, -1 back. Read by both the entering and the exiting panel.
  const [dir, setDir] = useState(1);
  // Free text survives unticking Other, so ticking it again restores what was typed.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { height } = useResizeObserver(bodyRef);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusAfter = useRef(false);

  const clearTimer = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const goTo = (next: number, refocus = false) => {
    clearTimer();
    const target = Math.min(Math.max(next, 0), last);
    if (target === step) return;
    setDir(target > step ? 1 : -1);
    focusAfter.current = refocus;
    setStep(target);
  };

  // A pick that moves the card on unmounts the focused row; land focus on the next question's first row.
  useEffect(() => {
    if (!focusAfter.current) return;
    focusAfter.current = false;
    rootRef.current?.querySelector<HTMLElement>(`[data-step="${step}"] [data-q-row]`)?.focus({ preventScroll: true });
  }, [step]);

  if (!q) return null;
  const mode = q.select ?? select;
  const other = otherConfig(q, labels);
  const answer = answers[q.id] ?? EMPTY;
  const otherOn = answer.other !== undefined;
  const isLast = step === last;

  const write = (next: QuestionnaireAnswer) => setAnswers({ ...answers, [q.id]: next });

  const toggle = (value: string) => {
    const on = answer.values.includes(value);
    const values = q.options.map((o) => o.value).filter((v) => (v === value ? !on : answer.values.includes(v)));
    write({ ...answer, values });
  };

  const pick = (value: string) => {
    write({ values: [value] });
    clearTimer();
    if (isLast) return;
    const from = step;
    timer.current = setTimeout(() => goTo(from + 1, true), advanceDelay);
  };

  const setOtherText = (text: string) => {
    setDrafts((d) => ({ ...d, [q.id]: text }));
    const filled = text.trim().length > 0;
    if (mode === 'single') write(filled ? { values: [], other: text } : { values: [] });
    else write(filled ? { ...answer, other: text } : { values: answer.values });
  };

  const toggleOther = () => {
    if (otherOn) write({ values: answer.values });
    else write({ ...answer, other: drafts[q.id] ?? '' });
  };

  const advance = () => {
    if (isLast) {
      clearTimer();
      onComplete?.(answers);
    } else goTo(step + 1);
  };

  const otherInputId = `${uid}-other`;
  const rowCount = q.options.length + (other ? 1 : 0);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const rows = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(`[data-step="${step}"] [data-q-row]`) ?? [],
      );
      const at = rows.indexOf(target);
      if (at < 0) return;
      event.preventDefault();
      rows[(at + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length]?.focus();
      return;
    }
    if (!/^[1-9]$/.test(event.key)) return;
    const index = Number(event.key) - 1;
    if (index >= rowCount) return;
    event.preventDefault();
    const option = q.options[index];
    if (option) {
      if (mode === 'single') pick(option.value);
      else toggle(option.value);
    } else {
      document.getElementById(otherInputId)?.focus();
    }
  };

  const shift = reduce ? 0 : rtl ? -28 : 28;
  const variants: Variants = {
    enter: (d: number) => ({ x: d * shift, opacity: 0, filter: reduce ? 'none' : 'blur(2px)' }),
    center: { x: 0, opacity: 1, filter: reduce ? 'none' : 'blur(0px)' },
    exit: (d: number) => ({ x: -d * shift, opacity: 0, filter: reduce ? 'none' : 'blur(2px)' }),
  };
  const slide = reduce ? { duration: 0.12 } : { duration: 0.32, ease: EASE_OUT };

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx(
        'relative w-full rounded-2xl bg-background-primary-default p-3 shadow-sm ring-1 ring-border-button-default',
        className,
      )}
    >
      {onDismiss ? (
        <CloseButton aria-label={labels.dismiss ?? 'Dismiss questions'} onClick={onDismiss} className="absolute end-3 top-3 z-10" />
      ) : null}

      <motion.div
        initial={false}
        animate={{ height: height > 0 ? height : 'auto' }}
        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }}
        className="overflow-hidden"
      >
        <div ref={bodyRef} className="relative">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.div
              key={step}
              data-step={step}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slide}
              className="flex w-full flex-col gap-2"
            >
              <p id={`${uid}-q${step}`} className={cx('px-0.5 pb-0.5 text-body-medium text-text-primary', onDismiss && 'pe-8')}>
                {q.question}
              </p>
              <div
                role={mode === 'single' ? 'radiogroup' : 'group'}
                aria-labelledby={`${uid}-q${step}`}
                className="flex flex-col gap-2"
              >
                {q.options.map((option, i) => {
                  const on = answer.values.includes(option.value);
                  const id = `${uid}-${step}-${i}`;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      data-q-row
                      role={mode === 'single' ? 'radio' : 'checkbox'}
                      aria-checked={on}
                      aria-labelledby={`${id}-l`}
                      aria-describedby={option.description ? `${id}-d` : undefined}
                      aria-keyshortcuts={String(i + 1)}
                      onClick={() => (mode === 'single' ? pick(option.value) : toggle(option.value))}
                      className={cx(
                        ROW,
                        on ? 'border-border-button-hover bg-background-primary-hover' : 'border-border-button-default',
                      )}
                    >
                      <RowText id={id} label={option.label} description={option.description} />
                      {mode === 'single' ? <NumberKey n={i + 1} on={on} /> : tick(on)}
                    </button>
                  );
                })}

                {other ? (
                  <div
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest('input,button')) return;
                      document.getElementById(otherInputId)?.focus();
                    }}
                    className={cx(
                      ROW,
                      'cursor-text focus-within:ring-2 focus-within:ring-inset focus-within:ring-border-focus-ring',
                      otherOn ? 'border-border-button-hover bg-background-primary-hover' : 'border-border-button-default',
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <label htmlFor={otherInputId} className="text-body-medium text-text-primary">
                        {other.label}
                      </label>
                      <input
                        id={otherInputId}
                        data-q-row
                        value={drafts[q.id] ?? answer.other ?? ''}
                        placeholder={other.placeholder}
                        onChange={(event) => setOtherText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') return;
                          event.preventDefault();
                          if (mode === 'single' && !otherOn) return;
                          advance();
                        }}
                        aria-keyshortcuts={String(rowCount)}
                        className="w-full min-w-0 bg-transparent p-0 text-body-regular text-text-primary outline-none placeholder:text-text-placeholder"
                      />
                    </span>
                    {mode === 'single' ? (
                      <NumberKey n={rowCount} on={otherOn} />
                    ) : (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={otherOn}
                        aria-label={other.label}
                        onClick={toggleOther}
                        className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2"
                      >
                        {tick(otherOn)}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
        <div role="group" aria-label={labels.steps ?? 'Steps'} className="flex flex-wrap items-center gap-1">
          {questions.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-current={i === step ? 'step' : undefined}
              onClick={() => goTo(i)}
              className={cx(
                'rounded-full px-2 py-1 text-body-regular outline-none',
                'transition-colors duration-150 ease-out motion-reduce:transition-none',
                'focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                i === step
                  ? 'bg-status-blue-background text-status-blue-text'
                  : 'text-text-secondary hover:bg-background-primary-hover hover:text-text-primary',
              )}
            >
              {item.stepLabel ?? `Step ${i + 1}`}
            </button>
          ))}
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Button variant="secondary" size="small" disabled={step === 0} onClick={() => goTo(step - 1)}>
            {labels.previous ?? 'Previous'}
          </Button>
          <Button variant="primary" size="small" onClick={advance}>
            {isLast ? (labels.complete ?? 'Done') : (labels.next ?? 'Next')}
          </Button>
        </div>
      </div>
      <span aria-live="polite" className="sr-only">
        {`Question ${step + 1} of ${questions.length}`}
      </span>
    </div>
  );
}
// #endregion
