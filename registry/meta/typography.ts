import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'typography',
  title: 'Typography',
  category: 'display',
  kit: 'boardui',
  tags: ['typography', 'type-scale', 'specimen', 'tokens', 'docs', 'boardui'],
  blurb:
    'Type-scale specimen of the 13 kit text families in four weights, with size and line height read from the live CSS and copyable class names.',
  cost: 'css',
  motif: 'stack',

  files: [{ path: 'registry/ui/typography.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A docs specimen for the kit composite text utilities (`text-{family}-{weight}`). Each family gets a heading with its size, line height and tracking, a one-line usage note, and a bordered card with one row per weight: the sample sentence on the left, and the class name and weight on the right. The numbers are not typed into the component. They are read with `getComputedStyle` from the rendered rows, so the specimen always shows what the theme CSS resolves to. Clicking a class name copies it.',

  mechanism: [
    '`TYPE_SCALE` lists the 13 families from Large Title to Caption 2. Each has its four class names written out in full (`text-body-medium`, not `text-body-${w}`), because Tailwind only emits utilities it finds as literal strings in the source.',
    '`TypeFamilySection` renders one `<li>` per requested weight. The sample `<p>` gets the composite class and a callback ref stored in `sampleRefs[i]`.',
    'After mount, and again whenever the family or the weight list changes, an effect runs `readTypeMetrics` on every sample element. It turns `fontSize`, `lineHeight`, `letterSpacing` and `fontWeight` into numbers and stores them in state. A window `resize` listener re-reads them, because zoom and responsive root sizes arrive that way.',
    '`formatFamilyMetrics` builds the header string from the measured rows, for example `18px / 24–26px` for Title 3. It shows a range when the weights have different line heights, and adds `· tracking 0.15px` when letter spacing is not zero. Each row shows its own measured weight number next to the weight name.',
    '`TokenCopy` is a mono button holding the class name. It copies through `useCopyToClipboard` and shows a lime check for 1.4s. `Typography` stacks one section per family id with a 40px gap.',
  ],

  constants: [
    { name: 'families', value: '13 × 4 weights = 52 utilities', why: 'This mirrors the `@theme` block in boardui-theme.css. A family missing from `TYPE_SCALE` would never be emitted, because its class names would appear nowhere in the source.' },
    { name: 'row', value: 'px-4 py-4, 1px border-button-default between rows, rounded-2xl card', why: 'This matches the reference card. The divider and corner radius are the same ones the code block and install box use.' },
    { name: 'metric header', value: 'font-mono caption-1, text-tertiary', why: 'Measured numbers read as data next to the title-2 family name, the same as the reference "64px / 80px".' },
    { name: 'copy reset', value: '1400 ms', why: 'The check only needs to confirm the click, and many class names get copied in a row.' },
  ],

  pitfalls: [
    'Building class names with template strings (`text-${family}-${weight}`). Tailwind never sees them, the utilities are not generated, and every row renders in the inherited body size.',
    'Measuring in render or during SSR. `getComputedStyle` only exists after layout. Measuring in an effect means the server and the first client render both show a placeholder, so hydration still matches.',
    'Trusting a hard-coded metrics table. Title 3 uses a 24px line height for regular and 26px for heavier weights, and a table drifts as soon as a token changes. Reading the CSS keeps the specimen correct.',
  ],

  notes: [
    '`readTypeMetrics` and `formatFamilyMetrics` are exported for other token docs, for example a size badge next to a heading in a design review.',
    'Pass `families={["body", "body-2"]}` and `weights={["regular", "medium"]}` to show a focused subset in a component page.',
  ],

  apiSignature:
    'type TypeWeight = "regular" | "medium" | "semibold" | "bold";\nfunction Typography(props: { families?: readonly string[]; weights?: readonly TypeWeight[]; sample?: string; headingLevel?: 2 | 3 | 4; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element\nfunction TypeFamilySection(props: { family: TypeFamily; weights?: readonly TypeWeight[]; sample?: string; headingLevel?: 2 | 3 | 4; className?: string }): JSX.Element\nfunction readTypeMetrics(element: Element): { fontSize: number; lineHeight: number; letterSpacing: number; fontWeight: number }\nconst TYPE_SCALE: readonly TypeFamily[]',

  props: [
    { name: 'families', type: 'readonly string[]', default: 'all 13', description: 'Family ids to show (`large-title`, `display-1` … `caption-2`), kept in scale order.' },
    { name: 'weights', type: 'readonly TypeWeight[]', default: '["regular", "medium", "semibold", "bold"]', description: 'Weights shown in each family card.' },
    { name: 'sample', type: 'string', default: '"The five boxing wizards jump quickly."', description: 'Sentence rendered in every row.' },
    { name: 'headingLevel', type: '2 | 3 | 4', default: '3', description: 'Heading level of each family name.' },
    { name: 'className', type: 'string', description: 'Extra classes on the outer stack.' },
  ],

  reducedMotion:
    'Nothing moves. Only the copy button hover colour transitions, and it has `motion-reduce:transition-none`.',

  cleanup:
    'Each family section adds one window `resize` listener in its effect and removes it on unmount or before the next run. The copy reset timer in `useCopyToClipboard` is cleared on unmount.',

  acceptance:
    'Rendering `<Typography families={["title-3"]} />` shows a "Title 3" heading followed by `18px / 24–26px`, and four rows whose samples are visibly 18px regular, medium, semibold and bold. The rows are labelled `text-title-3-regular` … `text-title-3-bold` with "Regular · 400" … "Bold · 700". Caption 1 shows `12px / 16px · tracking 0.15px`. Clicking a class name puts that exact string on the clipboard and shows a check. Changing `sample` updates every row, and switching families re-measures the header.',

  criticalRegion: 'critical',
};

export default meta;
