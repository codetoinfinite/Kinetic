# Build: Install Command Tabs

The install box from a docs page. A grey shell holds a row of package-manager tabs and a copy button above a white command line. The runner (`npx`, `pnpm dlx`, `bun add` and so on) is set in the stronger purple and the arguments in the lighter command accent. Commands are derived from one description (a binary to run, or packages to add), so the four spellings never drift apart. A controlled `value` keeps every block on the page on the manager the reader picked. `InstallSteps` and `InstallStep` lay blocks out as numbered steps joined by the `docs-install-rail` line.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

pnpm, npm, yarn and bun tabs that spell the same install or run command four ways, with copy and numbered docs steps on a rail.

- Category: display
- Runtime cost: dom
- Dependencies: react-aria-components@^1.22.1

## How it works

1. `getInstallCommand(manager, source)` builds each spelling. An explicit `commands[manager]` wins. Otherwise `run` is prefixed with the manager's runner (`npx`, `pnpm dlx`, `yarn dlx`, `bunx --bun`), or `install` packages follow its add verb (`npm install`, `pnpm add`, `yarn add`, `bun add`), with `-D` or `--dev` when `dev` is set.
2. React Aria `Tabs` provide one `Tab` and one `TabPanel` per manager, with roving focus, arrow keys and `aria-controls`. Selection is controlled through `value` and `onValueChange` or uncontrolled through `defaultValue`. A `value` that is not in `managers` falls back to the first one rather than leaving nothing selected.
3. Each panel splits its command with `splitRunner`, which matches the longest known runner first so that `pnpm dlx` beats `pnpm`. The runner renders in `status-purple-text` and the rest in `docs-command-accent`, inside a horizontally scrollable `whitespace-pre` line.
4. The header `CopyButton` takes a function value, so it copies the command of the tab selected at click time, and its accessible name follows the tab ("Copy yarn command"). It shows the shared copy-to-check feedback from `code-block-copy`.
5. `InstallStep` is an `<li>` with a 28px zero-padded number badge and a 1px `bg-docs-install-rail` line that fills the remaining height down to the next badge. The `group-last/step:hidden` modifier removes the rail on the last step without a prop.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `tab pill = h-7, px-2.5, rounded-lg, white + shadow-2xs when selected`
  The selected pill sits 6px inside the rounded-2xl shell, like the file chip in the code block, so the two docs pieces line up.
- `runner order = longest runner first`
  `pnpm dlx` and `pnpm add` both start with `pnpm`, so matching the shortest first would colour only `pnpm`.
- `step badge = size-7, rounded-full, mono caption-1, zero-padded`
  Two-digit labels (`01`, `02`) keep the badge text the same width from step 1 to step 12.
- `rail = w-px, docs-install-rail, mt-2 below the badge`
  The token is the button border in light mode and a 60% neutral-800 in dark mode, so the rail stays visible without competing with the code panels.

## API

```ts
type PackageManager = "pnpm" | "npm" | "yarn" | "bun";
function InstallCommandTabs(props: { run?: string; install?: string | readonly string[]; dev?: boolean; commands?: Partial<Record<PackageManager, string>>; managers?: readonly PackageManager[]; value?: PackageManager; defaultValue?: PackageManager; onValueChange?: (manager: PackageManager) => void; "aria-label"?: string; onCopied?: (command: string) => void; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
function getInstallCommand(manager: PackageManager, source: { run?: string; install?: string | readonly string[]; dev?: boolean; commands?: Partial<Record<PackageManager, string>> }): string
function InstallSteps(props: { children: ReactNode; className?: string }): JSX.Element
function InstallStep(props: { step: number; title: ReactNode; description?: ReactNode; children?: ReactNode }): JSX.Element
```

- `run: string`
  Arguments for a one-off binary run, e.g. `boardui@latest add line-chart-card`.
- `install: string | readonly string[]`
  Packages to add to the project.
- `dev: boolean` — default `false`
  With `install`, add as dev dependencies.
- `commands: Partial<Record<PackageManager, string>>`
  Exact command per manager. Overrides `run` and `install`.
- `managers: readonly PackageManager[]` — default `["pnpm", "npm", "yarn", "bun"]`
  Tabs to show, in order.
- `value / defaultValue / onValueChange: PackageManager` — default `uncontrolled, first manager`
  Selected manager. Share it to sync blocks.
- `aria-label: string` — default `"Package manager"`
  Accessible name of the tab list.
- `onCopied: (command: string) => void`
  Called with the copied command.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Every command is derived, never stored: changing `run` or `install`
// updates all four spellings at once, and the copy button reads the one
// that matches the selected tab at click time.
const source: InstallCommandSource = { run, install, dev, commands };
const lines = managers.map((manager) => {
  const command = getInstallCommand(manager, source);
  const [runner, rest] = splitRunner(command);
  return { manager, command, runner, rest };
});
const current = lines.find((line) => line.manager === active)?.command ?? "";

const select = (key: PackageManager) => {
  setUncontrolled(key);
  onValueChange?.(key);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** There are no effects, timers or listeners in this file. The copy reset timeout lives in `useCopyToClipboard` and is cleared on unmount.

**Reduced motion.** Nothing travels. The tab pill fades its colour and shadow over 150ms, and the copy glyph cross-fades over 200ms. Both have `motion-reduce:transition-none`, so they switch at once.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Storing the copied text in state when the tab changes. A stale closure would copy the npm command after the reader switched to bun. The copy button reads the selected command at click time.
- Assuming every runner is one word. `pnpm dlx`, `yarn dlx` and `bunx --bun` are two tokens, and colouring by first word would split them wrongly.
- Giving each block its own state on a multi-step page. The reader would have to pick their manager once per block. Lift the value and pass `value` and `onValueChange` to every block.

## Notes

- `getInstallCommand` and `PACKAGE_MANAGERS` are exported for building other docs pieces, such as an llms.txt entry or a shell snippet.
- Use `commands` for anything the builder does not cover, such as `npm create` or a global install.

## Definition of done

With `run="boardui@latest add line-chart-card"`, the pnpm tab shows `pnpm dlx boardui@latest add line-chart-card`, npm shows `npx …`, yarn `yarn dlx …` and bun `bunx --bun …`, with the runner in a darker purple than the arguments. Clicking yarn, or arrowing to it, switches the command and renames the copy button to "Copy yarn command", which copies exactly the visible text. When two blocks share `value`, choosing bun in one switches the other. Step badges read 01 and 02, and a rail joins them but not past the last step.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
