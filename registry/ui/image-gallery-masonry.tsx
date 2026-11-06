/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Gallery Masonry" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useState } from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiHeart3Fill,
  RiHeart3Line,
} from "@remixicon/react";

import { cx } from "@/registry/lib/cx";
import { IconButton } from "@/registry/ui/icon-button";
import { Modal, ModalBody, ModalHeader } from "@/registry/ui/modal";
import { GALLERY_ITEMS, GalleryArt, captionOf } from "@/registry/ui/image-gallery-masonry-art";
import type { GalleryItem } from "@/registry/ui/image-gallery-masonry-art";

export type { GalleryItem } from "@/registry/ui/image-gallery-masonry-art";
export { GALLERY_ITEMS, GalleryArt } from "@/registry/ui/image-gallery-masonry-art";

/**
 * Image Gallery Masonry: a wall of generated images in uneven columns.
 *
 * Tiles keep their own aspect ratio and stack in CSS columns, so short and
 * tall pictures interlock without a layout script. Hovering (or focusing) a
 * tile lifts a caption gradient and two round actions: favourite, a real
 * toggle with aria-pressed, and download, which stays focusable but inert
 * when there is no handler or the file is not ready. Clicking a picture opens
 * it in the kit's Modal with previous / next buttons and arrow-key paging.
 */

export interface ImageGalleryMasonryProps {
  items?: GalleryItem[];
  /** Controlled favourite ids. */
  favourites?: ReadonlySet<string>;
  /** Initial favourite ids when uncontrolled. */
  defaultFavourites?: Iterable<string>;
  onFavouritesChange?: (next: Set<string>) => void;
  /** Called for a downloadable item. Without it every download button is inert. */
  onDownload?: (item: GalleryItem) => void;
  /** Tailwind column classes for the masonry. */
  columnsClassName?: string;
  className?: string;
}

const tileAction = cx(
  "flex size-8 items-center justify-center rounded-full bg-background-primary-default/90 text-text-primary shadow-xs backdrop-blur-sm outline-none",
  "transition-[background-color,transform] duration-150 ease-out hover:bg-background-primary-default active:scale-90 motion-reduce:transition-none",
  "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:scale-100",
);

function FavouriteButton({
  item,
  on,
  onToggle,
  className,
}: {
  item: GalleryItem;
  on: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const Icon = on ? RiHeart3Fill : RiHeart3Line;
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Favourite ${captionOf(item)}`}
      onClick={onToggle}
      className={cx(tileAction, className)}
    >
      <Icon className={cx("size-4", on && "text-status-rose-text")} aria-hidden />
    </button>
  );
}

function DownloadButton({
  item,
  onDownload,
  className,
}: {
  item: GalleryItem;
  onDownload?: (item: GalleryItem) => void;
  className?: string;
}) {
  const ready = Boolean(onDownload) && item.downloadable !== false;
  return (
    <button
      type="button"
      // aria-disabled, not disabled: it stays in the tab order and the label
      // explains why nothing happens.
      aria-disabled={!ready || undefined}
      aria-label={ready ? `Download ${captionOf(item)}` : `Download unavailable: ${captionOf(item)} is not ready`}
      title={ready ? "Download" : "Not ready to download"}
      onClick={() => {
        if (ready) onDownload?.(item);
      }}
      className={cx(tileAction, className)}
    >
      <RiDownloadLine className="size-4" aria-hidden />
    </button>
  );
}

// #region critical
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
// #endregion
