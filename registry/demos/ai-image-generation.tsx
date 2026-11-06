'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Image Generation" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */

import { AiImageGeneration } from '@/registry/ui/ai-image-generation';

export default function Demo() {
  return (
    <div className="h-full w-full bg-background-primary-default">
      <AiImageGeneration generationMs={7000} />
    </div>
  );
}
