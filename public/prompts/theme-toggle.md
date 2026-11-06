# Build: Theme Toggle

A manual light and dark control in four skins (a sidebar switch row, a sun and moon segmented pill, a sidebar-surface pill and a glass pill for hero navs) plus a collapsed icon button. Choosing a theme starts a View Transition: the browser snapshots the old page, the theme class flips synchronously, and the new page is revealed through a blurred circular mask that expands from the pointer to past the farthest corner of the viewport. Theme state is read from the `<html>` class with `useSyncExternalStore`, so every toggle on the page, and the host site's own toggle, stay in sync.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Light and dark switch that reveals the new theme in a soft circle growing from the click point, using the View Transition API.

- Category: action
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. `applyTheme(theme)` is the single writer: it toggles `.dark` and `.light` on `<html>`, stores the choice under `kinetic-theme` in `localStorage` (inside a `try`, so blocked storage does not break the control) and dispatches a `kinetic:theme-change` event.
2. `useThemeMode()` is `useSyncExternalStore` over the `<html>` class. Its `subscribe` listens three ways: a `MutationObserver` on the `class` attribute (catches any other code flipping the theme), the custom event, and the `storage` event (another tab changed the theme, which is re-applied here without persisting). The server snapshot is `"light"`, so hydration never mismatches.
3. `applyThemeWithTransition` computes the origin (the pointer position, or the control's centre for keyboard clicks, which report `clientX` and `clientY` of 0), clamps it to the viewport, and takes `radius = hypot(max(x, W − x), max(y, H − y))`, the distance to the farthest corner.
4. It then injects a `<style>` that gives `::view-transition-new(root)` a mask: an SVG data URL of a white circle (r = 42 in a 100 box) softened by `feGaussianBlur stdDeviation 2`. A keyframe grows `mask-size` from 0 to `radius × 2.5` while keeping the mask centred on the origin, over 820ms with `cubic-bezier(0.16, 1, 0.3, 1)`. The theme sheet turns off the default crossfade and stacks new above old.
5. `startViewTransition(() => flushSync(() => applyTheme(theme)))` matters. React must commit the new theme synchronously inside the callback, or the browser captures the "after" snapshot before React has re-rendered and the circle reveals the old palette. `.theme-transitioning` on `<html>` sets `transition: none` everywhere for the duration so no component is caught mid-fade.
6. A module-level `themeTransitionRunning` flag drops clicks while a reveal is in flight, and `finally` removes the style tag and the class. When the API is missing or the user prefers reduced motion, the theme changes instantly instead.
7. The segmented skins are a `role="group"` labelled "Theme" with two `aria-pressed` buttons and an `aria-hidden` thumb that slides 36px (26px when small) with a 200ms transform, flipped with `rtl:` variants. The default skin is a React Aria `Switch` labelled "Dark mode" that records the pointer position on `pointerdown`, because its `onChange` carries no coordinates.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `THEME_TRANSITION_DURATION = 820ms`
  Long enough for the circle edge to be seen travelling across a full-screen dashboard, and short enough that the theme feels changed rather than loading. Overridable per instance with `transitionDuration`.
- `THEME_TRANSITION_EASING = cubic-bezier(0.16, 1, 0.3, 1)`
  A strong ease-out: the circle leaves the click point fast, so the response feels immediate, then decelerates as it sweeps the far corners, where nothing is being looked at.
- `final mask size = radius × 2.5`
  The mask circle has radius 42 in a 100 box, so at 2.5 × radius its visible radius is 1.05 × the distance to the farthest corner. The extra 5% lets the blurred edge clear the corner fully before the transition ends.
- `mask blur = feGaussianBlur stdDeviation 2 (of 100)`
  Softens the reveal edge in proportion to the circle, so it stays a gentle gradient at any viewport size instead of a hard wipe line.
- `THEME_STORAGE_KEY = "kinetic-theme"`
  Shared with the host site's header toggle and pre-hydration script, so both controls read and write one preference and the page loads in the right theme without a flash.

## API

```ts
function ThemeToggle(props: { collapsed?: boolean; appearance?: "sidebar" | "segmented" | "sidebar-segmented" | "glass-segmented"; className?: string; size?: "small" | "medium"; transitionDuration?: number }): JSX.Element
function applyTheme(theme: ThemeMode, options?: { persist?: boolean }): void
function applyThemeWithTransition(theme: ThemeMode, options?: { origin?: { x: number; y: number } | null; element?: HTMLElement | null; duration?: number }): Promise<void>
function useThemeMode(): ThemeMode
type ThemeMode = "light" | "dark"
const THEME_STORAGE_KEY = "kinetic-theme"
const THEME_CHANGE_EVENT = "kinetic:theme-change"
```

- `appearance: "sidebar" | "segmented" | "sidebar-segmented" | "glass-segmented"` — default `"sidebar"`
  A "Dark mode" switch row, a sun and moon pill on the secondary surface, the same pill on the sidebar surface, or a transparent pill with literal black and white for a hero nav.
- `size: "small" | "medium"` — default `"medium"`
  Segmented skins only: 24px segments (fits a dropdown row) or 32px. Ignored by `glass-segmented`.
- `collapsed: boolean` — default `false`
  With the default `sidebar` appearance, render a single 36px icon button for a collapsed sidebar rail.
- `transitionDuration: number` — default `820`
  Duration of the circular reveal in milliseconds.
- `className: string`
  Merged onto the outer element of whichever skin renders.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function installThemeTransitionStyle(
  { x, y }: ThemeTransitionOrigin,
  radius: number,
  duration: number,
) {
  document.getElementById(THEME_TRANSITION_STYLE_ID)?.remove();

  const mask = createBlurCircleMask();
  const finalMaskSize = radius * 2.5;
  const finalMaskX = x - finalMaskSize / 2;
  const finalMaskY = y - finalMaskSize / 2;
  const style = document.createElement("style");
  style.id = THEME_TRANSITION_STYLE_ID;
  style.textContent = `
    ::view-transition-new(root) {
      -webkit-mask-image: ${mask};
      mask-image: ${mask};
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      animation: boardui-theme-mask-reveal ${duration}ms ${THEME_TRANSITION_EASING} both;
      transform-origin: ${x}px ${y}px;
      will-change: -webkit-mask-size, -webkit-mask-position, mask-size, mask-position;
    }

    @keyframes boardui-theme-mask-reveal {
      from {
        -webkit-mask-position: ${x}px ${y}px;
        mask-position: ${x}px ${y}px;
        -webkit-mask-size: 0px 0px;
        mask-size: 0px 0px;
      }
      to {
        -webkit-mask-position: ${finalMaskX}px ${finalMaskY}px;
        mask-position: ${finalMaskX}px ${finalMaskY}px;
        -webkit-mask-size: ${finalMaskSize}px ${finalMaskSize}px;
        mask-size: ${finalMaskSize}px ${finalMaskSize}px;
      }
    }
  `;
  document.head.appendChild(style);
  return style;
}

/** null when nothing is stored, so mounting never overrides the page's default. */
function storedTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: ThemeMode, { persist = true }: { persist?: boolean } = {}) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  // Kinetic is dark on :root and keys its light theme off `.light`.
  document.documentElement.classList.toggle("light", theme === "light");
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The control remains usable when storage is blocked or unavailable.
    }
  }
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

