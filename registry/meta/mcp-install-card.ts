/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "MCP Install Card" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'mcp-install-card',
  title: 'MCP Install Card',
  category: 'display',
  kit: 'boardui',
  tags: ['mcp', 'install', 'code', 'clipboard', 'tabs', 'boardui'],
  blurb:
    'Install card with client tabs (Cursor, Claude Code, VS Code), a highlighted config snippet per client and a copy button with feedback.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/mcp-install-card.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A card that tells people how to connect an MCP server to their editor. A white panel holds a plug tile, title and copy, then underline tabs, one per client. Each tab shows a file bar (the config path, or "Terminal" for a command), a copy button and the snippet with light syntax colouring, plus an optional note. A link to the full guide sits on the grey shell below.',

  mechanism: [
    'Client switching is the kit `Tabs` (React Aria): `defaultSelectedKey` picks the first client unless `defaultClient` is set, and `onSelectionChange` clears any "Copied" state so it never shows on a tab that was not copied.',
    'Copy calls `navigator.clipboard.writeText(client.code)`. Success shows a check and "Copied" and calls `onCopy(client.id)`; a missing API or a rejected write (insecure context, denied permission) shows a warning icon and "Failed". Either state resets after `RESET_MS` through one timeout that is replaced on every copy.',
    'Copy state is `{ id, ok } | null`, compared against the panel client id, so only the copied panel changes. A visually hidden `role="status"` span in each panel announces "Copied to clipboard" or the failure text.',
    '`tokenize()` is a small regex highlighter. For JSON it walks strings and structural characters: a string followed by a colon is a key (accent), any other string is a value (success green), and braces, brackets and commas are muted. For shell it prefixes a non-selectable "$ " and colours the program name.',
    'The snippet sits in a `pre` with horizontal overflow, so long commands scroll inside the card instead of widening it. The card is `max-w-xl` and full width below that, and the tab list scrolls horizontally if the labels do not fit.',
  ],

  constants: [
    { name: 'RESET_MS', value: '2000', why: 'Long enough to notice the check after looking back from the editor, short enough that a second copy reads as a fresh action.' },
    { name: 'code size', value: '12.5px / 20px', why: 'Keeps a typical `mcp.json` line under the card width at 360px while staying readable.' },
    { name: 'copy button min-width', value: '84px', why: '"Copy", "Copied" and "Failed" swap without the file bar reflowing.' },
  ],

  pitfalls: [
    'Assuming `navigator.clipboard` exists. It is undefined outside secure contexts and can reject when permission is denied; the write is wrapped so the button reports failure instead of throwing.',
    'Leaving a reset timer running after unmount or a new copy. The timeout is kept in a ref, cleared before each new one and on unmount.',
    'Highlighting with `dangerouslySetInnerHTML`. The tokenizer returns plain spans, so snippet text is never parsed as HTML.',
  ],

  notes: [
    'Add more clients (Codex, Windsurf, Zed) by appending to `clients`; each can be JSON or a shell command.',
    'The selected tab is uncontrolled. Remount with a different `defaultClient` (for example from the visitor OS) to preselect another client.',
  ],

  apiSignature:
    'function McpInstallCard(props: { clients: McpClient[]; defaultClient?: string; title?: ReactNode; description?: ReactNode; guide?: { label: string; href: string }; onCopy?: (clientId: string) => void; className?: string }): JSX.Element\ninterface McpClient { id: string; label: string; icon?: IconComponent; file?: string; language: "json" | "shell"; code: string; note?: ReactNode }',

  props: [
    { name: 'clients', type: 'McpClient[]', description: 'One tab per client with its snippet and language.' },
    { name: 'defaultClient', type: 'string', description: 'Initially selected client id; defaults to the first.' },
    { name: 'title', type: 'ReactNode', default: '"Install with your agent through MCP"', description: 'Card heading.' },
    { name: 'description', type: 'ReactNode', description: 'Copy under the heading.' },
    { name: 'guide', type: '{ label: string; href: string }', description: 'Link shown on the shell under the panel.' },
    { name: 'onCopy', type: '(clientId: string) => void', description: 'Fires after a successful clipboard write.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'The only motion is the guide arrow nudging 2px on hover and the kit tab underline sliding; the arrow uses `motion-reduce:transition-none`. Copy feedback is a static icon and label swap.',

  cleanup:
    'The copy-reset timeout is cleared on unmount, on every new copy and when the tab changes.',

  acceptance:
    'The card shows Cursor selected with `.cursor/mcp.json` and a coloured JSON snippet. Clicking "Claude Code" shows "Terminal" and the `claude mcp add` command; clicking "VS Code" shows `.vscode/mcp.json`. Clicking Copy writes the exact snippet to the clipboard, swaps the button to a check and "Copied" for two seconds and announces it. With the clipboard unavailable the button reads "Failed" instead. At 360px the card fits and long lines scroll inside the code area.',

  criticalRegion: 'critical',
};

export default meta;
