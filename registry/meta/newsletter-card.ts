/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Newsletter Card" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'newsletter-card',
  title: 'Newsletter Card',
  category: 'form',
  kit: 'boardui',
  tags: ['newsletter', 'email', 'form', 'validation', 'boardui'],
  blurb:
    'Email sign-up card with inline validation, a submitting state on a cleaned-up timer, success with reset, and an error path.',
  cost: 'css',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/newsletter-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A centred sign-up card: a title, a line of copy and the kit `Input` with a mail icon beside a Subscribe button, under soft coloured streaks. Submitting validates the address inline. A valid address enters a submitting state that lasts at least `submitDelay` ms. The card then shows a success panel with the address and a "Use a different address" reset, or puts the failure message on the field. With no `onSubscribe` the delay alone simulates the request.',

  mechanism: [
    'Four states (`idle`, `submitting`, `success`, `error`) plus an `error` string drive the render. The form has `noValidate` and the field `validationBehavior="aria"`, so the browser never shows its own bubble. `validate(email)` returns a message or null, and the message goes into the kit Input as `isInvalid` plus `errorMessage`, rendered through React Aria\'s FieldError. Editing the field clears the message and leaves the error state.',
    'On a valid submit the card bumps a run counter and enters `submitting`. It wraps `onSubscribe(email)` so a return, a rejection and a synchronous throw all become a settled value, and starts a `window.setTimeout(submitDelay)` stored in a ref. It waits on `Promise.all` of the two, so a fast response still shows the spinner for the full delay and a slow one holds it longer.',
    'When both settle, the result applies only if the run counter still matches. A reset or unmount bumps the counter and clears the timer, so a late result from an abandoned submission cannot overwrite the current state. Failures go through `messageOf` (Error message, then string, then a fallback) and land on the field.',
    'Focus follows the state. A `focusRef` names the target ("input" or "success"), and an effect keyed on `[status, error]` focuses it after the new state has rendered: the field after an invalid submit, an error or a reset, and the `tabIndex=-1` success panel after success. While submitting, the field is `isReadOnly` and the button `aria-disabled` rather than disabled, because disabling the focused element would drop focus to `<body>`.',
    'A visually hidden `role="status"` paragraph announces "Subscribing…" and "Subscribed as …". The success panel enters with a 320ms fade and 6px rise from a hoisted `@keyframes`, applied only under `motion-safe`. The streaks are six blurred rounded bars in accent and chart tones, faded out downward by `mask-b-from-10% mask-b-to-100%`.',
  ],

  constants: [
    {
      name: 'submitDelay',
      value: '1200ms',
      why: 'The minimum time in the submitting state. Long enough to read the spinner as "working" rather than a flicker, and short enough not to feel slow. It is also the full simulated request when there is no `onSubscribe`.',
    },
    {
      name: 'email pattern',
      value: '/^[^\\s@]+@[^\\s@.]+(\\.[^\\s@.]+)+$/',
      why: 'Catches the typos people actually make (no @, no dot in the domain, stray spaces, `name@.com`) without rejecting valid but unusual addresses. The server stays the real authority.',
    },
    {
      name: 'success entrance',
      value: '320ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0 → 1, translateY 6px → 0',
      why: 'A short ease-out rise reads as the form turning into the confirmation, rather than the content being swapped.',
    },
    {
      name: 'form width',
      value: 'max-w-[380px], row from @md (28rem)',
      why: 'Fits the 380px input-and-button row of the landing card. Below 28rem of container width the button moves under the field at full width.',
    },
  ],

  pitfalls: [
    'Disabling the field or button while submitting. If either has focus, the browser moves focus to `<body>` and a keyboard user has to tab back in from the top of the page. Read-only and `aria-disabled` keep focus where it was, and the submit handler ignores repeats.',
    'Letting a stale request finish. If someone resets, or the card unmounts mid-request, the old promise still resolves. Without the run-counter check it would flip a fresh form to success or call setState after unmount.',
    'Using `Promise.all([onSubscribe(), delay])` directly. A rejection short-circuits `all`, the error appears before the minimum delay, and a synchronous throw escapes the handler entirely. Settle the call into a value first.',
    'Leaving native validation on. `type="email"` with `required` shows the browser bubble on submit, which ignores the theme and does not reach the FieldError slot.',
  ],

  notes: [
    'Pass your own `validate` to add rules such as blocking disposable domains. It receives the trimmed address.',
    'The exported `validateEmail` is the default validator, so a custom one can call it and add rules on top.',
  ],

  apiSignature:
    'function NewsletterCard(props: { title?: ReactNode; description?: ReactNode; placeholder?: string; submitLabel?: ReactNode; onSubscribe?: (email: string) => void | Promise<void>; submitDelay?: number; validate?: (email: string) => string | null; successTitle?: ReactNode; successMessage?: (email: string) => ReactNode; resetLabel?: ReactNode; onStatusChange?: (status: "idle" | "submitting" | "success" | "error") => void; decoration?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'title', type: 'ReactNode', default: '"Get new components in your inbox"', description: 'Card heading (an h3 that labels the section).' },
    { name: 'description', type: 'ReactNode', description: 'Copy under the title.' },
    { name: 'placeholder', type: 'string', default: '"you@company.com"', description: 'Field placeholder.' },
    { name: 'submitLabel', type: 'ReactNode', default: '"Subscribe"', description: 'Button text when idle. It reads "Subscribing" while submitting.' },
    { name: 'onSubscribe', type: '(email: string) => void | Promise<void>', description: 'Called with the trimmed, validated address. A throw or rejection shows the error state with its message.' },
    { name: 'submitDelay', type: 'number', default: '1200', description: 'Minimum time in the submitting state, in ms.' },
    { name: 'validate', type: '(email: string) => string | null', default: 'validateEmail', description: 'Returns a message to block submission.' },
    { name: 'successTitle', type: 'ReactNode', default: '"You\'re on the list"', description: 'Heading of the success panel.' },
    { name: 'successMessage', type: '(email: string) => ReactNode', description: 'Body of the success panel, given the subscribed address.' },
    { name: 'resetLabel', type: 'ReactNode', default: '"Use a different address"', description: 'Reset button text.' },
    { name: 'onStatusChange', type: '(status: NewsletterStatus) => void', description: 'Fired on every state change.' },
    { name: 'decoration', type: 'boolean', default: 'true', description: 'Show the coloured streaks along the top edge.' },
  ],

  reducedMotion:
    'The success entrance is behind `motion-safe:`, so with reduced motion the panel simply appears. The streaks never move, and the opacity change on success transitions only under `motion-safe`. The spinner still turns, because it is the status indicator and not decoration.',

  cleanup:
    'An unmount effect clears the submit timer and bumps the run counter, so a promise still in flight resolves into nothing. A reset does the same. There are no listeners or observers.',

  acceptance:
    'Submitting an empty field shows "Enter your email address." under it, keeps focus there and makes no request. Submitting "abc" shows the format message, and typing clears it. A valid address disables repeat submits, shows "Subscribing" with a spinner for about 1.2s, then shows the success panel naming the address. "Use a different address" returns to an empty, focused field. An address that `onSubscribe` rejects shows its message on the field after the delay. Unmounting mid-submit leaves no timer running.',

  criticalRegion: 'critical',
};

export default meta;
