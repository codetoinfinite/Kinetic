# Build: Agent Creator

An agent setup card. The top half is a paper-cut avatar ringed by sixteen face options, with nine shapes on an arc underneath that rotates to bring the chosen one into its socket, and a colour pill that recolours every piece of paper. Below it, grouped fields collect the name, label, description, model, tools, language, notifications, voice and playback speed. Create validates the draft, awaits onCreate, and swaps to a created summary with Edit details and Create another.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A create-an-agent card: paper avatar with a face ring and shape arc, colour pill, profile, tools and voice fields, then a created summary.

- Category: form
- Runtime cost: dom
- Dependencies: motion@^12.43.0, @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. Faces sit on a circle of radius 104px around the avatar at 22.5° steps; shapes sit on a 162px arc below it, each tile placed by its wrapped offset k from the selected index (θ = 90° − 24°·k), so picking a shape slides the arc with a CSS transform transition.
2. Faces, shapes and colours are radiogroups with a roving tabindex: arrow keys and Home/End move the selection and focus together, so a keyboard user can turn the arc without a pointer.
3. The avatar is SVG paper: the silhouette drawn twice (a 28% darker copy offset 2.5/3.5 units for the cut edge), a feTurbulence speckle filter clipped to the shape alpha for grain, and ink features drawn in a fixed dark tone because they sit on paper, not on the page.
4. validateAgent(draft) returns per-field errors. They appear only after the first Create, update live while typing, and the first invalid field receives focus; a footer line counts what is left to fix.
5. Submit sets a submitting state, awaits onCreate, and guards against unmount with a mounted ref; a rejection keeps the form and shows its message, success swaps to the summary and focuses its heading.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `FACE_R = 104`
  Clears the 136px avatar with room for 32px face discs without touching the shape arc.
- `SHAPE_R = 162`
  Hangs the arc under the face ring; five visible tiles span about 270px, inside the 320px stage.
- `SHAPE_STEP_DEG = 24`
  Spacing between neighbouring shapes on the arc; wider steps push the outer tiles off the card.
- `SHAPE_VISIBLE = 2`
  Tiles with |k| greater than 2 fade out and stop taking pointer input.

## API

```ts
<AgentCreator defaultValue={{ name: "Cloud engineer" }} onCreate={async (draft) => save(draft)} onReset={() => {}} />
```

- `value: AgentDraft`
  Controlled draft. Pair with onChange.
- `defaultValue: Partial<AgentDraft>`
  Uncontrolled starting draft merged over DEFAULT_AGENT_DRAFT; Reset restores it.
- `onChange: (draft: AgentDraft) => void`
  Called on every field, face, shape or colour change.
- `onCreate: (draft: AgentDraft) => void | Promise<void>`
  Called with a valid draft. A promise shows the creating state; a rejection shows its message.
- `onReset: () => void`
  Called after Reset or Create another.
- `models / tools / languages / voices / speeds: readonly AgentOption[]`
  Option lists for the selects, tool chips and speed control.
- `colors: readonly AgentColor[]` — default `AGENT_COLORS`
  Preset paper colours; a custom colour input sits at the end.
- `submitLabel: string` — default `"Create agent"`
  Primary button text.
- `className: string`
  Classes on the card, e.g. a fixed height so the body scrolls.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Field-level problems with a draft; an empty object means it can be created. */
export function validateAgent(draft: AgentDraft): AgentErrors {
  const errors: AgentErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Give the agent a name.";
  else if (name.length < 2) errors.name = "Use at least 2 characters.";
  else if (name.length > 40) errors.name = "Keep the name under 40 characters.";
  const label = draft.label.trim();
  if (!label) errors.label = "Add a short label.";
  else if (label.length > 16) errors.label = "Labels fit 16 characters.";
  if (draft.description.trim().length < 12) errors.description = "Say what it helps with (12+ characters).";
  if (draft.tools.length === 0) errors.tools = "Pick at least one tool.";
  return errors;
}

/** Place shape `index` on the arc relative to the selected one; k wraps to -n/2..n/2. */
function arcSlot(index: number, selected: number, count: number) {
  let k = (index - selected + count) % count;
  if (k > count / 2) k -= count;
  const theta = ((90 - k * SHAPE_STEP_DEG) * Math.PI) / 180;
  const visible = Math.abs(k) <= SHAPE_VISIBLE;
  return {
    k,
    visible,
    x: CX + SHAPE_R * Math.cos(theta) - TILE / 2,
    y: CY + SHAPE_R * Math.sin(theta) - TILE / 2,
    scale: k === 0 ? 1 : visible ? 0.86 : 0.5,
  };
}

/** Roving-tabindex arrow handling shared by the face ring and shape arc. */
function rovingIndex(event: KeyboardEvent, index: number, count: number): number | null {
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The only async work is the awaited onCreate; a mounted ref drops its result after unmount. Motion loops stop with their elements. The demo clears its pending save timers on unmount.

**Reduced motion.** The avatar stops floating and blinking, the pop on pick is skipped, the shape arc and face hover snap without transitions, and the created summary appears without its rise.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Ink stays dark in both themes on purpose; it is drawn on the coloured paper, not on the page background.
- Each PaperAvatar builds its grain filter id from useId, stripped of colons, so several avatars on one page never share a filter.
- The shape arc wraps: a tile moving from k = −4 to k = 4 crosses the arc while invisible, so only visible tiles take pointer input.

## Notes

- Pass value + onChange to drive the draft yourself; defaultValue seeds the uncontrolled draft and is what Reset returns to.
- Export validateAgent to run the same checks on the server.

## Definition of done

Clearing the name and pressing Create shows "Give the agent a name." and focuses the field; a valid draft shows Creating… then "<name> is ready"; Create another restores the starting draft; arrow keys on the face ring and shape arc change the avatar.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
