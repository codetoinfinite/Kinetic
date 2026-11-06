import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'theme-toggle',
  title: 'Theme Toggle',
  category: 'action',
  kit: 'boardui',
  tags: ['theme', 'dark-mode', 'view-transition', 'switch', 'segmented', 'boardui'],
  blurb:
    'Light and dark switch that reveals the new theme in a soft circle growing from the click point, using the View Transition API.',
  cost: 'dom',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/theme-toggle.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A manual light and dark control in four skins (a sidebar switch row, a sun and moon segmented pill, a sidebar-surface pill and a glass pill for hero navs) plus a collapsed icon button. Choosing a theme starts a View Transition: the browser snapshots the old page, the theme class flips synchronously, and the new page is revealed through a blurred circular mask that expands from the pointer to past the farthest corner of the viewport. Theme state is read from the `<html>` class with `useSyncExternalStore`, so every toggle on the page, and the host site\'s own toggle, stay in sync.',

  mechanism: [
    '`applyTheme(theme)` is the single writer: it toggles `.dark` and `.light` on `<html>`, stores the choice under `kinetic-theme` in `localStorage` (inside a `try`, so blocked storage does not break the control) and dispatches a `kinetic:theme-change` event.',
    '`useThemeMode()` is `useSyncExternalStore` over the `<html>` class. Its `subscribe` listens three ways: a `MutationObserver` on the `class` attribute (catches any other code flipping the theme), the custom event, and the `storage` event (another tab changed the theme, which is re-applied here without persisting). The server snapshot is `"light"`, so hydration never mismatches.',
    '`applyThemeWithTransition` computes the origin (the pointer position, or the control\'s centre for keyboard clicks, which report `clientX` and `clientY` of 0), clamps it to the viewport, and takes `radius = hypot(max(x, W − x), max(y, H − y))`, the distance to the farthest corner.',
    'It then injects a `<style>` that gives `::view-transition-new(root)` a mask: an SVG data URL of a white circle (r = 42 in a 100 box) softened by `feGaussianBlur stdDeviation 2`. A keyframe grows `mask-size` from 0 to `radius × 2.5` while keeping the mask centred on the origin, over 820ms with `cubic-bezier(0.16, 1, 0.3, 1)`. The theme sheet turns off the default crossfade and stacks new above old.',
    '`startViewTransition(() => flushSync(() => applyTheme(theme)))` matters. React must commit the new theme synchronously inside the callback, or the browser captures the "after" snapshot before React has re-rendered and the circle reveals the old palette. `.theme-transitioning` on `<html>` sets `transition: none` everywhere for the duration so no component is caught mid-fade.',
    'A module-level `themeTransitionRunning` flag drops clicks while a reveal is in flight, and `finally` removes the style tag and the class. When the API is missing or the user prefers reduced motion, the theme changes instantly instead.',
    'The segmented skins are a `role="group"` labelled "Theme" with two `aria-pressed` buttons and an `aria-hidden` thumb that slides 36px (26px when small) with a 200ms transform, flipped with `rtl:` variants. The default skin is a React Aria `Switch` labelled "Dark mode" that records the pointer position on `pointerdown`, because its `onChange` carries no coordinates.',
  ],

  constants: [
    {
      name: 'THEME_TRANSITION_DURATION',
      value: '820ms',
      why: 'Long enough for the circle edge to be seen travelling across a full-screen dashboard, and short enough that the theme feels changed rather than loading. Overridable per instance with `transitionDuration`.',
    },
    {
      name: 'THEME_TRANSITION_EASING',
      value: 'cubic-bezier(0.16, 1, 0.3, 1)',
      why: 'A strong ease-out: the circle leaves the click point fast, so the response feels immediate, then decelerates as it sweeps the far corners, where nothing is being looked at.',
    },
    {
      name: 'final mask size',
      value: 'radius × 2.5',
      why: 'The mask circle has radius 42 in a 100 box, so at 2.5 × radius its visible radius is 1.05 × the distance to the farthest corner. The extra 5% lets the blurred edge clear the corner fully before the transition ends.',
    },
    {
      name: 'mask blur',
      value: 'feGaussianBlur stdDeviation 2 (of 100)',
      why: 'Softens the reveal edge in proportion to the circle, so it stays a gentle gradient at any viewport size instead of a hard wipe line.',
    },
    {
      name: 'THEME_STORAGE_KEY',
      value: '"kinetic-theme"',
      why: 'Shared with the host site\'s header toggle and pre-hydration script, so both controls read and write one preference and the page loads in the right theme without a flash.',
    },
  ],

  pitfalls: [
    'Calling `applyTheme` inside `startViewTransition` without `flushSync`. The browser takes the new snapshot before React commits, so the circle reveals the old theme and the page then snaps.',
    'Leaving colour transitions running during the reveal. Without `.theme-transitioning` (transition: none) the captured "new" frame shows components halfway through fading, and the circle exposes a blend of both palettes.',
    'Using a `clip-path` circle with a hard edge instead of the blurred mask. It works, but reads as a wipe; the softness is the effect.',
    'Mounting the control without the pre-hydration theme script. The mount effect re-applies the stored theme, but only after first paint, so users with a stored preference see a one-frame flash.',
    'Treating clicks at (0, 0) as real coordinates. Keyboard activation reports `clientX = clientY = 0`, which would start every keyboard toggle from the top-left corner. The component falls back to the control\'s centre.',
    'Reading the operating-system theme as well. This control is manual on purpose; mixing in `prefers-color-scheme` makes the toggle appear to do nothing for users whose OS already matches.',
  ],

  notes: [
    'The `.dark` and `.light` class names and the storage key are wired to Kinetic\'s theme script. In another project, change `applyTheme` and the key to match your own theme switch.',
    'Clicking the toggle in this demo changes the theme of the whole site, because it is the same preference the header toggle uses.',
    'The default `sidebar` skin depends on the kit\'s Switch item for its track, which is installed alongside.',
  ],

  apiSignature:
    'function ThemeToggle(props: { collapsed?: boolean; appearance?: "sidebar" | "segmented" | "sidebar-segmented" | "glass-segmented"; className?: string; size?: "small" | "medium"; transitionDuration?: number }): JSX.Element\nfunction applyTheme(theme: ThemeMode, options?: { persist?: boolean }): void\nfunction applyThemeWithTransition(theme: ThemeMode, options?: { origin?: { x: number; y: number } | null; element?: HTMLElement | null; duration?: number }): Promise<void>\nfunction useThemeMode(): ThemeMode\ntype ThemeMode = "light" | "dark"\nconst THEME_STORAGE_KEY = "kinetic-theme"\nconst THEME_CHANGE_EVENT = "kinetic:theme-change"',

  props: [
    { name: 'appearance', type: '"sidebar" | "segmented" | "sidebar-segmented" | "glass-segmented"', default: '"sidebar"', description: 'A "Dark mode" switch row, a sun and moon pill on the secondary surface, the same pill on the sidebar surface, or a transparent pill with literal black and white for a hero nav.' },
    { name: 'size', type: '"small" | "medium"', default: '"medium"', description: 'Segmented skins only: 24px segments (fits a dropdown row) or 32px. Ignored by `glass-segmented`.' },
    { name: 'collapsed', type: 'boolean', default: 'false', description: 'With the default `sidebar` appearance, render a single 36px icon button for a collapsed sidebar rail.' },
    { name: 'transitionDuration', type: 'number', default: '820', description: 'Duration of the circular reveal in milliseconds.' },
    { name: 'className', type: 'string', description: 'Merged onto the outer element of whichever skin renders.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion: reduce` the View Transition is skipped and the theme changes instantly. The segmented thumb still slides over 200ms because it is a small, local indicator of the selected option.',

  cleanup:
    'The `useSyncExternalStore` subscription disconnects its `MutationObserver` and removes its `kinetic:theme-change` and `storage` listeners on unmount. Each transition removes its injected `<style>` and the `.theme-transitioning` class in a `finally`, so an aborted transition leaves nothing behind.',

  acceptance:
    'Clicking the moon in the segmented pill slides the thumb and reveals the dark theme in a soft-edged circle that grows from the cursor until it covers the screen, with no flash or crossfade. Clicking the sun reverses it from the new click point. Activating with the keyboard starts the circle from the control\'s centre. All toggles in the demo, and the site header toggle, change together. With reduced motion turned on the theme switches instantly. Rapid double clicks do not stack two reveals.',

  criticalRegion: 'critical',
};

export default meta;