function elementCenter(element: HTMLElement | null): ThemeTransitionOrigin {
  if (!element) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function normalizedOrigin(
  origin: ThemeTransitionOrigin | null,
  element: HTMLElement | null,
): ThemeTransitionOrigin {
  const fallback = elementCenter(element);
  const x = origin?.x ?? fallback.x;
  const y = origin?.y ?? fallback.y;
  return {
    x: Math.min(Math.max(x, 0), window.innerWidth),
    y: Math.min(Math.max(y, 0), window.innerHeight),
  };
}

/**
 * Reveals the next theme from the interaction point using the View Transition
 * API. Keyboard activation starts at the control's center. Unsupported
 * browsers and reduced-motion users receive the same immediate theme change.
 */
export async function applyThemeWithTransition(
  theme: ThemeMode,
  {
    origin = null,
    element = null,
    duration = THEME_TRANSITION_DURATION,
  }: {
    origin?: ThemeTransitionOrigin | null;
    element?: HTMLElement | null;
    duration?: number;
  } = {},
) {
  if (typeof document === "undefined" || currentTheme() === theme) return;

  const transitionDocument = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!transitionDocument.startViewTransition || reduceMotion) {
    applyTheme(theme);
    return;
  }
  if (themeTransitionRunning) return;

  const { x, y } = normalizedOrigin(origin, element);
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  themeTransitionRunning = true;
  document.documentElement.classList.add("theme-transitioning");
  const transitionStyle = installThemeTransitionStyle({ x, y }, radius, duration);
  try {
    const transition = transitionDocument.startViewTransition(() => {
      flushSync(() => applyTheme(theme));
    });

    await transition.ready;
    await transition.finished;
  } catch {
    // If the browser aborts a transition mid-flight, the theme still changes.
    if (currentTheme() !== theme) applyTheme(theme);
  } finally {
    transitionStyle.remove();
    document.documentElement.classList.remove("theme-transitioning");
    themeTransitionRunning = false;
  }
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The `useSyncExternalStore` subscription disconnects its `MutationObserver` and removes its `kinetic:theme-change` and `storage` listeners on unmount. Each transition removes its injected `<style>` and the `.theme-transitioning` class in a `finally`, so an aborted transition leaves nothing behind.

**Reduced motion.** With `prefers-reduced-motion: reduce` the View Transition is skipped and the theme changes instantly. The segmented thumb still slides over 200ms because it is a small, local indicator of the selected option.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Calling `applyTheme` inside `startViewTransition` without `flushSync`. The browser takes the new snapshot before React commits, so the circle reveals the old theme and the page then snaps.
- Leaving colour transitions running during the reveal. Without `.theme-transitioning` (transition: none) the captured "new" frame shows components halfway through fading, and the circle exposes a blend of both palettes.
- Using a `clip-path` circle with a hard edge instead of the blurred mask. It works, but reads as a wipe; the softness is the effect.
- Mounting the control without the pre-hydration theme script. The mount effect re-applies the stored theme, but only after first paint, so users with a stored preference see a one-frame flash.
- Treating clicks at (0, 0) as real coordinates. Keyboard activation reports `clientX = clientY = 0`, which would start every keyboard toggle from the top-left corner. The component falls back to the control's centre.
- Reading the operating-system theme as well. This control is manual on purpose; mixing in `prefers-color-scheme` makes the toggle appear to do nothing for users whose OS already matches.

## Notes

- The `.dark` and `.light` class names and the storage key are wired to Kinetic's theme script. In another project, change `applyTheme` and the key to match your own theme switch.
- Clicking the toggle in this demo changes the theme of the whole site, because it is the same preference the header toggle uses.
- The default `sidebar` skin depends on the kit's Switch item for its track, which is installed alongside.

## Definition of done

Clicking the moon in the segmented pill slides the thumb and reveals the dark theme in a soft-edged circle that grows from the cursor until it covers the screen, with no flash or crossfade. Clicking the sun reverses it from the new click point. Activating with the keyboard starts the circle from the control's centre. All toggles in the demo, and the site header toggle, change together. With reduced motion turned on the theme switches instantly. Rapid double clicks do not stack two reveals.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
