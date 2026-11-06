# Build: Docs Callout

The aside a docs page drops between paragraphs: a softly tinted, bordered box with a coloured icon chip, a bold title and body copy that styles inline `code` and links. Info is blue, tip lime, warning yellow and danger rose, all from the kit status tokens so both themes stay legible. A dismissible callout shows a close button and folds its row shut before it unmounts.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Docs callout in four variants (note, tip, warning, danger) with a tinted icon chip, title, rich body and an optional collapsing dismiss.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Each variant maps to one status token pair: the surface is `bg-status-*-background/45` with a `border-status-*-text/20` hairline, and the 24px icon chip uses the full-strength background with the status text colour. The title defaults to the variant label; a custom title keeps the label for screen readers as an `sr-only` "Warning: " prefix.
2. The box is `role="note"` labelled by its title, which is the ARIA role for a parenthetical aside; it is never `alert`, because docs callouts are static content.
3. The body gets descendant styles through arbitrary variants (`[&_code]:`, `[&_a]:`, `[&_p+p]:`), so MDX or plain JSX children pick up code chips, underlined links and paragraph spacing without extra components.
4. Dismiss runs a three-phase state: pressing close calls `onDismiss` immediately (so the caller can move focus), then the wrapper goes to "leaving": `inert`, `grid-rows-[0fr]`, `opacity-0` and `-translate-y-1` over 200ms. A 200ms timeout in an effect flips it to "gone" and the component returns null. With reduced motion it skips straight to "gone".

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `surface tint = status background at 45%, border at 20% of status text`
  Reads as a coloured note in both themes without competing with the page heading.
- `exit = 200ms ease-out, grid rows 1fr to 0fr`
  Short enough to feel like a direct response; collapsing the row lets the content below slide up instead of jumping.
- `icon chip = 24px, rounded-lg, 16px glyph`
  Matches the close button size so the first line aligns on both edges.

## API

```ts
function DocsCallout(props: { variant?: "info" | "tip" | "warning" | "danger"; title?: ReactNode; children?: ReactNode; icon?: IconComponent | null; dismissible?: boolean; onDismiss?: () => void; dismissLabel?: string; className?: string }): JSX.Element | null
```

- `variant: "info" | "tip" | "warning" | "danger"` — default `"info"`
  Colour, icon and default title.
- `title: ReactNode` — default `"Note" / "Tip" / "Warning" / "Danger"`
  Heading; a custom one keeps the variant name as an sr-only prefix.
- `children: ReactNode`
  Body copy; inline `code`, links and paragraphs are styled.
- `icon: IconComponent | null`
  Replaces the variant icon; `null` hides the chip.
- `dismissible: boolean` — default `false`
  Shows a close button that collapses and unmounts the callout.
- `onDismiss: () => void`
  Called on press, before the exit animation; move focus here.
- `dismissLabel: string` — default `"Dismiss <variant>"`
  Accessible name of the close button.
- `className: string`
  Merged onto the outer wrapper.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Dismiss: "shown" -> "leaving" (row collapses 1fr -> 0fr while fading, content inert)
// -> "gone" (unmounted). Reduced motion skips straight to "gone". onDismiss runs on
// press so the caller can move focus before the close button disappears.
const [phase, setPhase] = useState<"shown" | "leaving" | "gone">("shown");

useEffect(() => {
  if (phase !== "leaving") return;
  const t = window.setTimeout(() => setPhase("gone"), LEAVE_MS);
  return () => window.clearTimeout(t);
}, [phase]);

const dismiss = () => {
  if (phase !== "shown") return;
  onDismiss?.();
  setPhase(reduced ? "gone" : "leaving");
};

const leaving = phase === "leaving";
const wrapperClass = cx(
  "grid transition-[grid-template-rows,opacity,translate] duration-200 ease-out motion-reduce:transition-none",
  leaving ? "-translate-y-1 grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
  className,
);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The only timer is the 200ms leaving timeout, set in an effect keyed on the phase and cleared in its cleanup, so unmounting mid-exit leaves nothing running.

**Reduced motion.** With `prefers-reduced-motion` the component skips the leaving phase and unmounts at once (`useReducedMotion`), and the wrapper transition carries `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `role="alert"` for danger callouts. Screen readers interrupt to announce static docs text on page load; `role="note"` is the right semantics.
- Unmounting on press with no focus plan. The focused close button vanishes and focus falls to `<body>`; use `onDismiss` to move focus to a nearby control.
- Animating `height: auto` with JS measurements. Transitioning `grid-template-rows` from 1fr to 0fr collapses to zero with pure CSS.
- Relying on colour alone for the variant. The title (or the sr-only prefix) names it in words.

## Notes

- The callout keeps its own dismissed state. To bring it back, remount it (change its `key`), as the demo's Restore button does.
- `className` lands on the outer wrapper, so grid placement and margins work; pass `icon={null}` to drop the chip.

## Definition of done

The demo shows Note, Tip, "Captions are for labels" (warning) and Danger callouts in a two-column grid that stacks to one column on phones. Each is a `role="note"` named by its title. Pressing "Dismiss tip" moves focus to Restore, the tip folds away within about 200ms and Restore reads "Restore (1)"; dismissing the warning makes it "Restore (2)". Pressing Restore brings both back and the button returns to "Restore", aria-disabled.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
