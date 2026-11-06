'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { UNSAFE_PortalProvider } from 'react-aria';

import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { cn } from '@/lib/cn';

/* ==========================================================================
   The surface a BoardUI-kit demo renders on.
   --------------------------------------------------------------------------
   Four jobs, each one a thing the Kinetic preview frame gets wrong for a
   component kit that was designed against a full page:

   1. Scope. `data-kit="boardui"` switches the radius scale to the kit's own
      (Kinetic's is sharper), and the kit's page background and text colour
      are applied here, because the kit expects to inherit them from <body>.

   2. Overlays. PreviewHost sets `contain: layout paint`, which makes it the
      containing block for every `position: fixed` descendant, so a popover
      rendered in place would be clipped to the card. React Aria's overlays are
      sent to a body-level container instead — one per document, carrying the
      same `data-kit` scope so a menu's radius matches its trigger's.

   3. Links inside links. A grid tile is one <a>; a breadcrumb demo is more of
      them, and React rejects <a> inside <a> during render in development. Off
      the detail page the demo is rendered through a portal into a host <div>
      the stage owns. The DOM is the same, but React restarts its nesting check
      at a portal root. The subtree is also `inert`, so it takes no focus and
      no clicks, and a click falls through to the tile's link.

   4. Scale. `block` items (shells, chat, settings) are pages, not controls.
      They lay out in a virtual viewport at least 1280 by 800 and are scaled
      down to fit. The virtual box takes the frame's aspect ratio, so it fills
      the frame with no letterboxing at any size.
   ========================================================================== */

const BLOCK_WIDTH = 1280;
const BLOCK_HEIGHT = 800;

let overlayRoot: HTMLElement | null = null;

/** Lazily created so server rendering never touches `document`. */
function getOverlayRoot(): HTMLElement {
  if (overlayRoot === null || !overlayRoot.isConnected) {
    overlayRoot = document.createElement('div');
    overlayRoot.dataset.kit = 'boardui';
    overlayRoot.className = 'text-text-primary';
    document.body.appendChild(overlayRoot);
  }
  return overlayRoot;
}

export interface BoardStageProps {
  /** Whole-page items render in the scaled virtual viewport. */
  block: boolean;
  /** Interactive. False everywhere except the detail and preview pages. */
  focused: boolean;
  children: ReactNode;
}

export function BoardStage({ block, focused, children }: BoardStageProps) {
  // The portal target is created once and attached by a ref that sets no
  // state. It used to be `ref={setHost}`, but PreviewHost wraps the stage in
  // <Activity>: hiding it detaches refs (setHost(null) unmounted the portal and
  // threw away the state Activity exists to keep), and revealing it re-attaches
  // them inside the reveal commit, where the state update looped until React
  // aborted with "Maximum update depth exceeded" (#185).
  const [host] = useState(() => {
    if (typeof document === 'undefined') return null;
    const node = document.createElement('div');
    node.style.display = 'contents';
    return node;
  });
  // The slot has no React children, so React never reconciles the node
  // appended here. Unmounting the stage removes the slot and the host with it.
  const attachHost = useCallback(
    (slot: HTMLDivElement | null) => {
      if (slot !== null && host !== null && host.parentNode !== slot) slot.appendChild(host);
    },
    [host],
  );

  const content = block ? <BlockFrame>{children}</BlockFrame> : children;

  return (
    <UNSAFE_PortalProvider getContainer={getOverlayRoot}>
      <div
        data-kit="boardui"
        inert={!focused}
        className={cn(
          'absolute inset-0 bg-background-full text-text-primary antialiased',
          !block && 'flex items-center justify-center overflow-auto p-6',
        )}
      >
        {focused || host === null ? (
          content
        ) : (
          <>
            <div ref={attachHost} className="contents" />
            {createPortal(content, host)}
          </>
        )}
      </div>
    </UNSAFE_PortalProvider>
  );
}

function BlockFrame({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(ref);
  const scale = width > 0 && height > 0 ? Math.min(1, width / BLOCK_WIDTH, height / BLOCK_HEIGHT) : 0;

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {scale > 0 ? (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: width / scale,
            height: height / scale,
            transform: scale < 1 ? `scale(${scale})` : undefined,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
