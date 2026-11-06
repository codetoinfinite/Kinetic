# Build: Device Preview Frame

A rounded app-window frame (three chrome dots, a lock-and-address pill, a refresh glyph) around a screen that shows real content laid out at a device width: 1280px for desktop, 768 for tablet, 375 for mobile, scaled down to fit the space. A segmented Desktop / Tablet / Mobile toggle above it narrows or widens the frame, and the content reflows continuously while it does, like dragging a window edge. Because the screen is a size container named `frame`, children respond with `@…/frame:` container queries.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Browser-window frame that lays any content out at a device width and scales it in; a Desktop/Tablet/Mobile toggle resizes it live.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. One virtual width `p` drives the whole fit. With `available` the measured row width, the scale is `s = min(1, (available − 16) / p)`; the frame is set to `p · s + 16` px wide (16 = frame border, padding and screen border), the content box to `p` px wide and `height / s` px tall, with `scale: s` from its top-left corner. Content therefore always fills the screen exactly, and a narrow device is shown at up to 1:1 instead of shrinking with the desktop.
2. Device switch: a rAF loop tweens `p` from the old device width to the new one over 560ms with `easeOutQuart` and writes the four styles straight to the DOM each frame, with no React re-render. Frame width and content width derive from the same number, so they cannot drift apart mid-animation the way two independent CSS transitions would when the scale also changes.
3. `available` comes from a ResizeObserver content box on the row that holds the frame: layout pixels, unaffected by transforms, so the fit is correct inside CSS-scaled previews. Resizing the page re-applies the fit at the current `p` (mid-tween included).
4. Toggle: the kit `SegmentedControl` (react-aria ToggleButtonGroup with a sliding thumb). It works controlled (`device` plus `onDeviceChange`) or uncontrolled (`defaultDevice`). The root carries `data-device` for styling and tests.
5. The screen scrolls vertically inside the frame (`overflow-y-auto`, `overscroll-contain`), so tall pages can be explored without scrolling the host page.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `device widths = 1280 / 768 / 375 px`
  Common laptop, portrait tablet and phone CSS widths; each hits a different container-query step in typical layouts.
- `tween = 560ms easeOutQuart`
  Most of the reflow happens in the first third, so the result is readable quickly while the frame settles softly.
- `chrome = 16px horizontal`
  Border + 6px padding + screen border; subtracted before computing the scale so content never overflows the screen.
- `max scale = 1`
  Content is never enlarged; a phone width in a wide container is shown at true size.

## API

```ts
function DevicePreviewFrame(props: { children: ReactNode; device?: "desktop" | "tablet" | "mobile"; defaultDevice?: PreviewDevice; onDeviceChange?: (device: PreviewDevice) => void; widths?: Partial<Record<PreviewDevice, number>>; height?: number; url?: string; showToggle?: boolean; toolbar?: ReactNode; className?: string }): JSX.Element
```

- `children: ReactNode`
  Content laid out at the device width; may use `@…/frame:` container queries.
- `device: "desktop" | "tablet" | "mobile"`
  Controlled device.
- `defaultDevice: PreviewDevice` — default `"desktop"`
  Initial device when uncontrolled.
- `onDeviceChange: (device) => void`
  Called when the toggle changes.
- `widths: Partial<Record<PreviewDevice, number>>`
  Override device CSS widths.
- `height: number` — default `420`
  Visible screen height in px, constant across devices.
- `url: string` — default `"app.example.com"`
  Text in the address pill.
- `showToggle: boolean` — default `true`
  Show the device toggle.
- `toolbar: ReactNode`
  Extra controls beside the toggle.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * One number drives everything: `p`, the virtual width the content is laid out
 * at. For a given p the screen scale is s = min(1, (available - chrome) / p),
 * the frame is p * s + chrome wide and the content box is p wide, scaled by s,
 * and height / s tall so it always fills the screen. Switching device tweens p
 * from the old width to the new one in a rAF loop that writes those styles
 * straight to the DOM, so the page inside reflows continuously like a window
 * being resized and frame and content can never drift apart mid-animation.
 * `available` comes from a ResizeObserver content box: layout pixels, which
 * stay correct inside CSS-scaled previews where rects would not.
 */
function useDeviceFit(targetWidth: number, height: number, reduced: boolean) {
  const measureRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fit = useRef({ p: targetWidth, available: 0, raf: 0, height });
  fit.current.height = height;

  const apply = () => {
    const { p, available, height: h } = fit.current;
    const frame = frameRef.current;
    const content = contentRef.current;
    if (!frame || !content || available <= CHROME_X) return;
    const s = Math.min(1, (available - CHROME_X) / p);
    frame.style.width = `${p * s + CHROME_X}px`;
    content.style.width = `${p}px`;
    content.style.height = `${h / s}px`;
    content.style.scale = String(s);
  };

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const box = entry?.contentBoxSize?.[0];
      fit.current.available = box ? box.inlineSize : el.clientWidth;
      apply();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const state = fit.current;
    cancelAnimationFrame(state.raf);
    const from = state.p;
    if (reduced || from === targetWidth || state.available === 0) {
      state.p = targetWidth;
      apply();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION));
      state.p = from + (targetWidth - from) * easeOutQuart(t);
      apply();
      if (t < 1) state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(state.raf);
  }, [targetWidth, reduced, height]);

  return { measureRef, frameRef, contentRef };
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The ResizeObserver disconnects on unmount, and any running animation frame is cancelled when the device changes again or the frame unmounts.

**Reduced motion.** The device switch applies the new width at once (no tween); the kit SegmentedControl drops its thumb slide under the same preference.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating the frame width and the content scale as two CSS transitions. When both the virtual width and the scale change, their product is not linear in time and the content overflows or leaves a gap mid-animation. Derive both from one tweened width.
- Fitting with `getBoundingClientRect`: inside a scaled parent it returns scaled sizes and the computed scale compounds. Measure layout boxes.
- Using `md:`/`lg:` media queries inside the previewed content. They follow the real window, not the frame; use `@…/frame:` container queries.
- Using `transform: scale()` on the content while it also has its own transforms; the standalone `scale` property composes cleanly.

## Notes

- The demo previews a small dashboard: sidebar and two-column body at desktop, sidebar gone at tablet, single column at mobile.
- Pass `showToggle={false}` with a controlled `device` to drive it from elsewhere, e.g. the tabs of a template showcase.
- `DEVICE_WIDTHS` is exported, and `widths` overrides any of them.

## Definition of done

At 1280px the frame fills the row and shows the dashboard with a sidebar and a two-column body. Choosing Tablet narrows the frame over about half a second while the content reflows: the sidebar disappears and the body stacks. Mobile narrows it further to a single column at true 375px width. Desktop restores it. At 360px the frame still fits, just smaller. Light and dark both read.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
