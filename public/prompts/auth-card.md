# Build: Auth Card

The shell around a sign-in screen. One card covers three steps: `signin` (email, password, remember me, forgot password), `signup` (name, email with a hint, password, terms line) and `verify` (OTP boxes and a resend action). Social providers always sit below the email form, behind an "or continue with" divider, in one of three layouts from the same `providers` array. Passing `media` turns it into an 880px split card with artwork on the right, and `AuthMediaCarousel` is the ready-made option: full-bleed images that shrink into cards and swing away on a drum.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Sign-in, sign-up and code-verify cards with social providers stacked, inline or in a grid, and an optional split layout with artwork.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. `mode` picks a copy set from `COPY` (title, description, CTA and footer line) and which fields render. `verify` swaps the email and password inputs for `InputOtp` (6 digits by default, split into two groups when the length is even), drops the providers, shows a mail icon as the mark and turns the footer link into a resend button.
2. The form is uncontrolled. On submit it calls `preventDefault` and hands `new FormData(form)` to `onSubmit`, with fields named `name`, `email`, `password` and `confirmPassword`, so it can be wired to any auth library.
3. Providers map to `SocialButton`s with the white appearance. `stacked` gives full-width labelled buttons in a column; `inline` gives icon-only squares in a wrapping, centred row; `grid` gives icon-only buttons in `grid-flow-col auto-cols-fr`, stretched with `w-full`, so a small set reads as one row of controls. Icon-only buttons get `aria-label="Continue with <Provider>"`.
4. Without `media` the card is a single 400px column. With it, the card becomes a two-column grid (`md:grid-cols-2`, max 880px) and the media cell is `hidden` below `md`, so a phone gets the form alone instead of a tall image above it. `footnote` renders small print centred below the card, outside its border.
5. `AuthMediaCarousel` runs a four-beat `setTimeout` state machine: `idle` for `interval` (3200ms), `shrink` to `scale(0.82)` with a 24px radius for 450ms plus a 200ms hold, `slide` for 700ms, then a 20ms `enter` frame before growing back to full bleed over 500ms.
6. Each slide is placed by `position = (slideIndex − index + count) % count`. During `slide` the current one moves to `translateX(−100%) translateZ(−220px) rotateY(−48deg)` inside an 850px perspective, while the next one travels from the mirrored spot (`translateX(100%)`, `rotateY(48deg)`) to the centre at `scale(0.8)`. Only the slides moving in a beat get a transition, so a slide wrapping from the left to the back of the queue jumps without streaking. The sign flips in RTL.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card widths = 400px single, 880px split`
  A sign-in column stays narrow enough to scan; the split halves the wider card between form and art.
- `default providers = ["google", "apple", "github"]`
  Three is a full row in `grid` and a short stack in `stacked`.
- `CARD_SCALE / ENTER_SCALE / CARD_RADIUS = 0.82 / 0.8 / 24px`
  The image visibly detaches into a card before it moves, and the incoming card arrives slightly smaller so the grow reads as a separate beat.
- `PERSPECTIVE / DEPTH / TILT = 850px / 220px / 48deg`
  Cards bank away from the middle as if on a drum turning past the viewer, which gives the movement a front and a back.
- `SHRINK_MS / HOLD_MS / SLIDE_MS / GROW_MS = 450 / 200 / 700 / 500`
  The hold makes the shrink read as deliberate; the slide is the longest beat because it carries the most distance.
- `interval = 3200ms`
  Time at full bleed before each change: atmosphere, not a slideshow to watch.

## API

```ts
type AuthLayout = "stacked" | "inline" | "grid"
type AuthMode = "signin" | "signup" | "verify"
function AuthCard(props: { mode?: AuthMode; email?: string; codeLength?: number; onComplete?: (code: string) => void; onResend?: () => void; layout?: AuthLayout; providers?: SocialProvider[]; title?: ReactNode; description?: ReactNode; media?: ReactNode; logo?: ReactNode; centered?: boolean; confirmPassword?: boolean; footnote?: ReactNode; onSubmit?: (data: FormData) => void; onProvider?: (provider: SocialProvider) => void; switchHref?: string; headingLevel?: 1 | 2 | 3 | 4 | 5 | 6; className?: string }): JSX.Element
function AuthMediaCarousel(props: { slides: { src: string; alt?: string }[]; interval?: number; className?: string }): JSX.Element
```

- `mode: "signin" | "signup" | "verify"` — default `"signin"`
  Which step the card shows.
- `layout: "stacked" | "inline" | "grid"` — default `"stacked"`
  How the provider buttons are arranged under the form.
- `providers: SocialProvider[]` — default `["google", "apple", "github"]`
  Provider keys from `SOCIAL_PROVIDERS`; an empty array hides the divider and buttons.
- `onSubmit: (data: FormData) => void`
  Called with the form's FormData on submit.
- `onProvider: (provider: SocialProvider) => void`
  Called when a provider button is pressed.
- `email: string`
  `verify` only: the address shown in the description.
- `codeLength: number` — default `6`
  `verify` only: how many OTP boxes.
- `onComplete / onResend: (code: string) => void / () => void`
  `verify` only: fires when the last box is filled, and the resend action.
- `media: ReactNode`
  Artwork for the right half; switches to the split layout.
- `logo: ReactNode`
  Mark above the title.
- `centered: boolean` — default `false`
  Centre the mark and heading.
- `confirmPassword: boolean` — default `false`
  Sign-up only: two password fields instead of name and password.
- `footnote: ReactNode`
  Small print below the card; also replaces the in-card terms line on sign-up.
- `title / description: ReactNode`
  Override the copy for the current mode.
- `switchHref: string` — default `"#"`
  Target of the footer link to the other mode.
- `headingLevel: 1 | 2 | 3 | 4 | 5 | 6` — default `1`
  Heading element used for the title.
- `slides: AuthMediaSlide[]`
  AuthMediaCarousel: images to cycle; `alt` makes a slide non-decorative.
- `interval: number` — default `3200`
  AuthMediaCarousel: ms a slide rests at full bleed.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const social = (
  <div
    className={cx(
      layout === "stacked" && "flex flex-col gap-2.5",
      // Wraps rather than scrolls: six providers on a narrow card should
      // fall to a second row, not clip.
      layout === "inline" && "flex flex-wrap justify-center gap-2",
      // Equal columns that share the full width, so three providers read as
      // one row of controls rather than three loose squares.
      layout === "grid" && "grid grid-flow-col auto-cols-fr gap-2.5",
    )}
  >
    {providers.map((provider) => (
      <SocialButton
        key={provider}
        brand={provider}
        appearance="white"
        iconOnly={layout !== "stacked"}
        fullWidth={layout === "stacked"}
        // `iconOnly` fixes a square width; the grid needs it to stretch,
        // and `className` is last into `cx` so it wins.
        className={layout === "grid" ? "w-full" : undefined}
        aria-label={layout !== "stacked" ? `Continue with ${SOCIAL_PROVIDERS[provider].label}` : undefined}
        onClick={() => onProvider?.(provider)}
      >
        {`Continue with ${SOCIAL_PROVIDERS[provider].label}`}
      </SocialButton>
    ))}
  </div>
);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The carousel keeps exactly one pending `setTimeout`, cleared whenever the phase, slide count or interval changes and on unmount. The card adds no timers or listeners.

**Reduced motion.** The card itself has no motion beyond its controls' own hover and focus styles. `AuthMediaCarousel` checks `prefers-reduced-motion: reduce` when its effect runs and, if set, never schedules a beat, so it holds on the first slide at full bleed. It also does nothing with fewer than two slides.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- `headingLevel` defaults to 1 because on a real sign-in screen the card is the page. Set it to 2 or lower wherever the card is embedded in a page that already has an `<h1>`.
- The "Remember me" checkbox is internal state with no `name`, and `InputOtp` has no `name` either, so neither appears in the submitted `FormData`. Read the code from `onComplete`.
- `confirmPassword` replaces the "Full name" field with a second password field rather than adding one, since the name input only renders for `signup && !confirmPassword`.
- "Forgot password?" is hard-coded to `href="#"` and `switchHref` defaults to `"#"`. Point them at real routes, or wrap the card and replace them.
- The signup description mentions "Acme" and the copy is in English. Pass `title` and `description`, or provide a `TemplateCopyProvider`, for your own product.
- `AuthMediaCarousel` is absolutely positioned (`absolute inset-0`) and keys slides by `src`. Give it a positioned parent with a height (the card's media cell already is one) and use distinct `src` values.

## Notes

- `auth-card` re-exports `AuthMediaCarousel` and `AuthMediaSlide`, so the carousel installs alongside the card even though the card never renders it itself.
- The carousel uses a plain `<img>` (first slide eager, the rest lazy) so it does not impose `next/image` on the installing project. Slides are decorative (`alt=""`, `aria-hidden`) unless you pass `alt`.
- The carousel has no controls on purpose: next to a sign-in form, artwork is atmosphere, and arrows would invite visitors away from the form.
- In dark mode both card variants switch to the secondary background.

## Definition of done

In `signin` the card shows the title, email and password fields, "Remember me" (checked) and "Forgot password?", a full-width "Sign in" button, the divider and the providers, and a "New here? Create an account" footer. `inline` shows icon-only squares that wrap; `grid` stretches them across one row; `stacked` labels each one. Submitting calls `onSubmit` with the form's FormData. `verify` shows OTP boxes in two groups of three, no providers and a "Send a new one" button. With `media`, the card splits in two at `md` and above and shows only the form below it. The carousel rests on an image for about 3.2s, shrinks it into a rounded card, swings it left into depth while the next card comes in from the right, then grows the new one back to full bleed.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
