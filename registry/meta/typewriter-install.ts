/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Typewriter Install" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'typewriter-install',
  title: 'Typewriter Install',
  category: 'display',
  kit: 'boardui',
  tags: ['install', 'command', 'typewriter', 'caret', 'copy', 'tabs', 'package-manager', 'boardui'],
  blurb:
    'An install command that types itself behind a caret; pnpm, npm, yarn and bun tabs restart the typing and a copy button takes the full line.',
  cost: 'dom',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/typewriter-install.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1', '@remixicon/react@^4.9.0'],

  summary:
    'The install line of a landing page: a small card with package-manager tabs on top and a monospace command below that appears one character at a time behind an accent caret, then idles with the caret blinking. Switching tabs swaps the command and types it again from the start; the copy button copies the whole command at any moment and confirms with a check. Screen readers get the full command at once, and reduced motion shows it fully typed.',

  mechanism: [
    'Render a react-aria `Tabs` with one `Tab` and one `TabPanel` per command (`installCommands(pkg)` builds pnpm add / npm install / yarn add / bun add). Only the selected panel is mounted, so a tab change unmounts the old line and mounts a fresh one: the typing restarts without any reset logic.',
    'Inside the panel, `TypedLine` runs a `setTimeout` chain: after `startDelay` (320ms) it bumps a character count, then schedules the next one with `charDelay` — `speed` (42ms) times a deterministic ±20% jitter from the index, ×2.4 after a space and ×1.6 after `@` or `/`. The effect cleanup clears the pending timer.',
    'Stack two layers in one grid cell: the full command `invisible` underneath (it fixes the final width and wrapping, so the card never grows) and `text.slice(0, count)` plus the caret on top. Both are `aria-hidden`; an `sr-only` copy of the full command is what assistive tech reads.',
    'The caret is a 2px accent bar held solid while typing; once the count reaches the end it gets `data-idle="true"` and a step-end blink keyframe (on 55%, off 45% of 1.06s), emitted once through React 19 `<style href precedence>`.',
    'The copy button calls `navigator.clipboard.writeText` with the selected command, crossfades the copy icon into a success check for 1.6s and announces "Copied to clipboard" through a `role="status"` region; the reset timer is cleared on re-click and unmount.',
  ],

  constants: [
    {
      name: 'speed',
      value: '42ms per character, ±20% jitter',
      why: 'A 24-character command lands in about a second: slow enough to read as typing, fast enough that nobody waits to copy.',
    },
    {
      name: 'word beat',
      value: '×2.4 after a space, ×1.6 after @ or /',
      why: 'People type in words; a pause between words is what makes uniform per-key timing stop looking mechanical.',
    },
    {
      name: 'startDelay',
      value: '320ms',
      why: 'Shows the empty prompt and caret for a beat after a tab change, so the restart is visible as a restart.',
    },
    {
      name: 'copied state',
      value: '1.6s',
      why: 'Long enough to see the check after the pointer leaves the button, short enough that a second copy gets fresh feedback.',
    },
  ],

  pitfalls: [
    'Copying the typed slice instead of the full command: a click halfway through would put half a command on the clipboard.',
    'Letting the typed text drive layout. Without the invisible full-width layer the card grows a line at a time on narrow screens as the text wraps.',
    'Pausing the caret blink with `animation-play-state: paused` — it can freeze on the invisible frame. Drop the animation while typing instead.',
    'Exposing the typing to screen readers. Each character change in a live tree is noise; hide the animated layer and give them the whole line once.',
  ],

  notes: [
    '`commands` replaces the defaults for anything that is not a package install, e.g. a CLI `add` command.',
    'Clicking the already-selected tab does not retype; the panel only remounts when the selection changes.',
  ],

  apiSignature:
    'function TypewriterInstall(props: { packageName?: string; commands?: InstallCommand[]; value?: string; defaultValue?: string; onChange?: (id: string) => void; speed?: number; startDelay?: number; prompt?: string; label?: string; className?: string }): JSX.Element\ntype InstallCommand = { id: string; label: string; command: string }',

  props: [
    { name: 'packageName', type: 'string', default: '"motion"', description: 'Package used to build the default pnpm, npm, yarn and bun commands.' },
    { name: 'commands', type: 'InstallCommand[]', description: 'Replaces the default commands: { id, label, command } per tab.' },
    { name: 'value', type: 'string', description: 'Controlled selected tab id.' },
    { name: 'defaultValue', type: 'string', default: 'commands[0].id', description: 'Initial tab id when uncontrolled.' },
    { name: 'onChange', type: '(id: string) => void', description: 'Called with the newly selected tab id.' },
    { name: 'speed', type: 'number', default: '42', description: 'Base milliseconds per character.' },
    { name: 'startDelay', type: 'number', default: '320', description: 'Milliseconds before the first character after mount or a tab change.' },
    { name: 'prompt', type: 'string', default: '"$"', description: 'Glyph shown before the command.' },
    { name: 'label', type: 'string', default: '"Package manager"', description: 'Accessible name of the tab list.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion the timer chain never starts and the full command renders on the first client render; the caret stays solid without blinking and the copy icon swap has no transition.',

  cleanup:
    'The typing effect clears its pending timeout on unmount, tab change or prop change; the copy button clears its reset timeout on unmount and before each new copy.',

  acceptance:
    'On load the pnpm tab is selected and "pnpm add @remixicon/react" types out in about a second, then the caret blinks. Clicking "npm" shows "npm install @remixicon/react" typing from the start and the caption reads "Package manager: npm". Clicking "Copy command" turns the icon into a check and the button name into "Copied". With reduced motion the full command shows immediately.',

  criticalRegion: 'critical',
};

export default meta;
