import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'device-preview-frame',
  title: 'Device Preview Frame',
  category: 'display',
  kit: 'boardui',
  tags: ['preview', 'frame', 'responsive', 'device', 'showcase', 'boardui'],
  blurb:
    'Browser-window frame that lays any content out at a device width and scales it in; a Desktop/Tablet/Mobile toggle resizes it live.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/device-preview-frame.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A rounded app-window frame (three chrome dots, a lock-and-address pill, a refresh glyph) around a screen that shows real content laid out at a device width: 1280px for desktop, 768 for tablet, 375 for mobile, scaled down to fit the space. A segmented Desktop / Tablet / Mobile toggle above it narrows or widens the frame, and the content reflows continuously while it does, like dragging a window edge. Because the screen is a size container named `frame`, children respond with `@…/frame:` container queries.',

  mechanism: [
    'One virtual width `p` drives the whole fit. With `available` the measured row width, the scale is `s = min(1, (available − 16) / p)`; the frame is set to `p · s + 16` px wide (16 = frame border, padding and screen border), the content box to `p` px wide and `height / s` px tall, with `scale: s` from its top-left corner. Content therefore always fills the screen exactly, and a narrow device is shown at up to 1:1 instead of shrinking with the desktop.',
    'Device switch: a rAF loop tweens `p` from the old device width to the new one over 560ms with `easeOutQuart` and writes the four styles straight to the DOM each frame, with no React re-render. Frame width and content width derive from the same number, so they cannot drift apart mid-animation the way two independent CSS transitions would when the scale also changes.',
    '`available` comes from a ResizeObserver content box on the row that holds the frame: layout pixels, unaffected by transforms, so the fit is correct inside CSS-scaled previews. Resizing the page re-applies the fit at the current `p` (mid-tween included).',
    'Toggle: the kit `SegmentedControl` (react-aria ToggleButtonGroup with a sliding thumb). It works controlled (`device` plus `onDeviceChange`) or uncontrolled (`defaultDevice`). The root carries `data-device` for styling and tests.',
    'The screen scrolls vertically inside the frame (`overflow-y-auto`, `overscroll-contain`), so tall pages can be explored without scrolling the host page.',
  ],

  constants: [
    { name: 'device widths', value: '1280 / 768 / 375 px', why: 'Common laptop, portrait tablet and phone CSS widths; each hits a different container-query step in typical layouts.' },
    { name: 'tween', value: '560ms easeOutQuart', why: 'Most of the reflow happens in the first third, so the result is readable quickly while the frame settles softly.' },
    { name: 'chrome', value: '16px horizontal', why: 'Border + 6px padding + screen border; subtracted before computing the scale so content never overflows the screen.' },
    { name: 'max scale', value: '1', why: 'Content is never enlarged; a phone width in a wide container is shown at true size.' },
  ],

  pitfalls: [
    'Animating the frame width and the content scale as two CSS transitions. When both the virtual width and the scale change, their product is not linear in time and the content overflows or leaves a gap mid-animation. Derive both from one tweened width.',
    'Fitting with `getBoundingClientRect`: inside a scaled parent it returns scaled sizes and the computed scale compounds. Measure layout boxes.',
    'Using `md:`/`lg:` media queries inside the previewed content. They follow the real window, not the frame; use `@…/frame:` container queries.',
    'Using `transform: scale()` on the content while it also has its own transforms; the standalone `scale` property composes cleanly.',
  ],

  notes: [
    'The demo previews a small dashboard: sidebar and two-column body at desktop, sidebar gone at tablet, single column at mobile.',
    'Pass `showToggle={false}` with a controlled `device` to drive it from elsewhere, e.g. the tabs of a template showcase.',
    '`DEVICE_WIDTHS` is exported, and `widths` overrides any of them.',
  ],

  apiSignature:
    'function DevicePreviewFrame(props: { children: ReactNode; device?: "desktop" | "tablet" | "mobile"; defaultDevice?: PreviewDevice; onDeviceChange?: (device: PreviewDevice) => void; widths?: Partial<Record<PreviewDevice, number>>; height?: number; url?: string; showToggle?: boolean; toolbar?: ReactNode; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Content laid out at the device width; may use `@…/frame:` container queries.' },
    { name: 'device', type: '"desktop" | "tablet" | "mobile"', description: 'Controlled device.' },
    { name: 'defaultDevice', type: 'PreviewDevice', default: '"desktop"', description: 'Initial device when uncontrolled.' },
    { name: 'onDeviceChange', type: '(device) => void', description: 'Called when the toggle changes.' },
    { name: 'widths', type: 'Partial<Record<PreviewDevice, number>>', description: 'Override device CSS widths.' },
    { name: 'height', type: 'number', default: '420', description: 'Visible screen height in px, constant across devices.' },
    { name: 'url', type: 'string', default: '"app.example.com"', description: 'Text in the address pill.' },
    { name: 'showToggle', type: 'boolean', default: 'true', description: 'Show the device toggle.' },
    { name: 'toolbar', type: 'ReactNode', description: 'Extra controls beside the toggle.' },
  ],

  reducedMotion:
    'The device switch applies the new width at once (no tween); the kit SegmentedControl drops its thumb slide under the same preference.',

  cleanup:
    'The ResizeObserver disconnects on unmount, and any running animation frame is cancelled when the device changes again or the frame unmounts.',

  acceptance:
    'At 1280px the frame fills the row and shows the dashboard with a sidebar and a two-column body. Choosing Tablet narrows the frame over about half a second while the content reflows: the sidebar disappears and the body stacks. Mobile narrows it further to a single column at true 375px width. Desktop restores it. At 360px the frame still fits, just smaller. Light and dark both read.',

  criticalRegion: 'critical',
};

export default meta;
