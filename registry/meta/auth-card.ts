import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'auth-card',
  title: 'Auth Card',
  category: 'block',
  kit: 'boardui',
  tags: ['auth', 'sign-in', 'sign-up', 'otp', 'form', 'carousel', 'boardui'],
  blurb: 'Sign-in, sign-up and code-verify cards with social providers stacked, inline or in a grid, and an optional split layout with artwork.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/auth-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/ui/auth-media-carousel.tsx',
      type: 'registry:ui',
      role: 'auto-advancing artwork for the split layout\'s media slot',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The shell around a sign-in screen. One card covers three steps: `signin` (email, password, remember me, forgot password), `signup` (name, email with a hint, password, terms line) and `verify` (OTP boxes and a resend action). Social providers always sit below the email form, behind an "or continue with" divider, in one of three layouts from the same `providers` array. Passing `media` turns it into an 880px split card with artwork on the right, and `AuthMediaCarousel` is the ready-made option: full-bleed images that shrink into cards and swing away on a drum.',

  mechanism: [
    '`mode` picks a copy set from `COPY` (title, description, CTA and footer line) and which fields render. `verify` swaps the email and password inputs for `InputOtp` (6 digits by default, split into two groups when the length is even), drops the providers, shows a mail icon as the mark and turns the footer link into a resend button.',
    'The form is uncontrolled. On submit it calls `preventDefault` and hands `new FormData(form)` to `onSubmit`, with fields named `name`, `email`, `password` and `confirmPassword`, so it can be wired to any auth library.',
    'Providers map to `SocialButton`s with the white appearance. `stacked` gives full-width labelled buttons in a column; `inline` gives icon-only squares in a wrapping, centred row; `grid` gives icon-only buttons in `grid-flow-col auto-cols-fr`, stretched with `w-full`, so a small set reads as one row of controls. Icon-only buttons get `aria-label="Continue with <Provider>"`.',
    'Without `media` the card is a single 400px column. With it, the card becomes a two-column grid (`md:grid-cols-2`, max 880px) and the media cell is `hidden` below `md`, so a phone gets the form alone instead of a tall image above it. `footnote` renders small print centred below the card, outside its border.',
    '`AuthMediaCarousel` runs a four-beat `setTimeout` state machine: `idle` for `interval` (3200ms), `shrink` to `scale(0.82)` with a 24px radius for 450ms plus a 200ms hold, `slide` for 700ms, then a 20ms `enter` frame before growing back to full bleed over 500ms.',
    'Each slide is placed by `position = (slideIndex − index + count) % count`. During `slide` the current one moves to `translateX(−100%) translateZ(−220px) rotateY(−48deg)` inside an 850px perspective, while the next one travels from the mirrored spot (`translateX(100%)`, `rotateY(48deg)`) to the centre at `scale(0.8)`. Only the slides moving in a beat get a transition, so a slide wrapping from the left to the back of the queue jumps without streaking. The sign flips in RTL.',
  ],

  constants: [
    {
      name: 'card widths',
      value: '400px single, 880px split',
      why: 'A sign-in column stays narrow enough to scan; the split halves the wider card between form and art.',
    },
    {
      name: 'default providers',
      value: '["google", "apple", "github"]',
      why: 'Three is a full row in `grid` and a short stack in `stacked`.',
    },
    {
      name: 'CARD_SCALE / ENTER_SCALE / CARD_RADIUS',
      value: '0.82 / 0.8 / 24px',
      why: 'The image visibly detaches into a card before it moves, and the incoming card arrives slightly smaller so the grow reads as a separate beat.',
    },
    {
      name: 'PERSPECTIVE / DEPTH / TILT',
      value: '850px / 220px / 48deg',
      why: 'Cards bank away from the middle as if on a drum turning past the viewer, which gives the movement a front and a back.',
    },
    {
      name: 'SHRINK_MS / HOLD_MS / SLIDE_MS / GROW_MS',
      value: '450 / 200 / 700 / 500',
      why: 'The hold makes the shrink read as deliberate; the slide is the longest beat because it carries the most distance.',
    },
    {
      name: 'interval',
      value: '3200ms',
      why: 'Time at full bleed before each change: atmosphere, not a slideshow to watch.',
    },
  ],

  pitfalls: [
    '`headingLevel` defaults to 1 because on a real sign-in screen the card is the page. Set it to 2 or lower wherever the card is embedded in a page that already has an `<h1>`.',
    'The "Remember me" checkbox is internal state with no `name`, and `InputOtp` has no `name` either, so neither appears in the submitted `FormData`. Read the code from `onComplete`.',
    '`confirmPassword` replaces the "Full name" field with a second password field rather than adding one, since the name input only renders for `signup && !confirmPassword`.',
    '"Forgot password?" is hard-coded to `href="#"` and `switchHref` defaults to `"#"`. Point them at real routes, or wrap the card and replace them.',
    'The signup description mentions "Acme" and the copy is in English. Pass `title` and `description`, or provide a `TemplateCopyProvider`, for your own product.',
    '`AuthMediaCarousel` is absolutely positioned (`absolute inset-0`) and keys slides by `src`. Give it a positioned parent with a height (the card\'s media cell already is one) and use distinct `src` values.',
  ],

  notes: [
    '`auth-card` re-exports `AuthMediaCarousel` and `AuthMediaSlide`, so the carousel installs alongside the card even though the card never renders it itself.',
    'The carousel uses a plain `<img>` (first slide eager, the rest lazy) so it does not impose `next/image` on the installing project. Slides are decorative (`alt=""`, `aria-hidden`) unless you pass `alt`.',
    'The carousel has no controls on purpose: next to a sign-in form, artwork is atmosphere, and arrows would invite visitors away from the form.',
    'In dark mode both card variants switch to the secondary background.',
  ],

  apiSignature:
    'type AuthLayout = "stacked" | "inline" | "grid"\ntype AuthMode = "signin" | "signup" | "verify"\nfunction AuthCard(props: { mode?: AuthMode; email?: string; codeLength?: number; onComplete?: (code: string) => void; onResend?: () => void; layout?: AuthLayout; providers?: SocialProvider[]; title?: ReactNode; description?: ReactNode; media?: ReactNode; logo?: ReactNode; centered?: boolean; confirmPassword?: boolean; footnote?: ReactNode; onSubmit?: (data: FormData) => void; onProvider?: (provider: SocialProvider) => void; switchHref?: string; headingLevel?: 1 | 2 | 3 | 4 | 5 | 6; className?: string }): JSX.Element\nfunction AuthMediaCarousel(props: { slides: { src: string; alt?: string }[]; interval?: number; className?: string }): JSX.Element',

  props: [
    { name: 'mode', type: '"signin" | "signup" | "verify"', default: '"signin"', description: 'Which step the card shows.' },
    { name: 'layout', type: '"stacked" | "inline" | "grid"', default: '"stacked"', description: 'How the provider buttons are arranged under the form.' },
    { name: 'providers', type: 'SocialProvider[]', default: '["google", "apple", "github"]', description: 'Provider keys from `SOCIAL_PROVIDERS`; an empty array hides the divider and buttons.' },
    { name: 'onSubmit', type: '(data: FormData) => void', description: 'Called with the form\'s FormData on submit.' },
    { name: 'onProvider', type: '(provider: SocialProvider) => void', description: 'Called when a provider button is pressed.' },
    { name: 'email', type: 'string', description: '`verify` only: the address shown in the description.' },
    { name: 'codeLength', type: 'number', default: '6', description: '`verify` only: how many OTP boxes.' },
    { name: 'onComplete / onResend', type: '(code: string) => void / () => void', description: '`verify` only: fires when the last box is filled, and the resend action.' },
    { name: 'media', type: 'ReactNode', description: 'Artwork for the right half; switches to the split layout.' },
    { name: 'logo', type: 'ReactNode', description: 'Mark above the title.' },
    { name: 'centered', type: 'boolean', default: 'false', description: 'Centre the mark and heading.' },
    { name: 'confirmPassword', type: 'boolean', default: 'false', description: 'Sign-up only: two password fields instead of name and password.' },
    { name: 'footnote', type: 'ReactNode', description: 'Small print below the card; also replaces the in-card terms line on sign-up.' },
    { name: 'title / description', type: 'ReactNode', description: 'Override the copy for the current mode.' },
    { name: 'switchHref', type: 'string', default: '"#"', description: 'Target of the footer link to the other mode.' },
    { name: 'headingLevel', type: '1 | 2 | 3 | 4 | 5 | 6', default: '1', description: 'Heading element used for the title.' },
    { name: 'slides', type: 'AuthMediaSlide[]', description: 'AuthMediaCarousel: images to cycle; `alt` makes a slide non-decorative.' },
    { name: 'interval', type: 'number', default: '3200', description: 'AuthMediaCarousel: ms a slide rests at full bleed.' },
  ],

  reducedMotion:
    'The card itself has no motion beyond its controls\' own hover and focus styles. `AuthMediaCarousel` checks `prefers-reduced-motion: reduce` when its effect runs and, if set, never schedules a beat, so it holds on the first slide at full bleed. It also does nothing with fewer than two slides.',

  cleanup:
    'The carousel keeps exactly one pending `setTimeout`, cleared whenever the phase, slide count or interval changes and on unmount. The card adds no timers or listeners.',

  acceptance:
    'In `signin` the card shows the title, email and password fields, "Remember me" (checked) and "Forgot password?", a full-width "Sign in" button, the divider and the providers, and a "New here? Create an account" footer. `inline` shows icon-only squares that wrap; `grid` stretches them across one row; `stacked` labels each one. Submitting calls `onSubmit` with the form\'s FormData. `verify` shows OTP boxes in two groups of three, no providers and a "Send a new one" button. With `media`, the card splits in two at `md` and above and shows only the form below it. The carousel rests on an image for about 3.2s, shrinks it into a rounded card, swings it left into depth while the next card comes in from the right, then grows the new one back to full bleed.',

  criticalRegion: 'critical',
};

export default meta;
