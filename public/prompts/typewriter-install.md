# Build: Typewriter Install

The install line of a landing page: a small card with package-manager tabs on top and a monospace command below that appears one character at a time behind an accent caret, then idles with the caret blinking. Switching tabs swaps the command and types it again from the start; the copy button copies the whole command at any moment and confirms with a check. Screen readers get the full command at once, and reduced motion shows it fully typed.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An install command that types itself behind a caret; pnpm, npm, yarn and bun tabs restart the typing and a copy button takes the full line.

- Category: display
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. Render a react-aria `Tabs` with one `Tab` and one `TabPanel` per command (`installCommands(pkg)` builds pnpm add / npm install / yarn add / bun add). Only the selected panel is mounted, so a tab change unmounts the old line and mounts a fresh one: the typing restarts without any reset logic.
2. Inside the panel, `TypedLine` runs a `setTimeout` chain: after `startDelay` (320ms) it bumps a character count, then schedules the next one with `charDelay` — `speed` (42ms) times a deterministic ±20% jitter from the index, ×2.4 after a space and ×1.6 after `@` or `/`. The effect cleanup clears the pending timer.
3. Stack two layers in one grid cell: the full command `invisible` underneath (it fixes the final width and wrapping, so the card never grows) and `text.slice(0, count)` plus the caret on top. Both are `aria-hidden`; an `sr-only` copy of the full command is what assistive tech reads.
4. The caret is a 2px accent bar held solid while typing; once the count reaches the end it gets `data-idle="true"` and a step-end blink keyframe (on 55%, off 45% of 1.06s), emitted once through React 19 `<style href precedence>`.
5. The copy button calls `navigator.clipboard.writeText` with the selected command, crossfades the copy icon into a success check for 1.6s and announces "Copied to clipboard" through a `role="status"` region; the reset timer is cleared on re-click and unmount.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `speed = 42ms per character, ±20% jitter`
  A 24-character command lands in about a second: slow enough to read as typing, fast enough that nobody waits to copy.
- `word beat = ×2.4 after a space, ×1.6 after @ or /`
  People type in words; a pause between words is what makes uniform per-key timing stop looking mechanical.
- `startDelay = 320ms`
  Shows the empty prompt and caret for a beat after a tab change, so the restart is visible as a restart.
- `copied state = 1.6s`
  Long enough to see the check after the pointer leaves the button, short enough that a second copy gets fresh feedback.

## API

```ts
function TypewriterInstall(props: { packageName?: string; commands?: InstallCommand[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; speed?: number; startDelay?: number; prompt?: string; label?: string; className?: string }): JSX.Element
type InstallCommand = { id: string; label: string; command: string }
```

- `packageName: string` — default `"motion"`
  Package used to build the default pnpm, npm, yarn and bun commands.
- `commands: InstallCommand[]`
  Replaces the default commands: { id, label, command } per tab.
- `value: string`
  Controlled selected tab id.
- `defaultValue: string` — default `commands[0].id`
  Initial tab id when uncontrolled.
- `onChange: (id: string) => void`
  Called with the newly selected tab id.
- `speed: number` — default `42`
  Base milliseconds per character.
- `startDelay: number` — default `320`
  Milliseconds before the first character after mount or a tab change.
- `prompt: string` — default `"$"`
  Glyph shown before the command.
- `label: string` — default `"Package manager"`
  Accessible name of the tab list.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Delay before character `i`. Deterministic, so server and client agree and
 * every replay has the same rhythm: ±20% around `speed` from the index, a
 * longer beat after a space (the eye reads word by word) and after `@`/`/`.
 */
function charDelay(text: string, i: number, speed: number) {
  const jitter = 0.8 + ((i * 37) % 9) / 20;
  const prev = text[i - 1];
  const beat = prev === " " ? 2.4 : prev === "@" || prev === "/" ? 1.6 : 1;
  return speed * jitter * beat;
}

/** One typed line. Mounted per tab, so a tab change restarts it. */
function TypedLine({ text, speed, startDelay, prompt }: { text: string; speed: number; startDelay: number; prompt: string }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    let timer = window.setTimeout(function step() {
      i += 1;
      setCount(i);
      if (i < text.length) timer = window.setTimeout(step, charDelay(text, i, speed));
    }, startDelay);
    return () => window.clearTimeout(timer);
  }, [text, speed, startDelay, reduced]);

  // Derived, not stored: reduced motion shows the whole line on the same
  // render the preference is known, with no typing frame in between.
  const shown = reduced ? text.length : Math.min(count, text.length);
  const done = shown >= text.length;

  return (
    <div className="flex min-w-0 items-baseline gap-2.5 font-mono text-body-2-regular">
      <span aria-hidden className="shrink-0 select-none text-text-tertiary">
        {prompt}
      </span>
      {/* The full line sits invisibly underneath to hold the final width and
          wrap, so the card never grows while the line types. */}
      <span className="grid min-w-0 flex-1 break-all">
        <span aria-hidden className="invisible col-start-1 row-start-1">
          {text}
          <span className="inline-block w-[2px]" />
        </span>
        <span aria-hidden className="col-start-1 row-start-1 text-text-primary">
          {text.slice(0, shown)}
          <span
            data-idle={done ? "true" : "false"}
            data-typewriter-caret=""
            className="ms-px inline-block h-[1em] w-[2px] rounded-full bg-accent-500 align-[-0.14em]"
          />
        </span>
        <span className="sr-only">{text}</span>
      </span>
    </div>
  );
}

