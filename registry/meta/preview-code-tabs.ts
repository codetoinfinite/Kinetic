import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'preview-code-tabs',
  title: 'Preview Code Tabs',
  category: 'display',
  kit: 'boardui',
  tags: ['tabs', 'code', 'preview', 'docs', 'boardui'],
  blurb:
    'Docs Preview / Code switcher: a pill tab track with a sliding thumb over a bordered live stage and a highlighted, copyable source.',
  cost: 'dom',
  motif: 'split',

  files: [{ path: 'registry/ui/preview-code-tabs.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'The two-tab frame that sits at the top of a component docs page. A grey pill track holds "Preview" and "Code" tabs, with a white thumb that slides to the selected tab. Below it, a bordered stage renders the live example centred, or a code block shows the example source with line numbers and copy. The preview stays mounted while the code tab is open, so whatever the reader did to the example survives a look at the code.',

  mechanism: [
    'React Aria `Tabs`, `TabList`, `Tab` and `TabPanel` supply the roles, `aria-controls` wiring, roving focus and arrow, Home and End keys. Selection is controlled through `selectedTab` or uncontrolled through `defaultSelectedTab`, and only the two known keys reach `onSelectedTabChange`.',
    'A collection can only contain `Tab` children, so the thumb is a sibling of the `TabList` inside a positioned track. A layout effect reads the selected tab\'s `offsetLeft`, `offsetTop`, `offsetWidth` and `offsetHeight` and applies them as a translate plus width and height, which a 200ms `ease-out` transition animates.',
    'A `MutationObserver` filtered to `data-selected` re-measures on every selection change, controlled or not. A `ResizeObserver` on the track and each tab re-measures when fonts load or labels change. The state setter returns the previous object when nothing moved, so the observers never cause a render loop.',
    'The preview `TabPanel` uses `shouldForceMount`. While the code tab is selected, React Aria marks it `inert` and the render-prop class adds `hidden`, so it leaves focus order and layout but keeps its React state.',
    'The code tab renders the kit `CodeBlock` (TSX tokenizer, line numbers, wrap toggle, copy) with the `filename` chip and a `codeMaxHeight` cap. The `actions` slot at the end of the tab row takes extra controls such as a copy or open-in-new-tab button.',
  ],

  constants: [
    { name: 'thumb transition', value: '200 ms ease-out on transform, width, height', why: 'Fast enough to keep up with arrow-key presses, and slow enough that the eye can follow the thumb between two tabs of different widths.' },
    { name: 'track / thumb radii', value: 'rounded-xl track, p-1, rounded-lg thumb', why: 'The thumb sits 4px inside the track, so a 12px outer and 8px inner radius stay concentric.' },
    { name: 'stage', value: 'rounded-[20px], border-button-default, background-full, p-6 to p-10, minHeight 320 (code panel too)', why: 'The code panel shares the floor so the page does not jump between tabs. A calm, slightly rounder frame than the cards it shows, with room on every side so a centred example never touches the edge.' },
    { name: 'codeMaxHeight', value: '420 px', why: 'Long sources scroll inside the panel rather than pushing the rest of the page down when the reader switches tabs.' },
  ],

  pitfalls: [
    'Putting the thumb inside `TabList`. React Aria builds the tab collection from its children, and anything that is not a `Tab` breaks the collection. The thumb lives next to the list, in the positioned track.',
    'Unmounting the preview on tab change. Any state the reader built up in the example (a toggled option, a typed value) would reset every time they glanced at the code. `shouldForceMount` together with `hidden` on `isInert` avoids this.',
    'Measuring with `getBoundingClientRect` relative to the viewport. Page scroll and transforms on ancestors would leak into the thumb position. Offsets relative to the track do not have that problem.',
  ],

  notes: [
    'Labels are props (`previewLabel`, `codeLabel`), and the list name defaults to "Example view".',
    'Pass `language="plain"` for examples that are not TSX, such as CSS or shell output.',
  ],

  apiSignature:
    'type PreviewCodeTab = "preview" | "code";\nfunction PreviewCodeTabs(props: { children: ReactNode; code: string; filename?: string; language?: "tsx" | "plain"; selectedTab?: PreviewCodeTab; defaultSelectedTab?: PreviewCodeTab; onSelectedTabChange?: (tab: PreviewCodeTab) => void; actions?: ReactNode; previewLabel?: string; codeLabel?: string; "aria-label"?: string; minHeight?: number; codeMaxHeight?: number; onCopied?: (code: string) => void; previewClassName?: string; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'The live example, centred in the preview stage.' },
    { name: 'code', type: 'string', description: 'Source shown on the Code tab and copied by its copy button.' },
    { name: 'filename', type: 'string', description: 'Chip label above the code, such as `usage` or `line-chart-card.tsx`.' },
    { name: 'language', type: '"tsx" | "plain"', default: '"tsx"', description: 'Highlight as TSX or print as is.' },
    { name: 'selectedTab / defaultSelectedTab / onSelectedTabChange', type: '"preview" | "code"', default: 'uncontrolled, "preview"', description: 'Controlled or uncontrolled tab selection.' },
    { name: 'actions', type: 'ReactNode', description: 'Controls at the end of the tab row.' },
    { name: 'previewLabel / codeLabel', type: 'string', default: '"Preview" / "Code"', description: 'Tab labels.' },
    { name: 'minHeight', type: 'number', default: '320', description: 'Minimum height of the preview stage, in px.' },
    { name: 'codeMaxHeight', type: 'number', default: '420', description: 'Height cap of the code panel, in px.' },
    { name: 'onCopied', type: '(code: string) => void', description: 'Called after the code panel copies.' },
  ],

  reducedMotion:
    'The only movement is the thumb slide. With `prefers-reduced-motion: reduce` the thumb has `motion-reduce:transition-none` and jumps straight to the selected tab. The tab text colour change stays because it is not motion.',

  cleanup:
    'The layout effect disconnects its `ResizeObserver` and `MutationObserver` on unmount. There are no timers. The code panel copy timer belongs to `CodeBlock` and is cleared there.',

  acceptance:
    'The Preview tab is selected on load and the white thumb sits under it. Clicking Code, or pressing the Right arrow with the list focused, slides the thumb under Code (200ms, instant with reduced motion), shows the highlighted source and sets `aria-selected="true"` on the Code tab. Returning to Preview shows the example with its state intact. The code panel copy button puts the exact `code` string on the clipboard.',

  criticalRegion: 'critical',
};

export default meta;
