'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Prompt Composer" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */

import { useEffect, useState } from 'react';

import { GALLERY_ITEMS, GalleryArt } from '@/registry/ui/image-gallery-masonry-art';
import { ImagePromptComposer } from '@/registry/ui/image-prompt-composer';
import type { ImagePromptRequest } from '@/registry/ui/image-prompt-composer';
import { Skeleton } from '@/registry/ui/skeleton';

type Run = { request: ImagePromptRequest; status: 'generating' | 'done' | 'stopped' };

const GENERATE_MS = 2400;

/* A chat column for an image model. Pick styles, a ratio and a count, then
   Generate (or press Cmd/Ctrl + Enter): the composer locks, its footer
   shimmers and placeholder frames in the chosen ratio fill in after a beat.
   Stop cancels the run. */
export default function Demo() {
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    if (run?.status !== 'generating') return;
    const timer = window.setTimeout(() => {
      setRun((current) => (current ? { ...current, status: 'done' } : current));
    }, GENERATE_MS);
    return () => window.clearTimeout(timer);
  }, [run]);

  const status =
    run === null
      ? 'Idle'
      : run.status === 'generating'
        ? 'Generating'
        : run.status === 'stopped'
          ? 'Stopped'
          : `${run.request.count} ready`;

  // A stable pick of sample pictures: same prompt, same pictures.
  const offset = run ? run.request.prompt.length % GALLERY_ITEMS.length : 0;

  return (
    <section className="flex w-full max-w-[620px] flex-col gap-4 rounded-3xl bg-background-primary-default p-3 shadow-xs ring-1 ring-border-ai-profile-card sm:p-4">
      <header className="flex items-center justify-between px-1">
        <h2 className="text-body-medium text-text-primary">New image</h2>
        <span className="text-caption-1-medium text-text-tertiary" data-testid="composer-status">
          {status}
        </span>
      </header>

      <div className="flex min-h-[176px] flex-col justify-end gap-3 rounded-2xl bg-background-secondary-default p-3">
        {run ? (
          <>
            <p className="ms-auto max-w-[85%] rounded-2xl rounded-br-md bg-background-primary-default px-3 py-2 text-body-2-regular text-text-primary shadow-2xs">
              {run.request.prompt}
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Results">
              {Array.from({ length: run.request.count }, (_, index) => {
                const item = GALLERY_ITEMS[(offset + index * 5) % GALLERY_ITEMS.length];
                const { width, height } = run.request.aspectRatio;
                return (
                  <li key={index} className="w-[96px] sm:w-[120px]">
                    {run.status === 'stopped' ? (
                      <span
                        className="flex items-center justify-center rounded-xl border border-dashed border-border-button-default text-caption-1-medium text-text-tertiary"
                        style={{ aspectRatio: `${width} / ${height}` }}
                      >
                        Stopped
                      </span>
                    ) : (
                      <Skeleton
                        isLoaded={run.status === 'done'}
                        className="overflow-hidden rounded-xl"
                        style={{ aspectRatio: `${width} / ${height}` }}
                      >
                        <span className="block overflow-hidden rounded-xl" style={{ aspectRatio: `${width} / ${height}` }}>
                          {item ? <GalleryArt item={item} /> : null}
                        </span>
                      </Skeleton>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="m-auto text-center text-body-2-regular text-text-tertiary">
            Your images will appear here.
          </p>
        )}
      </div>

      <ImagePromptComposer
        defaultPrompt="A hoopoe on an olive branch, warm paper texture"
        defaultStyles={['illustration']}
        defaultAspectRatio="4:5"
        defaultCount={2}
        isGenerating={run?.status === 'generating'}
        onGenerate={(request) => setRun({ request, status: 'generating' })}
        onStop={() => setRun((current) => (current ? { ...current, status: 'stopped' } : current))}
      />
    </section>
  );
}
