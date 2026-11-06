'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "GitHub Star Button" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { GithubStarButton } from '@/registry/ui/github-star-button';

export default function Demo() {
  const [starred, setStarred] = useState(false);

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <GithubStarButton count={12480} onStarredChange={setStarred} aria-label="Star kinetic" />
        <GithubStarButton count={1000} defaultStarred aria-label="Star kinetic-icons" />
      </div>
      <p data-demo="state" className="text-caption-1-regular text-text-tertiary">
        {starred ? 'You starred kinetic' : 'kinetic is not starred yet'}
      </p>
    </div>
  );
}
