# Build: Image Gallery Masonry

The gallery wall of an image-generation app. Pictures of different aspect ratios stack in CSS columns so they interlock without measuring, and hovering or focusing one raises a caption scrim and two round actions: a favourite heart and a download button. Clicking a picture opens it in the kit Modal with its caption, a counter, previous / next buttons and arrow-key paging. The twelve sample pictures are inline SVG illustrations, so nothing loads from the network.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A masonry wall of generated images with hover captions, a favourite toggle, a safe download action and a modal lightbox with paging.

- Category: display
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. The wall is a `<ul>` with `columns-2 sm:columns-3` (overridable through `columnsClassName`). Each `<li>` is `break-inside-avoid` with a bottom margin, and its open button carries the item's CSS `aspect-ratio`, so the browser balances the columns from the ratios alone with no JavaScript layout.
2. The tile is a `group/tile`. The caption scrim (`bg-linear-to-t from-black/65`) and the action row start at opacity 0 and turn visible on `group-hover/tile` and `group-focus-within/tile`, so keyboard users get the same reveal as pointer users. A `[@media(hover:none)]` variant keeps them shown on touch screens, and a favourited tile keeps its heart visible.
3. The open button, the favourite and the download are siblings inside the `<li>`, never nested, so each is its own tab stop with its own label. Favourite is a toggle button with `aria-pressed` and a filled rose heart when on. Download uses `aria-disabled` rather than `disabled`, so it stays focusable and its label says why it is not ready, and its click handler does nothing unless `onDownload` exists and the item is not `downloadable: false`.
4. Favourites can be controlled (`favourites` + `onFavouritesChange`) or left to an internal `Set`. The toggle always builds a new `Set`, so a parent can filter on it, as the demo's Favourites view does.
5. The lightbox is the kit `Modal` at size `lg`, opened by an `isOpen` flag and showing the item whose id is stored separately. Tracking an id rather than an index keeps the right picture when the list is filtered underneath, and keeping the id after closing lets the content stay in place while the Modal animates out. Paging wraps around both ends, and a `keydown` listener for ArrowLeft / ArrowRight is attached only while the lightbox is open.
6. Each paged picture is keyed by its id inside an `animate-number-fade` wrapper, so it cross-fades in over 220ms. On hover the tile art scales to 1.04 over 500ms inside the clipped tile.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `columns and gaps = columns-2, 3 from sm (demo: 4 from md); 12px gap and 12px bottom margin`
  Two columns keep tiles near 160px wide on a phone; three or four suit the panel widths of an app sidebar or a full page. Matching gap and margin keeps the vertical and horizontal gutters equal.
- `caption scrim = black 65% → transparent, 32px top padding, rises 8px over 200ms`
  Dark enough for white caption text on any picture, short enough to cover only the bottom of the tile. The 8px rise reads as the caption arriving, not the image moving.
- `tile actions = 32px round buttons, 90% surface with backdrop blur, active scale 0.9`
  Large enough to tap, light enough not to hide the picture, and the press scale gives feedback on the toggle before the heart fills.
- `lightbox frame = Modal lg (640px), picture height min(52vh, 400px) at its own ratio`
  Leaves room for the header and the paging row on a laptop screen while keeping tall portraits whole.

## API

```ts
function ImageGalleryMasonry(props: ImageGalleryMasonryProps): JSX.Element
interface ImageGalleryMasonryProps { items?: GalleryItem[]; favourites?: ReadonlySet<string>; defaultFavourites?: Iterable<string>; onFavouritesChange?: (next: Set<string>) => void; onDownload?: (item: GalleryItem) => void; columnsClassName?: string; className?: string }
interface GalleryItem { id: string; title: string; style: string; ratio: string; kind: GalleryArtKind; palette: readonly [string, string, string, string]; halftone?: boolean; downloadable?: boolean }
```

- `items: GalleryItem[]` — default `GALLERY_ITEMS`
  Pictures in display order; each sets its own aspect ratio.
- `favourites: ReadonlySet<string>`
  Controlled favourite ids.
- `defaultFavourites: Iterable<string>`
  Initial favourite ids when uncontrolled.
- `onFavouritesChange: (next: Set<string>) => void`
  Called with a new set after every toggle.
- `onDownload: (item: GalleryItem) => void`
  Download handler. Without it, or for an item with `downloadable: false`, the button is aria-disabled.
- `columnsClassName: string` — default `"columns-2 sm:columns-3"`
  Tailwind column-count classes for the wall.
