'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The plate's click target. Not an `<a>`: the preview inside it is a live demo,
 * and a demo that renders its own link (a cursor demo hovering one, say) would
 * put an anchor inside an anchor, which is invalid HTML and a hydration error.
 * The title beside the plate is the real link; this only makes the picture
 * clickable too, so it stays out of the tab order and the accessibility tree.
 */
export function PlateLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => router.prefetch(href)}
      onClick={(event) => {
        // A link inside the demo keeps its own click.
        if ((event.target as Element).closest('a')) return;
        router.push(href);
      }}
    >
      {children}
    </div>
  );
}
