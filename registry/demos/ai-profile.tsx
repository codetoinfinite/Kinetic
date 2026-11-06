'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "AI Profile" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
import { AiProfile } from '@/registry/ui/ai-profile';

export default function Demo() {
  return (
    <div className="h-full w-full bg-background-primary-default">
      <AiProfile />
    </div>
  );
}
