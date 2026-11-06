import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'social-button',
  title: 'Social Button',
  category: 'action',
  kit: 'boardui',
  tags: ['button', 'auth', 'sign-in', 'oauth', 'brand', 'boardui'],
  blurb:
    'Sign-in button for 24 named providers: one brand prop supplies logo, colour and label, in colourful, black or outlined styles.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/social-button.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/ui/social-providers.ts',
      type: 'registry:ui',
      role: 'monochrome brand glyphs, labels and colours',
    },
    {
      path: 'registry/ui/social-color-logos.ts',
      type: 'registry:ui',
      role: 'full-colour brand marks',
    },
  ],
  dependencies: [],

  summary:
    'A "Continue with …" button where the brand is named rather than passed as artwork: `brand="github"` pulls the glyph, the brand colour and the label from one table, so a stack of providers cannot drift out of sync. Three appearances share one shape: `colorful` fills with a gradient derived from the brand colour, `black` is solid high-contrast, and `white` is the outlined secondary surface that shows each provider\'s real multi-colour mark. Passing `href` renders an anchor, because starting OAuth is a navigation.',

  mechanism: [
    '`SOCIAL_PROVIDERS` maps 24 providers to `{ label, brand, viewBox, path }`. The glyphs are monochrome single paths painted with `currentColor` (Simple Icons, CC0, on a 24 grid; Bootstrap Icons, MIT, on a 16 grid for LinkedIn, Slack, Microsoft and Amazon). Each keeps its own `viewBox`, and the button scales whichever grid it gets into the same 18 or 16px box.',
    'For `appearance="white"` the button looks up `SOCIAL_COLOR_LOGOS` instead: real multi-path marks with their own fills (gilbarbara/logos, CC0), injected with `dangerouslySetInnerHTML` from a build-time constant. Amazon has no plain mark upstream, so it falls back to the monochrome glyph tinted with its brand colour. Apple, GitHub and X are drawn near-black, so in dark mode `dark:[&_path]:fill-white` repaints them white.',
    '`colorful` builds its gradient inline per brand: `linear-gradient(180deg, fill, oklch(from fill calc(l − 0.04) calc(c + 0.01) h))`. The second stop is the brand colour 4% darker and slightly more saturated, which is the same step the kit\'s primary button takes from blue-500 to blue-600. Hover and press adjust `brightness` (1.06 and 0.95) instead of swapping gradients.',
    'A brand whose colour is a CSS variable (Google is `var(--color-accent-500)`) skips the inline gradient and takes `bg-button-primary`, so it is exactly the kit\'s primary button, including its hover gradient layer, rather than an approximation of it.',
    'Sizes copy `Button` to the pixel (36px with a 10px radius, 32px with 8px) and add a fixed width (300 or 250px) so a column of providers lines up without a wrapper; `fullWidth` swaps that for `w-full`. With `iconOnly` the label is hidden and the element receives `aria-label="Continue with <Label>"` so it is never announced unlabelled.',
    '`brand="custom"` takes `config: { icon, label, color }` for anything not built in. The label defaults to "SSO" and the colour to black.',
  ],

  constants: [
    {
      name: 'gradient end stop',
      value: 'oklch(from fill calc(l - 0.04) calc(c + 0.01) h)',
      why: 'Darkening in OKLCH keeps the hue stable. Mixing toward black in sRGB would wash out saturated brands such as Spotify green or Twitch purple and turn them muddy at the bottom edge.',
    },
    {
      name: 'hover and press brightness',
      value: '1.06 / 0.95',
      why: 'A per-brand hover gradient would need 24 more colours. A brightness filter gives every brand a consistent, subtle lift and dip from the one colour it already has.',
    },
    {
      name: 'fixed widths',
      value: '300px (medium) / 250px (small)',
      why: '"Continue with Microsoft" is the longest built-in label and fits at both sizes. A fixed width lets a stack of providers align without each caller adding a wrapper.',
    },
    {
      name: 'glyph sizes',
      value: '18px / 16px',
      why: 'One step below Button\'s 20 / 18px icons. A filled brand mark is denser than a line icon and reads heavier at the same size.',
    },
  ],

  pitfalls: [
    'Passing a `style` prop. It is spread after the computed inline style, so it replaces the brand gradient and the colourful button turns transparent with white text.',
    'Relying on the colourful gradient in older browsers. Relative colour syntax (`oklch(from …)`) is invalid where unsupported, which drops the whole `background-image`. Use `appearance="white"` or `black` if you must support those engines.',
    'Writing the label yourself as "Sign in with Google" in only some buttons. Leave `children` empty and every provider gets the same "Continue with <Label>" wording.',
    'Using `brand="custom"` without `config`. The button then renders "Continue with SSO" on a black fill with no logo.',
    'Shipping without checking each provider\'s brand guidelines. Google and Apple in particular publish rules on wording, colour and clear space for sign-in buttons.',
  ],

  notes: [
    'The outlined `white` appearance with full-colour marks is what most sign-in screens use. `colorful` suits a single prominent provider; `black` suits monochrome layouts.',
    '`SOCIAL_PROVIDERS` and the `SocialProvider` type are re-exported, so a settings page can list connected accounts with the same glyphs and labels.',
  ],

  apiSignature:
    'function SocialButton(props: SocialButtonProps | SocialButtonLinkProps): JSX.Element\n// shared: { brand: SocialProvider | "custom"; config?: { icon: ReactNode; label?: string; color?: string }; size?: "medium" | "small"; appearance?: "colorful" | "black" | "white"; iconOnly?: boolean; fullWidth?: boolean; children?: ReactNode; className?: string }\n// SocialButtonProps: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "color"> & { href?: never; ref?: Ref<HTMLButtonElement> }\n// SocialButtonLinkProps: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "color"> & { href: string; ref?: Ref<HTMLAnchorElement> }\nconst SOCIAL_PROVIDERS: Record<SocialProvider, { label: string; brand: string; viewBox: string; path: string }>',

  props: [
    { name: 'brand', type: 'SocialProvider | "custom"', description: 'Required. One of 24 providers (google, apple, github, gitlab, microsoft, x, facebook, linkedin, discord, slack, figma, notion, dropbox, spotify, twitch, reddit, tiktok, instagram, telegram, whatsapp, amazon, bitbucket, auth0, okta) or `custom`.' },
    { name: 'appearance', type: '"colorful" | "black" | "white"', default: '"colorful"', description: 'Brand-colour gradient with a white glyph, solid black, or the outlined surface with the full-colour mark.' },
    { name: 'size', type: '"medium" | "small"', default: '"medium"', description: '36px tall and 300px wide, or 32px and 250px.' },
    { name: 'iconOnly', type: 'boolean', default: 'false', description: 'Square logo-only button. The label moves to `aria-label`.' },
    { name: 'fullWidth', type: 'boolean', default: 'false', description: 'Fill the container instead of the fixed width.' },
    { name: 'config', type: '{ icon: ReactNode; label?: string; color?: string }', description: 'Required for `brand="custom"`, ignored otherwise.' },
    { name: 'href', type: 'string', description: 'Renders an `<a>` instead of a `<button>`, for OAuth redirects.' },
    { name: 'children', type: 'ReactNode', default: '"Continue with <Label>"', description: 'Overrides the visible label.' },
  ],

  reducedMotion:
    'The press scale from `button-press-motion` is removed under `prefers-reduced-motion: reduce`. Hover still brightens or changes the fill, because that colour feedback carries meaning and does not move anything.',

  cleanup:
    'Nothing to clean up. The component is stateless markup with no listeners, timers or effects.',

  acceptance:
    'The outlined stack shows Google\'s four-colour G, Apple and GitHub marks that turn white in dark mode, and three equal-width rows reading "Continue with …". The filled column shows Google in the kit\'s exact primary-button blue, Discord in its own purple, slightly darker at the bottom edge, and Apple in solid black. Hover brightens Discord without a colour jump. Icon-only buttons are 36px squares, and a screen reader announces "Continue with GitHub". At 360px wide nothing overflows the frame.',

  criticalRegion: 'critical',
};

export default meta;
