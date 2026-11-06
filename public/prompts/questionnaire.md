# Build: Questionnaire

A chat-thread card that walks through a few questions, one at a time. Multiple-select questions are checkbox rows; single-select questions number their rows, and a click or the digit key picks and moves on after a short beat so the choice is seen landing. An optional Other row takes free text. The footer has a pill per question for jumping around plus Previous and Next, which reads Done on the last step. Questions slide in the direction of travel while the card eases to the new height.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The questions an agent asks before it plans: one per step, checkbox or numbered rows, a free-text Other and step pills.

- Category: form
- Runtime cost: dom
- Dependencies: motion@^12.43.0

## How it works

1. Answers are keyed by question id as { values, other? }: values keep option order, and other exists only while the Other row is selected. Typed text is kept in a separate drafts map so unticking Other and ticking it again restores it.
2. answers and step are each controllable: the prop wins when given, otherwise internal state holds it, and the change callback fires either way.
3. A single-select pick writes { values: [value] } and schedules goTo(step + 1) after advanceDelay; the timeout is cleared by any other navigation and on unmount. When the pick moves the card on, focus lands on the next question's first row.
4. goTo records the direction (+1 or -1, mirrored in RTL); AnimatePresence in popLayout mode hands it to both the entering and the exiting panel so they slide opposite ways at once.
5. The exiting panel is popped out of flow, so a shared ResizeObserver on the panel wrapper reports the new question's height right away, and an outer motion.div animates its height to it with overflow hidden.
6. One keydown handler on the card maps 1-9 to rows (the last digit focuses the Other input) and ArrowUp/ArrowDown to moving focus between rows; it ignores typing inside the input, where Enter sends the free text.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `advanceDelay = 180ms`
  Long enough to see the row and its key turn selected, short enough that picking feels like one action.
- `slide = 28px, 320ms, cubic-bezier(0.22, 1, 0.36, 1), 2px blur`
  A short travel distance keeps the two overlapping panels readable while they cross.
- `height = 300ms on the same curve`
  Finishes with the slide so the footer settles once.

## API

```ts
<Questionnaire questions={[{ id: "permission", select: "single", question: "How should the permission pill behave?", options: [{ value: "lock", label: "Lock it" }], other: true }]} onComplete={(answers) => plan(answers)} onDismiss={() => setOpen(false)} />
```

- `questions: readonly QuestionnaireQuestion[]`
  Each has id, question, options ({ value, label, description? }), optional other (true or { label, placeholder }), select and stepLabel.
- `select: "single" | "multiple"` — default `"multiple"`
  Default mode for questions that do not set their own.
- `advanceDelay: number` — default `180`
  Milliseconds before a single-select pick moves to the next question.
- `answers: QuestionnaireAnswers`
  Controlled answers keyed by question id.
- `defaultAnswers: QuestionnaireAnswers` — default `{}`
  Initial answers when uncontrolled.
- `onAnswersChange: (answers: QuestionnaireAnswers) => void`
  Fires on every pick, untick or keystroke in Other.
- `step: number`
  Controlled index of the visible question.
- `defaultStep: number` — default `0`
  Initial question when uncontrolled.
- `onStepChange: (step: number) => void`
  Fires when Previous, Next, a pill or an auto-advance changes the question.
- `onComplete: (answers: QuestionnaireAnswers) => void`
  Fires when Done is pressed on the last question, or Enter is pressed in its Other field.
- `onDismiss: () => void`
  Shows the corner dismiss button when set.
- `labels: QuestionnaireLabels`
  previous, next, complete, other, otherPlaceholder, dismiss and steps.
- `aria-label: string` — default `"Questions"`
  Accessible name of the card.
- `className: string`
  Classes on the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The pending auto-advance timeout is cleared on every navigation and on unmount; the height observer is released on unmount. Keyboard handling is a React handler on the card, so no global listeners are attached.

**Reduced motion.** Questions swap with a 120ms crossfade instead of the slide and blur, the card height changes instantly, and row colour transitions are off. Single-select picks still wait advanceDelay so the choice is visible.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Give every question a stable, unique id: answers and drafts are stored by it.
- A pick on the last single-select question does not complete on its own; Done fires onComplete, so a stray click cannot send the answers.
- When you control step, keep it inside 0..questions.length - 1; out-of-range values are clamped for display only.
- Digit keys only work while focus is inside the card, so they never steal keys from the rest of the page.

## Notes

- select on a question overrides the card-level select, so one card can mix checkbox and numbered questions.
- labels rewords Previous, Next, Done, the Other row, the dismiss button and the steps group.
- onComplete receives the answers as they stand; questions left unanswered are absent or have empty values.

## Definition of done

Ticking two rows on step 1 sets both checkboxes and Next moves to step 2 with the card sliding left; pressing 2 there highlights Queue the change and moves to step 3 on its own; Previous returns with the pick still highlighted; typing in Other ticks it; the pills jump straight to any step; Done on step 4 shows the summary, Edit answers comes back with every answer intact and Start over clears them.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
