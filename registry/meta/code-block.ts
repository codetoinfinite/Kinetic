import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'code-block',
  title: 'Code Block',
  category: 'display',
  kit: 'boardui',
  tags: ['code', 'syntax-highlighting', 'copy', 'docs', 'boardui'],
  blurb:
    'Docs code block with a filename chip, sticky line numbers, a dependency-free TSX highlighter, wrap toggle and one-click copy.',
  cost: 'css',
  motif: 'stack',

  files: [
    { path: 'registry/ui/code-block.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/code-block-tokenize.tsx', type: 'registry:ui', role: 'TSX tokenizer and token colour map' },
    { path: 'registry/ui/code-block-copy.tsx', type: 'registry:ui', role: 'clipboard helper, useCopyToClipboard hook and CopyButton' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The snippet frame from a docs page: a grey shell holding a header row (filename or role chip on the left, wrap and copy icon buttons on the right) above a white, inset code panel. TSX is coloured by a small tokenizer that ships with the component, so there is no highlighter package, grammar file or WASM to load. Line numbers sit in a sticky gutter, long lines scroll sideways or soft-wrap on demand, and the copy button swaps its glyph for a check for 1.6 seconds.',

  mechanism: [
    '`tokenizeTsx` walks the source once with sticky (`/y`) regexes, trying whitespace, comments, strings, then mode-specific rules. A mode stack of `code`, `tag` and `text` entries is what separates `a < b` from `<Card>`: a `<` opens a tag only in expression position (start of input, after a keyword, or after punctuation other than `)` and `]`), and inside a tag every bare identifier is an attribute.',
    'Tags manage the stack: `/>` pops the tag, `>` pops it and pushes a `text` entry for an opening tag or pops the enclosing `text` entry for a closing one. In `text` mode everything up to the next `<` or `{` is plain JSX text, so an apostrophe in copy never starts a string. `{` inside a tag or text pushes a fresh `code` entry with its own brace counter, and the matching `}` pops it.',
    'Identifiers become `keyword` (from a fixed set), `number` (for `true`, `null` and other literals), `function` (when followed by `(` or a `<T>(` type argument) or `plain`. Adjacent tokens of the same kind merge, which keeps the span count low.',
    '`splitLines` re-cuts the token stream at every newline so a multi-line comment or template string keeps its colour on each row. Each row is a flex line: an `aria-hidden`, `select-none` gutter cell that is `sticky start-0` with the panel background, then the code cell, which is `whitespace-pre` or `whitespace-pre-wrap break-words` depending on the wrap state.',
    'The gutter width is `calc(<digits>ch + 2rem)`, computed from the line count, so numbers right-align without measuring. Without wrap the `<code>` element is `w-max min-w-full`, so long rows widen the scroll area while highlighted rows still span the panel.',
    'Copy goes through `writeClipboard`: `navigator.clipboard.writeText` first, then a hidden read-only textarea with `execCommand("copy")`, and the previous focus is restored. `useCopyToClipboard` holds the `copied` flag and a reset timeout that restarts on each copy and is cleared on unmount.',
  ],

  constants: [
    { name: 'copied window', value: '1600 ms', why: 'Long enough to see the check after the pointer leaves the button, and short enough that a second copy a moment later still gets fresh feedback.' },
    { name: 'shell / panel radii', value: 'rounded-2xl outer, rounded-xl inner, p-1.5 gap', why: 'The inner panel sits 6px inside the shell, so a 16px outer radius and a 12px inner radius stay concentric.' },
    { name: 'code type', value: 'font-mono + text-body-regular (14 / 20 px)', why: 'Rows have `min-h-5` (20px) to match the line height, so empty lines keep their height without a placeholder character.' },
    { name: 'gutter width', value: 'calc(digits ch + 2rem)', why: '16px of padding on each side of the widest number. Using `ch` keeps 9 to 10 and 99 to 100 from shifting the code column by a pixel or two.' },
    { name: 'icon swap', value: '200 ms opacity + scale 0.5 to 1', why: 'The copy and check glyphs are stacked absolutely and cross-faded, so the button never changes size.' },
  ],

  pitfalls: [
    'Treating every `<` as a tag. Generics (`useState<Period>`) and comparisons would light up green. The expression-position test on the last significant token is what prevents it.',
    'Rendering rows without the trailing `\\n` inside each code cell. Selecting several lines and pressing Cmd+C would join them into one line, because flex rows carry no newline of their own.',
    'Letting line numbers be selectable or part of the copied text. The gutter is `select-none` and `aria-hidden`, and the copy button reads the trimmed `code` prop, never the DOM.',
    'Building the token classes dynamically (`text-${kind}`). Tailwind only compiles literal class names, so the colour map is a literal object.',
    'Calling `navigator.clipboard.writeText` with no fallback. It throws in insecure contexts and many embedded iframes, and the copy then silently does nothing.',
  ],

  notes: [
    '`language="plain"` skips the tokenizer for shell output, JSON or anything else.',
    '`CopyButton`, `useCopyToClipboard` and `writeClipboard` are exported from `code-block-copy` for other docs pieces such as install commands and copy-page buttons.',
    'The tokenizer handles the TSX found in docs snippets. It does not understand regex literals or nested template literal expressions, which render as strings or punctuation.',
  ],

  apiSignature:
    'function CodeBlock(props: { code: string; filename?: string; chipTone?: "neutral" | "file"; language?: "tsx" | "plain"; showLineNumbers?: boolean; highlightLines?: number[]; wrap?: boolean; defaultWrap?: boolean; onWrapChange?: (wrap: boolean) => void; hideWrapToggle?: boolean; hideCopy?: boolean; maxHeight?: number; actions?: ReactNode; onCopied?: (code: string) => void; className?: string; ref?: Ref<HTMLElement> }): JSX.Element\nfunction tokenizeTsx(src: string): Token[]\nfunction CopyButton(props: { value: string | (() => string); label?: string; copiedLabel?: string; resetMs?: number; onCopied?: (text: string) => void } & ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element',

  props: [
    { name: 'code', type: 'string', description: 'Source to show and copy. Leading blank lines and trailing whitespace are trimmed.' },
    { name: 'filename', type: 'string', description: 'Header chip label: a filename or a role such as `usage`. Omit it for an empty chip slot.' },
    { name: 'chipTone', type: '"neutral" | "file"', default: '"neutral"', description: 'White label chip, or the purple `docs-file-chip-*` chip with a code glyph.' },
    { name: 'language', type: '"tsx" | "plain"', default: '"tsx"', description: 'Run the built-in TSX tokenizer or print the text as is.' },
    { name: 'showLineNumbers', type: 'boolean', default: 'true', description: 'Sticky, unselectable line-number gutter.' },
    { name: 'highlightLines', type: 'number[]', description: '1-based lines tinted with `background-secondary`, gutter included.' },
    { name: 'wrap / defaultWrap / onWrapChange', type: 'boolean / boolean / (wrap: boolean) => void', default: 'uncontrolled, false', description: 'Soft-wrap state, controlled or uncontrolled. The header toggle is `aria-pressed`.' },
    { name: 'hideWrapToggle / hideCopy', type: 'boolean', default: 'false', description: 'Drop either header action.' },
    { name: 'maxHeight', type: 'number', description: 'Pixel cap on the code panel. It scrolls past this.' },
    { name: 'actions', type: 'ReactNode', description: 'Extra header controls placed before wrap and copy.' },
    { name: 'onCopied', type: '(code: string) => void', description: 'Called after a successful copy.' },
  ],

  reducedMotion:
    'The only motion is the 200ms copy-to-check cross-fade and the 150ms hover colour change. Under `prefers-reduced-motion: reduce` the glyph swap has `motion-reduce:transition-none`, so the check appears at once. Nothing moves on scroll or load.',

  cleanup:
    'The reset timeout in `useCopyToClipboard` is cleared on unmount and whenever a new copy restarts it. The fallback textarea is removed in the same tick it is created. There are no listeners or observers.',

  acceptance:
    'A TSX snippet renders with purple keywords, orange strings, grey comments and green JSX tag names, while `useState<Period>` and `a < b` stay uncoloured. Line numbers stay pinned while a long line scrolls sideways and are not included when the text is selected. Pressing the wrap toggle sets `aria-pressed="true"` and long lines wrap inside the panel. Pressing copy puts the exact `code` string on the clipboard, swaps the icon to a check, announces "Copied" and reverts after about 1.6s.',

  criticalRegion: 'critical',
};

export default meta;
