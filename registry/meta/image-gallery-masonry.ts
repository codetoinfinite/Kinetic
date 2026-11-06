/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Gallery Masonry" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'image-gallery-masonry',
  title: 'Image Gallery Masonry',
  category: 'display',
  kit: 'boardui',
  tags: ['gallery', 'masonry', 'lightbox', 'ai', 'image-generation', 'favourite', 'boardui'],
  blurb:
    'A masonry wall of generated images with hover captions, a favourite toggle, a safe download action and a modal lightbox with paging.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/image-gallery-masonry.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/ui/image-gallery-masonry-art.tsx',
      type: 'registry:ui',
      role: 'sample artwork: GalleryItem type, GALLERY_ITEMS and the inline-SVG GalleryArt',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'The gallery wall of an image-generation app. Pictures of different aspect ratios stack in CSS columns so they interlock without measuring, and hovering or focusing one raises a caption scrim and two round actions: a favourite heart and a download button. Clicking a picture opens it in the kit Modal with its caption, a counter, previous / next buttons and arrow-key paging. The twelve sample pictures are inline SVG illustrations, so nothing loads from the network.',

  mechanism: [
    'The wall is a `<ul>` with `columns-2 sm:columns-3` (overridable through `columnsClassName`). Each `<li>` is `break-inside-avoid` with a bottom margin, and its open button carries the item\'s CSS `aspect-ratio`, so the browser balances the columns from the ratios alone with no JavaScript layout.',
    'The tile is a `group/tile`. The caption scrim (`bg-linear-to-t from-black/65`) and the action row start at opacity 0 and turn visible on `group-hover/tile` and `group-focus-within/tile`, so keyboard users get the same reveal as pointer users. A `[@media(hover:none)]` variant keeps them shown on touch screens, and a favourited tile keeps its heart visible.',
    'The open button, the favourite and the download are siblings inside the `<li>`, never nested, so each is its own tab stop with its own label. Favourite is a toggle button with `aria-pressed` and a filled rose heart when on. Download uses `aria-disabled` rather than `disabled`, so it stays focusable and its label says why it is not ready, and its click handler does nothing unless `onDownload` exists and the item is not `downloadable: false`.',
    'Favourites can be controlled (`favourites` + `onFavouritesChange`) or left to an internal `Set`. The toggle always builds a new `Set`, so a parent can filter on it, as the demo\'s Favourites view does.',
    'The lightbox is the kit `Modal` at size `lg`, opened by an `isOpen` flag and showing the item whose id is stored separately. Tracking an id rather than an index keeps the right picture when the list is filtered underneath, and keeping the id after closing lets the content stay in place while the Modal animates out. Paging wraps around both ends, and a `keydown` listener for ArrowLeft / ArrowRight is attached only while the lightbox is open.',
    'Each paged picture is keyed by its id inside an `animate-number-fade` wrapper, so it cross-fades in over 220ms. On hover the tile art scales to 1.04 over 500ms inside the clipped tile.',
  ],

  constants: [
    {
      name: 'columns and gaps',
      value: 'columns-2, 3 from sm (demo: 4 from md); 12px gap and 12px bottom margin',
      why: 'Two columns keep tiles near 160px wide on a phone; three or four suit the panel widths of an app sidebar or a full page. Matching gap and margin keeps the vertical and horizontal gutters equal.',
    },
    {
      name: 'caption scrim',
      value: 'black 65% → transparent, 32px top padding, rises 8px over 200ms',
      why: 'Dark enough for white caption text on any picture, short enough to cover only the bottom of the tile. The 8px rise reads as the caption arriving, not the image moving.',
    },
    {
      name: 'tile actions',
      value: '32px round buttons, 90% surface with backdrop blur, active scale 0.9',
      why: 'Large enough to tap, light enough not to hide the picture, and the press scale gives feedback on the toggle before the heart fills.',
    },
    {
      name: 'lightbox frame',
      value: 'Modal lg (640px), picture height min(52vh, 400px) at its own ratio',
      why: 'Leaves room for the header and the paging row on a laptop screen while keeping tall portraits whole.',
    },
  ],

  pitfalls: [
    'Nesting the favourite and download buttons inside the open button. Interactive content inside a button is invalid, screen readers merge the labels and the clicks bubble into opening the lightbox. They are siblings positioned over the tile.',
    'Using `disabled` for an unavailable download. It drops out of the tab order and a hover title never shows, so nobody learns why. `aria-disabled` keeps it focusable and the label explains it.',
    'Clearing the open item when the Modal closes. The content would vanish before the exit animation ends. Only `isOpen` flips; the id stays until another picture is opened.',
    'Expecting row-first reading order. CSS columns fill top to bottom, so tab order runs down the first column, then the next. Use a grid if strict row order matters more than the interlocking layout.',
  ],

  notes: [
    '`GALLERY_ITEMS`, `GalleryArt` and the `GalleryItem` type are re-exported from the main file, so a prompt composer or a loader can show the same pictures.',
    'Pass your own items with real images by replacing `GalleryArt` in a fork; the tile only needs `ratio` and a child that fills the box.',
  ],

  apiSignature:
    'function ImageGalleryMasonry(props: ImageGalleryMasonryProps): JSX.Element\ninterface ImageGalleryMasonryProps { items?: GalleryItem[]; favourites?: ReadonlySet<string>; defaultFavourites?: Iterable<string>; onFavouritesChange?: (next: Set<string>) => void; onDownload?: (item: GalleryItem) => void; columnsClassName?: string; className?: string }\ninterface GalleryItem { id: string; title: string; style: string; ratio: string; kind: GalleryArtKind; palette: readonly [string, string, string, string]; halftone?: boolean; downloadable?: boolean }',

  props: [
    { name: 'items', type: 'GalleryItem[]', default: 'GALLERY_ITEMS', description: 'Pictures in display order; each sets its own aspect ratio.' },
    { name: 'favourites', type: 'ReadonlySet<string>', description: 'Controlled favourite ids.' },
    { name: 'defaultFavourites', type: 'Iterable<string>', description: 'Initial favourite ids when uncontrolled.' },
    { name: 'onFavouritesChange', type: '(next: Set<string>) => void', description: 'Called with a new set after every toggle.' },
    { name: 'onDownload', type: '(item: GalleryItem) => void', description: 'Download handler. Without it, or for an item with `downloadable: false`, the button is aria-disabled.' },
    { name: 'columnsClassName', type: 'string', default: '"columns-2 sm:columns-3"', description: 'Tailwind column-count classes for the wall.' },
    { name: 'className', type: 'string', description: 'Merged onto the list.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion the tile art does not zoom on hover, the caption appears without rising or fading, the actions appear without a fade, and the lightbox picture swaps without a cross-fade. The kit Modal keeps its opacity fade and drops its scale and blur.',

  cleanup:
    'The only listener is the lightbox\'s window `keydown`, added in an effect while the lightbox is open and removed on close, on every re-render and on unmount. The Modal\'s overlay, focus trap and scroll lock are handled by React Aria.',

  acceptance:
    'Twelve flat illustrations of different heights interlock in columns. Hovering one zooms it slightly, raises its title and style over a dark scrim and shows a heart and a download button. The heart toggles (aria-pressed, rose fill) and the Favourites count updates; the Favourites view shows only hearted pictures. Download on a ready picture updates the status line; on "Underwater highway" it does nothing. Clicking a picture opens a 640px lightbox with the title, style, "n / 12", previous and next buttons; the arrow keys page it, wrapping at the ends, and Escape closes it.',

  criticalRegion: 'critical',
};

export default meta;
