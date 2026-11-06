import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'install-command-tabs',
  title: 'Install Command Tabs',
  category: 'display',
  kit: 'boardui',
  tags: ['install', 'package-manager', 'tabs', 'copy', 'docs', 'boardui'],
  blurb:
    'pnpm, npm, yarn and bun tabs that spell the same install or run command four ways, with copy and numbered docs steps on a rail.',
  cost: 'dom',
  motif: 'stack',

  files: [{ path: 'registry/ui/install-command-tabs.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The install box from a docs page. A grey shell holds a row of package-manager tabs and a copy button above a white command line. The runner (`npx`, `pnpm dlx`, `bun add` and so on) is set in the stronger purple and the arguments in the lighter command accent. Commands are derived from one description (a binary to run, or packages to add), so the four spellings never drift apart. A controlled `value` keeps every block on the page on the manager the reader picked. `InstallSteps` and `InstallStep` lay blocks out as numbered steps joined by the `docs-install-rail` line.',

  mechanism: [
    '`getInstallCommand(manager, source)` builds each spelling. An explicit `commands[manager]` wins. Otherwise `run` is prefixed with the manager\'s runner (`npx`, `pnpm dlx`, `yarn dlx`, `bunx --bun`), or `install` packages follow its add verb (`npm install`, `pnpm add`, `yarn add`, `bun add`), with `-D` or `--dev` when `dev` is set.',
    'React Aria `Tabs` provide one `Tab` and one `TabPanel` per manager, with roving focus, arrow keys and `aria-controls`. Selection is controlled through `value` and `onValueChange` or uncontrolled through `defaultValue`. A `value` that is not in `managers` falls back to the first one rather than leaving nothing selected.',
    'Each panel splits its command with `splitRunner`, which matches the longest known runner first so that `pnpm dlx` beats `pnpm`. The runner renders in `status-purple-text` and the rest in `docs-command-accent`, inside a horizontally scrollable `whitespace-pre` line.',
    'The header `CopyButton` takes a function value, so it copies the command of the tab selected at click time, and its accessible name follows the tab ("Copy yarn command"). It shows the shared copy-to-check feedback from `code-block-copy`.',
    '`InstallStep` is an `<li>` with a 28px zero-padded number badge and a 1px `bg-docs-install-rail` line that fills the remaining height down to the next badge. The `group-last/step:hidden` modifier removes the rail on the last step without a prop.',
  ],

  constants: [
    { name: 'tab pill', value: 'h-7, px-2.5, rounded-lg, white + shadow-2xs when selected', why: 'The selected pill sits 6px inside the rounded-2xl shell, like the file chip in the code block, so the two docs pieces line up.' },
    { name: 'runner order', value: 'longest runner first', why: '`pnpm dlx` and `pnpm add` both start with `pnpm`, so matching the shortest first would colour only `pnpm`.' },
    { name: 'step badge', value: 'size-7, rounded-full, mono caption-1, zero-padded', why: 'Two-digit labels (`01`, `02`) keep the badge text the same width from step 1 to step 12.' },
    { name: 'rail', value: 'w-px, docs-install-rail, mt-2 below the badge', why: 'The token is the button border in light mode and a 60% neutral-800 in dark mode, so the rail stays visible without competing with the code panels.' },
  ],

  pitfalls: [
    'Storing the copied text in state when the tab changes. A stale closure would copy the npm command after the reader switched to bun. The copy button reads the selected command at click time.',
    'Assuming every runner is one word. `pnpm dlx`, `yarn dlx` and `bunx --bun` are two tokens, and colouring by first word would split them wrongly.',
    'Giving each block its own state on a multi-step page. The reader would have to pick their manager once per block. Lift the value and pass `value` and `onValueChange` to every block.',
  ],

  notes: [
    '`getInstallCommand` and `PACKAGE_MANAGERS` are exported for building other docs pieces, such as an llms.txt entry or a shell snippet.',
    'Use `commands` for anything the builder does not cover, such as `npm create` or a global install.',
  ],

  apiSignature:
    'type PackageManager = "pnpm" | "npm" | "yarn" | "bun";\nfunction InstallCommandTabs(props: { run?: string; install?: string | readonly string[]; dev?: boolean; commands?: Partial<Record<PackageManager, string>>; managers?: readonly PackageManager[]; value?: PackageManager; defaultValue?: PackageManager; onValueChange?: (manager: PackageManager) => void; "aria-label"?: string; onCopied?: (command: string) => void; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction getInstallCommand(manager: PackageManager, source: { run?: string; install?: string | readonly string[]; dev?: boolean; commands?: Partial<Record<PackageManager, string>> }): string\nfunction InstallSteps(props: { children: ReactNode; className?: string }): JSX.Element\nfunction InstallStep(props: { step: number; title: ReactNode; description?: ReactNode; children?: ReactNode }): JSX.Element',

  props: [
    { name: 'run', type: 'string', description: 'Arguments for a one-off binary run, e.g. `boardui@latest add line-chart-card`.' },
    { name: 'install', type: 'string | readonly string[]', description: 'Packages to add to the project.' },
    { name: 'dev', type: 'boolean', default: 'false', description: 'With `install`, add as dev dependencies.' },
    { name: 'commands', type: 'Partial<Record<PackageManager, string>>', description: 'Exact command per manager. Overrides `run` and `install`.' },
    { name: 'managers', type: 'readonly PackageManager[]', default: '["pnpm", "npm", "yarn", "bun"]', description: 'Tabs to show, in order.' },
    { name: 'value / defaultValue / onValueChange', type: 'PackageManager', default: 'uncontrolled, first manager', description: 'Selected manager. Share it to sync blocks.' },
    { name: 'aria-label', type: 'string', default: '"Package manager"', description: 'Accessible name of the tab list.' },
    { name: 'onCopied', type: '(command: string) => void', description: 'Called with the copied command.' },
  ],

  reducedMotion:
    'Nothing travels. The tab pill fades its colour and shadow over 150ms, and the copy glyph cross-fades over 200ms. Both have `motion-reduce:transition-none`, so they switch at once.',

  cleanup:
    'There are no effects, timers or listeners in this file. The copy reset timeout lives in `useCopyToClipboard` and is cleared on unmount.',

  acceptance:
    'With `run="boardui@latest add line-chart-card"`, the pnpm tab shows `pnpm dlx boardui@latest add line-chart-card`, npm shows `npx …`, yarn `yarn dlx …` and bun `bunx --bun …`, with the runner in a darker purple than the arguments. Clicking yarn, or arrowing to it, switches the command and renames the copy button to "Copy yarn command", which copies exactly the visible text. When two blocks share `value`, choosing bun in one switches the other. Step badges read 01 and 02, and a rail joins them but not past the last step.',

  criticalRegion: 'critical',
};

export default meta;
