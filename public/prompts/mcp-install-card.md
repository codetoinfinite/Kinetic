# Build: MCP Install Card

A card that tells people how to connect an MCP server to their editor. A white panel holds a plug tile, title and copy, then underline tabs, one per client. Each tab shows a file bar (the config path, or "Terminal" for a command), a copy button and the snippet with light syntax colouring, plus an optional note. A link to the full guide sits on the grey shell below.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Install card with client tabs (Cursor, Claude Code, VS Code), a highlighted config snippet per client and a copy button with feedback.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Client switching is the kit `Tabs` (React Aria): `defaultSelectedKey` picks the first client unless `defaultClient` is set, and `onSelectionChange` clears any "Copied" state so it never shows on a tab that was not copied.
2. Copy calls `navigator.clipboard.writeText(client.code)`. Success shows a check and "Copied" and calls `onCopy(client.id)`; a missing API or a rejected write (insecure context, denied permission) shows a warning icon and "Failed". Either state resets after `RESET_MS` through one timeout that is replaced on every copy.
3. Copy state is `{ id, ok } | null`, compared against the panel client id, so only the copied panel changes. A visually hidden `role="status"` span in each panel announces "Copied to clipboard" or the failure text.
4. `tokenize()` is a small regex highlighter. For JSON it walks strings and structural characters: a string followed by a colon is a key (accent), any other string is a value (success green), and braces, brackets and commas are muted. For shell it prefixes a non-selectable "$ " and colours the program name.
5. The snippet sits in a `pre` with horizontal overflow, so long commands scroll inside the card instead of widening it. The card is `max-w-xl` and full width below that, and the tab list scrolls horizontally if the labels do not fit.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `RESET_MS = 2000`
  Long enough to notice the check after looking back from the editor, short enough that a second copy reads as a fresh action.
- `code size = 12.5px / 20px`
  Keeps a typical `mcp.json` line under the card width at 360px while staying readable.
- `copy button min-width = 84px`
  "Copy", "Copied" and "Failed" swap without the file bar reflowing.

## API

```ts
function McpInstallCard(props: { clients: McpClient[]; defaultClient?: string; title?: ReactNode; description?: ReactNode; guide?: { label: string; href: string }; onCopy?: (clientId: string) => void; className?: string }): JSX.Element
interface McpClient { id: string; label: string; icon?: IconComponent; file?: string; language: "json" | "shell"; code: string; note?: ReactNode }
```

- `clients: McpClient[]`
  One tab per client with its snippet and language.
- `defaultClient: string`
  Initially selected client id; defaults to the first.
- `title: ReactNode` — default `"Install with your agent through MCP"`
  Card heading.
- `description: ReactNode`
  Copy under the heading.
- `guide: { label: string; href: string }`
  Link shown on the shell under the panel.
- `onCopy: (clientId: string) => void`
  Fires after a successful clipboard write.
- `className: string`
  Merged onto the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
type CopyState = { id: string; ok: boolean } | null;

