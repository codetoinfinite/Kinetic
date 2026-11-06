'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Pro Upsell Toast" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiDownload2Line, RiLock2Line } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { Chip } from '@/registry/ui/chip';
import { GALLERY_ITEMS, GalleryArt } from '@/registry/ui/image-gallery-masonry-art';
import { ProUpsellToast } from '@/registry/ui/pro-upsell-toast';

const PREVIEW = GALLERY_ITEMS.slice(0, 3);

/* A template page on the free plan. "Install template" opens the upsell in
   the corner of the frame; dismiss it with the close button or Escape, or
   take the call to action. */
export default function Demo() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('Free plan');

  return (
    <section className="relative flex h-[460px] w-full max-w-[880px] flex-col gap-4 overflow-hidden rounded-3xl bg-background-secondary-default p-4 ring-1 ring-border-ai-profile-card sm:p-6">
      <article className="flex w-full max-w-[440px] flex-col gap-4 rounded-2xl bg-background-primary-default p-3 shadow-xs ring-1 ring-border-ai-profile-card">
        <div aria-hidden className="grid h-28 grid-cols-3 gap-1.5 overflow-hidden rounded-xl">
          {PREVIEW.map((item) => (
            <GalleryArt key={item.id} item={item} />
          ))}
        </div>
        <div className="flex flex-col gap-1 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-body-medium text-text-primary">AI Image Generation</h2>
            <Chip variant="subtle" color="blue">
              Pro
            </Chip>
          </div>
          <p className="text-body-2-regular text-text-secondary">
            Prompt composer, masonry gallery and progressive loader, wired together.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
          <Button
            variant="primary"
            size="small"
            leadingIcon={RiDownload2Line}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => {
              setOpen(true);
              setStatus('Pro needed to install');
            }}
          >
            Install template
          </Button>
          <span className="flex min-w-0 items-center gap-1.5 text-caption-1-medium text-text-tertiary">
            <RiLock2Line aria-hidden className="size-3.5 shrink-0" />
            <code className="truncate">npx kinetic add ai-image-generation</code>
          </span>
        </div>
      </article>

      <p className="mt-auto text-caption-1-medium text-text-tertiary" aria-live="polite" data-testid="upsell-status">
        {status}
      </p>

      <ProUpsellToast
        isOpen={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setStatus('Dismissed');
        }}
        onCta={() => {
          setOpen(false);
          setStatus('Checkout opened');
        }}
        className="absolute"
      />
    </section>
  );
}
