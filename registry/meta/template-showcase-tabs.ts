import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'template-showcase-tabs',
  title: 'Template Showcase Tabs',
  category: 'block',
  kit: 'boardui',
  tags: ['tabs', 'templates', 'landing', 'marketing', 'showcase', 'boardui'],
  blurb:
    'Landing section with a framed card of template tabs: a pill slides to the chosen tab and miniature app layouts crossfade below it.',
  cost: 'css',
  motif: 'split',

  files: [
    { path: 'registry/ui/template-showcase-tabs.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The "templates" section of a product landing page: a centred header (Pro pill, title, copy, CTA) over a rounded card. The card holds a horizontally scrollable row of icon tabs with an action slot on the right (e.g. "Live preview"), and a large preview well where each tab shows a miniature app layout drawn with plain divs. A soft blue pill slides under the selected tab and the previews crossfade instead of popping.',

  mechanism: [
    'Tabs: react-aria-components `Tabs` / `TabList` / `Tab` / `TabPanel`, so arrow keys, Home/End, roving focus and the tab/tabpanel wiring come for free. Selection is controlled internally (or by `selectedKey`) so the component always knows which tab to measure.',
    'Sliding pill: after every selection change a layout effect finds `[role=tab][data-selected]` and stores its `offsetLeft` / `offsetWidth`. The pill is an absolutely positioned span inside the scrolling strip, placed with `translate` and `width` and transitioned over 300ms. Offset metrics are layout values, so the pill stays aligned inside CSS-scaled previews where `getBoundingClientRect` would not. A ResizeObserver on the strip and on each tab re-measures when fonts load or labels change.',
    'Crossfade: every `TabPanel` uses `shouldForceMount`, and all panels share one grid cell (`col-start-1 row-start-1`). react-aria marks unselected panels `inert` and `data-inert`; `data-inert:` turns them `invisible`, `opacity-0` and `scale-[0.985]` with a 300ms transition on opacity, scale and visibility. The outgoing preview fades while the incoming one fades in on top of it, and the inert ones are out of the tab order and the accessibility tree.',
    'Overflow: the strip scrolls sideways with its scrollbar hidden. A scroll listener records whether there is content before or after the viewport and adds `mask-l-from` / `mask-r-from` edge fades only on those sides. When selection moves to a tab that is clipped, the strip scrolls just enough (24px margin) to reveal it with `scrollTo`, never `scrollIntoView`, so the page itself does not jump.',
    'Previews are wrapped in `role="img"` with an `aria-label` of "<label> template preview": they are pictures of an app, not working UI.',
  ],

  constants: [
    { name: 'pill transition', value: '300ms cubic-bezier(0.22,1,0.36,1)', why: 'Fast start, long settle: the pill arrives before the crossfade finishes, which reads as cause then effect.' },
    { name: 'crossfade', value: '300ms ease-out, scale 0.985 → 1', why: 'A tiny scale keeps the change noticeable when two previews share a similar layout.' },
    { name: 'edge fade', value: 'mask from calc(100% − 3rem)', why: 'Signals more tabs offscreen without hiding the label under the action button.' },
    { name: 'preview height', value: '460px / 540px @3xl', why: 'Tall enough for a sidebar app layout to read; all panels share it so the card never changes height on switch.' },
  ],

  pitfalls: [
    'Measuring tabs with `getBoundingClientRect` inside a scaled preview: the pill lands in the wrong place by the scale factor. Use offset metrics.',
    'Rendering only the selected panel: nothing exists to fade out, so the swap pops. Force-mount the panels and fade by `data-inert`.',
    'Fading with opacity alone: invisible panels are still on top for hit testing and still measured as "visible" by tests. Transition `visibility` with the opacity.',
    'Calling `scrollIntoView` on the selected tab also scrolls the page vertically when the card is partly offscreen; set the strip\'s `scrollLeft` instead.',
  ],

  notes: [
    'The demo draws seven template previews (agentic chat, image generation, kanban board, marketing, contributor profile, healthcare, analytics) from divs, tokens and a few kit parts (Avatar, Chip). Inside the preview, `@container/preview` queries hide the sidebar and aside on narrow screens.',
    '`action` accepts a function of the selected item, so a "Live preview" button can label or link itself per template.',
    '`TemplateShowcase` is the optional centred header wrapper; the tabs card works on its own.',
  ],

  apiSignature:
    'function TemplateShowcaseTabs(props: { items: { id: string; label: string; icon?: ComponentType<{ className?: string }>; preview: ReactNode }[]; selectedKey?: string; defaultSelectedKey?: string; onSelectionChange?: (id: string) => void; action?: ReactNode | ((item) => ReactNode); "aria-label"?: string; className?: string }): JSX.Element\nfunction TemplateShowcase(props: { eyebrow?: ReactNode; title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }): JSX.Element',

  props: [
    { name: 'items', type: 'TemplateShowcaseItem[]', description: '`{ id, label, icon?, preview }` per tab; `preview` is the miniature layout.' },
    { name: 'selectedKey', type: 'string', description: 'Controlled selected tab id.' },
    { name: 'defaultSelectedKey', type: 'string', default: 'items[0].id', description: 'Initial tab when uncontrolled.' },
    { name: 'onSelectionChange', type: '(id: string) => void', description: 'Called when the tab changes.' },
    { name: 'action', type: 'ReactNode | (item) => ReactNode', description: 'Right side of the tab bar.' },
    { name: 'aria-label', type: 'string', default: '"Templates"', description: 'Label for the tab list.' },
  ],

  reducedMotion:
    'The pill jumps to the selected tab and panels switch without the fade or scale (both transitions are omitted); the tab strip scrolls with `behavior: "auto"`.',

  cleanup:
    'The layout effect disconnects its ResizeObserver and removes the strip scroll listener on every re-run and on unmount.',

  acceptance:
    'At 1280px the card shows seven tabs with Agentic chat on the blue pill and a chat app preview below. Clicking Project board slides the pill there and crossfades to a four-column kanban; arrow keys move between tabs the same way. The Live preview button label follows the tab. At 390px the strip scrolls sideways with an edge fade, selecting a clipped tab scrolls it into view, and the previews drop their sidebars.',

  criticalRegion: 'critical',
};

export default meta;