- `className: string`
  Merged onto the list.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ImageGalleryMasonry({
  items = GALLERY_ITEMS,
  favourites: favouritesProp,
  defaultFavourites,
  onFavouritesChange,
  onDownload,
  columnsClassName = "columns-2 sm:columns-3",
  className,
}: ImageGalleryMasonryProps) {
  const [ownFavourites, setOwnFavourites] = useState<Set<string>>(() => new Set(defaultFavourites));
  const favourites = favouritesProp ?? ownFavourites;
  // The lightbox tracks an id, not an index, so filtering or reordering the
  // items while it is open never shows the wrong picture. The id outlives
  // `isOpen` so the picture stays put while the Modal animates out.
  const [openId, setOpenId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const openIndex = openId === null ? -1 : items.findIndex((item) => item.id === openId);
  const current = openIndex >= 0 ? items[openIndex] : undefined;
  const open = isOpen && current !== undefined;

  const toggleFavourite = (id: string) => {
    const next = new Set(favourites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (favouritesProp === undefined) setOwnFavourites(next);
    onFavouritesChange?.(next);
  };

  const step = (delta: number) => {
    if (openIndex < 0 || items.length === 0) return;
    const next = items[(openIndex + delta + items.length) % items.length];
    if (next) setOpenId(next.id);
  };

  // Arrow keys page the lightbox while it is open; the listener lives only
  // as long as the lightbox does (re-bound each render so `step` is fresh).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <ul className={cx("gap-3 [&>li]:mb-3", columnsClassName, className)}>
        {items.map((item) => {
          const fav = favourites.has(item.id);
          return (
            <li key={item.id} className="group/tile relative break-inside-avoid overflow-hidden rounded-xl bg-background-tertiary-default">
              <button
                type="button"
                onClick={() => {
                  setOpenId(item.id);
                  setIsOpen(true);
                }}
                aria-label={`Open ${captionOf(item)}`}
                className="block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset"
                style={{ aspectRatio: item.ratio }}
              >
                <GalleryArt
                  item={item}
                  className="transition-transform duration-500 ease-out group-hover/tile:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover/tile:scale-100"
                />
              </button>
              {/* Caption: a bottom scrim that rises on hover or keyboard focus.
                  Touch screens without hover keep it shown. */}
              <div
                aria-hidden
                className={cx(
                  "pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/65 to-transparent px-3 pt-8 pb-2.5",
                  "translate-y-2 opacity-0 transition-[opacity,translate] duration-200 ease-out motion-reduce:translate-y-0 motion-reduce:transition-none",
                  "group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100",
                  "[@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
                )}
              >
                <p className="truncate text-caption-1-medium text-text-white">{item.title}</p>
                <p className="truncate text-caption-2-regular text-text-white/75">{item.style}</p>
              </div>
              <div
                className={cx(
                  "absolute top-2 right-2 flex gap-1.5 transition-opacity duration-200 ease-out motion-reduce:transition-none",
                  "opacity-0 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100 [@media(hover:none)]:opacity-100",
                  // A favourite keeps its heart on show.
                  fav && "opacity-100",
                )}
              >
                <FavouriteButton item={item} on={fav} onToggle={() => toggleFavourite(item.id)} />
                <DownloadButton item={item} onDownload={onDownload} />
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        isOpen={open}
        onOpenChange={setIsOpen}
        size="lg"
      >
        {current ? (
          <>
            <ModalHeader title={current.title} description={current.style} />
            <ModalBody className="flex flex-col gap-4">
              <div className="flex h-[min(52vh,400px)] items-center justify-center">
                <div
                  key={current.id}
                  className="h-full max-w-full animate-number-fade overflow-hidden rounded-2xl motion-reduce:animate-none"
                  style={{ aspectRatio: current.ratio }}
                >
                  <GalleryArt item={current} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 pb-1">
                <div className="flex items-center gap-2">
                  <IconButton icon={RiArrowLeftSLine} size="small" aria-label="Previous image" onClick={() => step(-1)} />
                  <span className="min-w-12 text-center text-body-2-medium text-text-secondary tabular-nums" aria-live="polite">
                    {openIndex + 1} / {items.length}
                  </span>
                  <IconButton icon={RiArrowRightSLine} size="small" aria-label="Next image" onClick={() => step(1)} />
                </div>
                <div className="flex items-center gap-2">
                  <FavouriteButton
                    item={current}
                    on={favourites.has(current.id)}
                    onToggle={() => toggleFavourite(current.id)}
                    className="border border-border-button-default bg-background-primary-default shadow-none"
                  />
                  <DownloadButton
                    item={current}
                    onDownload={onDownload}
                    className="border border-border-button-default bg-background-primary-default shadow-none"
                  />
                </div>
              </div>
            </ModalBody>
          </>
        ) : null}
      </Modal>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The only listener is the lightbox's window `keydown`, added in an effect while the lightbox is open and removed on close, on every re-render and on unmount. The Modal's overlay, focus trap and scroll lock are handled by React Aria.

**Reduced motion.** With prefers-reduced-motion the tile art does not zoom on hover, the caption appears without rising or fading, the actions appear without a fade, and the lightbox picture swaps without a cross-fade. The kit Modal keeps its opacity fade and drops its scale and blur.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Nesting the favourite and download buttons inside the open button. Interactive content inside a button is invalid, screen readers merge the labels and the clicks bubble into opening the lightbox. They are siblings positioned over the tile.
- Using `disabled` for an unavailable download. It drops out of the tab order and a hover title never shows, so nobody learns why. `aria-disabled` keeps it focusable and the label explains it.
- Clearing the open item when the Modal closes. The content would vanish before the exit animation ends. Only `isOpen` flips; the id stays until another picture is opened.
- Expecting row-first reading order. CSS columns fill top to bottom, so tab order runs down the first column, then the next. Use a grid if strict row order matters more than the interlocking layout.

## Notes

- `GALLERY_ITEMS`, `GalleryArt` and the `GalleryItem` type are re-exported from the main file, so a prompt composer or a loader can show the same pictures.
- Pass your own items with real images by replacing `GalleryArt` in a fork; the tile only needs `ratio` and a child that fills the box.

## Definition of done

Twelve flat illustrations of different heights interlock in columns. Hovering one zooms it slightly, raises its title and style over a dark scrim and shows a heart and a download button. The heart toggles (aria-pressed, rose fill) and the Favourites count updates; the Favourites view shows only hearted pictures. Download on a ready picture updates the status line; on "Underwater highway" it does nothing. Clicking a picture opens a 640px lightbox with the title, style, "n / 12", previous and next buttons; the arrow keys page it, wrapping at the ends, and Escape closes it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
