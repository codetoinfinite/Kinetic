# Build: Newsletter Card

A centred sign-up card: a title, a line of copy and the kit `Input` with a mail icon beside a Subscribe button, under soft coloured streaks. Submitting validates the address inline. A valid address enters a submitting state that lasts at least `submitDelay` ms. The card then shows a success panel with the address and a "Use a different address" reset, or puts the failure message on the field. With no `onSubscribe` the delay alone simulates the request.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Email sign-up card with inline validation, a submitting state on a cleaned-up timer, success with reset, and an error path.

- Category: form
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Four states (`idle`, `submitting`, `success`, `error`) plus an `error` string drive the render. The form has `noValidate` and the field `validationBehavior="aria"`, so the browser never shows its own bubble. `validate(email)` returns a message or null, and the message goes into the kit Input as `isInvalid` plus `errorMessage`, rendered through React Aria's FieldError. Editing the field clears the message and leaves the error state.
2. On a valid submit the card bumps a run counter and enters `submitting`. It wraps `onSubscribe(email)` so a return, a rejection and a synchronous throw all become a settled value, and starts a `window.setTimeout(submitDelay)` stored in a ref. It waits on `Promise.all` of the two, so a fast response still shows the spinner for the full delay and a slow one holds it longer.
3. When both settle, the result applies only if the run counter still matches. A reset or unmount bumps the counter and clears the timer, so a late result from an abandoned submission cannot overwrite the current state. Failures go through `messageOf` (Error message, then string, then a fallback) and land on the field.
4. Focus follows the state. A `focusRef` names the target ("input" or "success"), and an effect keyed on `[status, error]` focuses it after the new state has rendered: the field after an invalid submit, an error or a reset, and the `tabIndex=-1` success panel after success. While submitting, the field is `isReadOnly` and the button `aria-disabled` rather than disabled, because disabling the focused element would drop focus to `<body>`.
5. A visually hidden `role="status"` paragraph announces "Subscribing…" and "Subscribed as …". The success panel enters with a 320ms fade and 6px rise from a hoisted `@keyframes`, applied only under `motion-safe`. The streaks are six blurred rounded bars in accent and chart tones, faded out downward by `mask-b-from-10% mask-b-to-100%`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `submitDelay = 1200ms`
  The minimum time in the submitting state. Long enough to read the spinner as "working" rather than a flicker, and short enough not to feel slow. It is also the full simulated request when there is no `onSubscribe`.
- `email pattern = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/`
  Catches the typos people actually make (no @, no dot in the domain, stray spaces, `name@.com`) without rejecting valid but unusual addresses. The server stays the real authority.
- `success entrance = 320ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0 → 1, translateY 6px → 0`
  A short ease-out rise reads as the form turning into the confirmation, rather than the content being swapped.
- `form width = max-w-[380px], row from @md (28rem)`
  Fits the 380px input-and-button row of the landing card. Below 28rem of container width the button moves under the field at full width.

## API

```ts
function NewsletterCard(props: { title?: ReactNode; description?: ReactNode; placeholder?: string; submitLabel?: ReactNode; onSubscribe?: (email: string) => void | Promise<void>; submitDelay?: number; validate?: (email: string) => string | null; successTitle?: ReactNode; successMessage?: (email: string) => ReactNode; resetLabel?: ReactNode; onStatusChange?: (status: "idle" | "submitting" | "success" | "error") => void; decoration?: boolean; className?: string }): JSX.Element
```

- `title: ReactNode` — default `"Get new components in your inbox"`
  Card heading (an h3 that labels the section).
- `description: ReactNode`
  Copy under the title.
- `placeholder: string` — default `"you@company.com"`
  Field placeholder.
- `submitLabel: ReactNode` — default `"Subscribe"`
  Button text when idle. It reads "Subscribing" while submitting.
- `onSubscribe: (email: string) => void | Promise<void>`
  Called with the trimmed, validated address. A throw or rejection shows the error state with its message.
- `submitDelay: number` — default `1200`
  Minimum time in the submitting state, in ms.
- `validate: (email: string) => string | null` — default `validateEmail`
  Returns a message to block submission.
- `successTitle: ReactNode` — default `"You're on the list"`
  Heading of the success panel.
- `successMessage: (email: string) => ReactNode`
  Body of the success panel, given the subscribed address.
- `resetLabel: ReactNode` — default `"Use a different address"`
  Reset button text.
- `onStatusChange: (status: NewsletterStatus) => void`
  Fired on every state change.
- `decoration: boolean` — default `true`
  Show the coloured streaks along the top edge.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
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
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** An unmount effect clears the submit timer and bumps the run counter, so a promise still in flight resolves into nothing. A reset does the same. There are no listeners or observers.

**Reduced motion.** The success entrance is behind `motion-safe:`, so with reduced motion the panel simply appears. The streaks never move, and the opacity change on success transitions only under `motion-safe`. The spinner still turns, because it is the status indicator and not decoration.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Disabling the field or button while submitting. If either has focus, the browser moves focus to `<body>` and a keyboard user has to tab back in from the top of the page. Read-only and `aria-disabled` keep focus where it was, and the submit handler ignores repeats.
- Letting a stale request finish. If someone resets, or the card unmounts mid-request, the old promise still resolves. Without the run-counter check it would flip a fresh form to success or call setState after unmount.
- Using `Promise.all([onSubscribe(), delay])` directly. A rejection short-circuits `all`, the error appears before the minimum delay, and a synchronous throw escapes the handler entirely. Settle the call into a value first.
- Leaving native validation on. `type="email"` with `required` shows the browser bubble on submit, which ignores the theme and does not reach the FieldError slot.

## Notes

- Pass your own `validate` to add rules such as blocking disposable domains. It receives the trimmed address.
- The exported `validateEmail` is the default validator, so a custom one can call it and add rules on top.

## Definition of done

Submitting an empty field shows "Enter your email address." under it, keeps focus there and makes no request. Submitting "abc" shows the format message, and typing clears it. A valid address disables repeat submits, shows "Subscribing" with a spinner for about 1.2s, then shows the success panel naming the address. "Use a different address" returns to an empty, focused field. An address that `onSubscribe` rejects shows its message on the field after the delay. Unmounting mid-submit leaves no timer running.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
