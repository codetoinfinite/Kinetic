'use client';

import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Blend-Difference Cursor
   --------------------------------------------------------------------------
   A white dot in `mix-blend-mode: difference` inverts whatever is beneath it:
   black over white, white over black, the complement over colour. That single
   property is why this cursor never needs a contrast check — it cannot be
   invisible against any background you put behind it.

   The dot resizes rather than scales. 16px idle, 44px over a link, 150px over
   a "view" target, where the last size exists to hold a text label. Growth is
   a CSS transition on `width` and `height` ONLY; `transform` is reserved
   entirely for GSAP, which writes it every frame. Transitioning `all` would
   put a 400ms CSS interpolation on the same property GSAP is setting at 120Hz,
   and the two fight — the cursor lags, stutters, or drifts behind the pointer
   by a fixed distance that no tween duration explains.

   Positioning is `absolute` inside the component rather than `fixed`, so the
   effect is a scoped demonstration rather than a page-wide takeover. The
   trade-off is discussed in the meta: a real site-level cursor is `fixed`.
   ========================================================================== */

export interface BlendDifferenceCursorProps {
  children?: ReactNode;
  /** Label shown inside the largest state. Kept short — it must fit at 150px. */
  label?: string;
  className?: string;
}

// #region critical
/** The three states. Diameters in px, not scales — see the note above. */
const SIZE_IDLE = 16;
const SIZE_HOVER = 44;
const SIZE_VIEW = 150;

const FOLLOW_DURATION = 0.32;

export function BlendDifferenceCursor({
  children,
  label = 'View',
  className,
}: BlendDifferenceCursorProps) {
  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const node = dot.current;
    const caption = text.current;
    if (!el || !node || !caption) return;

    // Never on touch: there is no hover state to grow into, and `pointermove`
    // only fires mid-drag, so the dot would appear under the finger already
    // covering it and then be stranded on lift.
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* The dot is `display: none` until JS confirms a fine pointer, so nothing
       renders before this line — no stray blob flashes during hydration. */
    node.style.display = 'flex';
    /* Hiding the native cursor from JS, not CSS, for the same reason: a
       stylesheet rule would blank the cursor on touch devices too, where this
       component draws nothing to replace it. */
    const previousCursor = el.style.cursor;
    el.style.cursor = 'none';

    gsap.set(node, { xPercent: -50, yPercent: -50, autoAlpha: 0 });

    const duration = reduced ? 0 : FOLLOW_DURATION;
    // Two tweens for the lifetime of the component, end values mutated in
    // place. `gsap.to` per event would allocate ~120 tweens a second, each one
    // overwriting a tween that had not finished.
    const xTo = gsap.quickTo(node, 'x', { duration, ease: 'power3' });
    const yTo = gsap.quickTo(node, 'y', { duration, ease: 'power3' });

    let entered = false;
    let state: 'idle' | 'hover' | 'view' = 'idle';

    const apply = (next: typeof state) => {
      if (next === state) return;
      state = next;
      const size = next === 'view' ? SIZE_VIEW : next === 'hover' ? SIZE_HOVER : SIZE_IDLE;
      // Width and height only. `transform` is GSAP's.
      node.style.width = `${size}px`;
      node.style.height = `${size}px`;
      caption.style.opacity = next === 'view' ? '1' : '0';
      caption.style.transform = next === 'view' ? 'scale(1)' : 'scale(0.5)';
    };

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (!entered) {
        entered = true;
        // Second argument is quickTo's START value: this teleports instead of
        // easing, so the dot does not sail across the panel on every entry.
        xTo(x, x);
        yTo(y, y);
        gsap.to(node, { autoAlpha: 1, duration: reduced ? 0 : 0.2, overwrite: 'auto' });
      } else {
        xTo(x);
        yTo(y);
      }

      // Hit-testing the event target beats a listener per interactive child:
      // it survives children being added, removed or re-rendered by React.
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[data-cursor="view"]')) apply('view');
      else if (target?.closest('a, button, [data-cursor="hover"]')) apply('hover');
      else apply('idle');
    };

    const onLeave = () => {
      entered = false;
      apply('idle');
      gsap.to(node, { autoAlpha: 0, duration: reduced ? 0 : 0.2, overwrite: 'auto' });
    };

    /* Listening on the container, not the dot. A listener on the dot would see
       its own `pointerleave` as it slides out from under the pointer and chase
       itself. `pointer-events: none` on the dot is the other half of that. */
    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.cursor = previousCursor;
      node.style.display = '';
      gsap.killTweensOf(node);
      gsap.set(node, { clearProps: 'all' });
    };
  }, []);
  // #endregion critical

  return (
    /* `isolate` is deliberate and load-bearing: it makes THIS element the blend
       root, so the dot inverts the component's own content and stops at its
       edge. Any *unintended* stacking context between here and the dot — a
       `transform`, `filter`, `opacity < 1` or `will-change` on a wrapper —
       confines the blend to that subtree instead, and the effect silently
       stops inverting the rest of the panel. */
    <div ref={root} className={cn('relative isolate overflow-hidden', className)}>
      <div className="relative z-0 h-full w-full">{children}</div>

      <div
        ref={dot}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-50 hidden items-center justify-center rounded-full bg-white opacity-0 will-change-transform"
        style={{
          width: SIZE_IDLE,
          height: SIZE_IDLE,
          mixBlendMode: 'difference',
          // Explicit property list. NEVER `all` — that would catch `transform`.
          transition:
            'width 0.4s cubic-bezier(0.22,1,0.36,1), height 0.4s cubic-bezier(0.22,1,0.36,1), background-color 0.3s',
        }}
      >
        <span
          ref={text}
          className="select-none text-[15px] font-medium leading-none"
          style={{
            // Black on the white dot; difference then renders it as the page
            // colour showing through. A token would be wrong: the dot is a
            // fixed white, so its label must be a fixed black.
            color: '#000',
            opacity: 0,
            transform: 'scale(0.5)',
            transition: 'opacity 0.3s, transform 0.35s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