/** Copies the whole command; the icon swaps to a check for 1.6s. */
function CopyCommandButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    window.clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    timer.current = window.setTimeout(() => setStatus("idle"), COPIED_MS);
  };

  const copied = status === "copied";
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className={cx(
          "relative -my-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-icon-secondary",
          "transition-colors duration-150 ease-out hover:bg-background-secondary-default hover:text-foreground-icon-primary",
          "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          "active:bg-background-secondary-hover",
        )}
      >
        <RiFileCopyLine
          aria-hidden
          className={cx(
            "absolute size-4 transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none",
            copied ? "scale-50 opacity-0" : "scale-100 opacity-100",
          )}
        />
        <RiCheckLine
          aria-hidden
          className={cx(
            "absolute size-4 text-state-success-text transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </button>
      <span role="status" className="sr-only">
        {status === "copied" ? "Copied to clipboard" : status === "failed" ? "Copy failed, select the command instead" : ""}
      </span>
    </>
  );
}

export function TypewriterInstall({
  packageName = "motion",
  commands,
  value,
  defaultValue,
  onChange,
  speed = 42,
  startDelay = 320,
  prompt = "$",
  label = "Package manager",
  className,
}: TypewriterInstallProps) {
  const list = commands ?? installCommands(packageName);
  const [inner, setInner] = useState(defaultValue ?? list[0]?.id ?? "");
  const selected = value ?? inner;
  const current = list.find((c) => c.id === selected) ?? list[0];

  const select = (key: Key) => {
    const id = String(key);
    setInner(id);
    onChange?.(id);
  };

  return (
    <Tabs
      selectedKey={current?.id}
      onSelectionChange={select}
      className={cx(
        "w-full max-w-[560px] overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default shadow-card",
        className,
      )}
    >
      <style href="kinetic-typewriter-install" precedence="medium">
        {CARET_CSS}
      </style>
      <div className="flex items-center border-b border-border-button-default px-2 py-1.5">
        <TabList aria-label={label} className="flex items-center gap-0.5">
          {list.map((c) => (
            <Tab
              key={c.id}
              id={c.id}
              className={cx(
                "cursor-pointer rounded-md px-2.5 py-1 font-mono text-caption-1-medium text-text-secondary outline-none",
                "transition-colors duration-150 ease-out hover:text-text-primary",
                "data-selected:bg-background-secondary-default data-selected:text-text-primary",
                "data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring",
              )}
            >
              {c.label}
            </Tab>
          ))}
        </TabList>
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {list.map((c) => (
          <TabPanel key={c.id} id={c.id} className="min-w-0 flex-1 rounded-sm outline-none data-focus-visible:ring-2 data-focus-visible:ring-border-focus-ring">
            <TypedLine text={c.command} speed={speed} startDelay={startDelay} prompt={prompt} />
          </TabPanel>
        ))}
        {current && <CopyCommandButton text={current.command} />}
      </div>
    </Tabs>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The typing effect clears its pending timeout on unmount, tab change or prop change; the copy button clears its reset timeout on unmount and before each new copy.

**Reduced motion.** With prefers-reduced-motion the timer chain never starts and the full command renders on the first client render; the caret stays solid without blinking and the copy icon swap has no transition.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Copying the typed slice instead of the full command: a click halfway through would put half a command on the clipboard.
- Letting the typed text drive layout. Without the invisible full-width layer the card grows a line at a time on narrow screens as the text wraps.
- Pausing the caret blink with `animation-play-state: paused` — it can freeze on the invisible frame. Drop the animation while typing instead.
- Exposing the typing to screen readers. Each character change in a live tree is noise; hide the animated layer and give them the whole line once.

## Notes

- `commands` replaces the defaults for anything that is not a package install, e.g. a CLI `add` command.
- Clicking the already-selected tab does not retype; the panel only remounts when the selection changes.

## Definition of done

On load the pnpm tab is selected and "pnpm add @remixicon/react" types out in about a second, then the caret blinks. Clicking "npm" shows "npm install @remixicon/react" typing from the start and the caption reads "Package manager: npm". Clicking "Copy command" turns the icon into a check and the button name into "Copied". With reduced motion the full command shows immediately.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
