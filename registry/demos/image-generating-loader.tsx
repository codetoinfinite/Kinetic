'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Generating Loader" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiPauseLine, RiPlayLine, RiRefreshLine } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { ImageGeneratingLoader } from '@/registry/ui/image-generating-loader';

/* The finished picture: a flat editorial poster drawn inline, so the demo
   needs no network and looks the same on every run. */
function PosterArt() {
  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="200" height="200" fill="#2f5fd0" />
      <circle cx="148" cy="52" r="30" fill="#f4e6c4" />
      <path d="M0 160 Q100 138 200 160 V200 H0Z" fill="#244aa8" />
      <g fill="#f4e6c4" opacity="0.35">
        <circle cx="30" cy="40" r="2" />
        <circle cx="54" cy="24" r="1.5" />
        <circle cx="80" cy="46" r="1.8" />
      </g>
      {/* Runner, leaning into the dribble. */}
      <circle cx="92" cy="58" r="11" fill="#e3b48a" />
      <path d="M82 54 Q92 42 103 54 Q99 49 92 49 Q85 49 82 54Z" fill="#3a2a22" />
      <path d="M78 72 L108 72 L114 112 L74 112Z" fill="#cfe3f7" />
      <path d="M86 72 L90 72 L88 112 L84 112Z M98 72 L102 72 L104 112 L100 112Z" fill="#7fb2e5" />
      <path d="M78 74 L60 96 L66 100 L82 84Z" fill="#e3b48a" />
      <path d="M108 74 L130 86 L127 92 L106 84Z" fill="#e3b48a" />
      <path d="M76 112 L110 112 L108 124 L78 124Z" fill="#1d2b4a" />
      <path d="M80 124 L70 152 L78 155 L90 126Z" fill="#e3b48a" />
      <path d="M100 124 L120 146 L114 151 L94 128Z" fill="#e3b48a" />
      <path d="M66 152 L80 152 L80 158 L62 158Z M112 148 L124 142 L126 148 L114 154Z" fill="#1d2b4a" />
      <circle cx="140" cy="158" r="10" fill="#fdfbf6" />
      <path d="M134 153 L140 150 L146 153 L144 160 L136 160Z" fill="#1d2b4a" />
    </svg>
  );
}

/* A chat turn: the prompt bubble, then the tile the model leaves while it
   paints. Restart remounts the loader; Pause freezes the timer and ripple. */
export default function Demo() {
  const [run, setRun] = useState(0);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState('Running');

  return (
    <div className="flex w-full max-w-[640px] flex-col gap-4 rounded-3xl bg-background-secondary-default p-4 sm:p-6">
      <p className="ml-auto max-w-[85%] rounded-2xl bg-background-primary-default px-4 py-2.5 text-body-regular text-text-primary shadow-2xs">
        Create a vintage editorial illustration of a footballer dribbling in a striped home kit against a blue
        background.
      </p>

      <ImageGeneratingLoader
        key={run}
        duration={7000}
        paused={paused}
        result={<PosterArt />}
        onComplete={() => setStatus('Done')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiRefreshLine}
          onClick={() => {
            setRun((value) => value + 1);
            setPaused(false);
            setStatus('Running');
          }}
        >
          Restart
        </Button>
        <Button
          variant="secondary"
          size="small"
          leadingIcon={paused ? RiPlayLine : RiPauseLine}
          aria-pressed={paused}
          disabled={status === 'Done'}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <span data-testid="loader-status" className="ml-auto text-caption-1-medium text-text-tertiary">
          {paused && status !== 'Done' ? 'Paused' : status}
        </span>
      </div>
    </div>
  );
}