export function McpInstallCard({
  clients,
  defaultClient,
  title = "Install with your agent through MCP",
  description,
  guide,
  onCopy,
  className,
}: McpInstallCardProps) {
  const [copy, setCopy] = useState<CopyState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = (next: CopyState) => {
    if (timer.current) clearTimeout(timer.current);
    setCopy(next);
    timer.current = setTimeout(() => setCopy(null), RESET_MS);
  };

  const copyCode = async (client: McpClient) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(client.code);
      flash({ id: client.id, ok: true });
      onCopy?.(client.id);
    } catch {
      flash({ id: client.id, ok: false });
    }
  };

  return (
    <article
      className={cx(
        "w-full max-w-xl rounded-3xl bg-background-secondary-default p-1 ring-1 ring-separator-border",
        className,
      )}
    >
      <div className="rounded-[20px] bg-background-primary-default px-5 pt-5 pb-1 shadow-xs ring-1 ring-separator-border">
        <div className="flex items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background-secondary-default ring-1 ring-separator-border">
            <RiPlugLine aria-hidden className="size-5 text-foreground-icon-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="text-headline-semibold text-balance text-text-primary">{title}</h3>
            {description && <p className="mt-1 text-body-2-regular text-pretty text-text-secondary">{description}</p>}
          </div>
        </div>

        <Tabs
          className="mt-4"
          defaultSelectedKey={defaultClient ?? clients[0]?.id}
          onSelectionChange={() => {
            if (timer.current) clearTimeout(timer.current);
            setCopy(null);
          }}
        >
          <TabList aria-label="MCP client" className="overflow-x-auto">
            {clients.map((client) => (
              <Tab key={client.id} id={client.id} icon={client.icon}>
                {client.label}
              </Tab>
            ))}
          </TabList>

          {clients.map((client) => {
            const state = copy?.id === client.id ? copy : null;
            return (
              <TabPanel key={client.id} id={client.id} className="py-4 outline-none">
                <div className="overflow-hidden rounded-2xl bg-background-secondary-default ring-1 ring-separator-border">
                  <div className="flex items-center gap-2 border-b border-separator-border py-1.5 pr-1.5 pl-3">
                    <RiFileCodeLine aria-hidden className="size-4 shrink-0 text-foreground-icon-tertiary" />
                    <span className="min-w-0 flex-1 truncate font-mono text-caption-1-regular text-text-secondary">
                      {client.file ?? "Terminal"}
                    </span>
                    <Button
                      size="xs"
                      variant="secondary"
                      leadingIcon={state ? (state.ok ? RiCheckLine : RiErrorWarningLine) : RiFileCopyLine}
                      onClick={() => void copyCode(client)}
                      aria-label={`Copy ${client.label} ${client.language === "shell" ? "command" : "config"}`}
                      className="min-w-[84px]"
                    >
                      {state ? (state.ok ? "Copied" : "Failed") : "Copy"}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-5 text-text-primary">
                    <code>
                      {tokenize(client.code, client.language).map((token, i) => (
                        <span key={i} className={token.cls}>
                          {token.text}
                        </span>
                      ))}
                    </code>
                  </pre>
                </div>
                {client.note && <p className="mt-2.5 px-1 text-caption-1-regular text-text-tertiary">{client.note}</p>}
                <span role="status" className="sr-only">
                  {state ? (state.ok ? "Copied to clipboard" : "Copy failed, select the text and copy it manually") : ""}
                </span>
              </TabPanel>
            );
          })}
        </Tabs>
      </div>

      {guide && (
        <a
          href={guide.href}
          className="group flex items-center justify-center gap-1.5 rounded-b-[20px] px-4 py-3 text-body-medium text-accent-600 outline-none hover:text-accent-700 focus-visible:ring-2 focus-visible:ring-border-focus-ring dark:text-accent-400 dark:hover:text-accent-300"
        >
          {guide.label}
          <RiArrowRightLine
            aria-hidden
            className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </a>
      )}
    </article>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The copy-reset timeout is cleared on unmount, on every new copy and when the tab changes.

**Reduced motion.** The only motion is the guide arrow nudging 2px on hover and the kit tab underline sliding; the arrow uses `motion-reduce:transition-none`. Copy feedback is a static icon and label swap.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Assuming `navigator.clipboard` exists. It is undefined outside secure contexts and can reject when permission is denied; the write is wrapped so the button reports failure instead of throwing.
- Leaving a reset timer running after unmount or a new copy. The timeout is kept in a ref, cleared before each new one and on unmount.
- Highlighting with `dangerouslySetInnerHTML`. The tokenizer returns plain spans, so snippet text is never parsed as HTML.

## Notes

- Add more clients (Codex, Windsurf, Zed) by appending to `clients`; each can be JSON or a shell command.
- The selected tab is uncontrolled. Remount with a different `defaultClient` (for example from the visitor OS) to preselect another client.

## Definition of done

The card shows Cursor selected with `.cursor/mcp.json` and a coloured JSON snippet. Clicking "Claude Code" shows "Terminal" and the `claude mcp add` command; clicking "VS Code" shows `.vscode/mcp.json`. Clicking Copy writes the exact snippet to the clipboard, swaps the button to a check and "Copied" for two seconds and announces it. With the clipboard unavailable the button reads "Failed" instead. At 360px the card fits and long lines scroll inside the code area.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
