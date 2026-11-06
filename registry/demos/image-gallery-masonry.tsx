'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Gallery Masonry" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import type { Key } from 'react-aria-components';

import { GALLERY_ITEMS, ImageGalleryMasonry } from '@/registry/ui/image-gallery-masonry';
import type { GalleryItem } from '@/registry/ui/image-gallery-masonry';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

type View = 'all' | 'favourites';

/* The gallery panel of an image-generation app. Hover a tile for its caption
   and actions, heart a few, then switch to Favourites; click any picture for
   the lightbox (arrow keys page it). "Underwater highway" is still
   upscaling, so its download stays inert. */
export default function Demo() {
  const [view, setView] = useState<View>('all');
  const [favourites, setFavourites] = useState<ReadonlySet<string>>(() => new Set(['bloom']));
  const [lastDownload, setLastDownload] = useState<string | null>(null);

  const items: GalleryItem[] =
    view === 'favourites' ? GALLERY_ITEMS.filter((item) => favourites.has(item.id)) : GALLERY_ITEMS;

  return (
    <section className="flex w-full max-w-[960px] flex-col gap-4 rounded-3xl bg-background-primary-default p-4 shadow-xs ring-1 ring-border-ai-profile-card sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="text-title-3-medium text-text-primary">Gallery</h2>
          <p className="text-caption-1-regular text-text-tertiary" aria-live="polite" data-testid="gallery-status">
            {lastDownload ? `Downloaded ${lastDownload}` : `${GALLERY_ITEMS.length} images this week`}
          </p>
        </div>
        <SegmentedControl
          aria-label="Show"
          selectedKeys={[view]}
          onSelectionChange={(keys: Set<Key>) => {
            const next = keys.values().next().value;
            if (next === 'all' || next === 'favourites') setView(next);
          }}
        >
          <SegmentedControlItem id="all">All</SegmentedControlItem>
          <SegmentedControlItem id="favourites">Favourites ({favourites.size})</SegmentedControlItem>
        </SegmentedControl>
      </header>

      <div className="max-h-[420px] overflow-y-auto overscroll-contain rounded-xl">
        {items.length ? (
          <ImageGalleryMasonry
            items={items}
            favourites={favourites}
            onFavouritesChange={setFavourites}
            onDownload={(item) => setLastDownload(`${item.title.toLowerCase().replaceAll(' ', '-')}.png`)}
            columnsClassName="columns-2 sm:columns-3 md:columns-4"
          />
        ) : (
          <p className="flex h-40 items-center justify-center rounded-xl bg-background-secondary-default text-body-regular text-text-tertiary">
            No favourites yet. Hover a picture and tap the heart.
          </p>
        )}
      </div>
    </section>
  );
}
