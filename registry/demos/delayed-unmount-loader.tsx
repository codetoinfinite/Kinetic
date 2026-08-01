'use client';

import { useEffect, useRef, useState } from 'react';
import { DelayedUnmountLoader } from '@/registry/ui/delayed-unmount-loader';

const ROUTES = [
  { key: 'home', label: 'Home', title: 'Studio for motion and type', meta: 'Since 2019' },
  { key: 'about', label: 'About', title: 'Nine people, one room', meta: 'Rotterdam' },
];

export default function Demo() {
  const [route, setRoute] = useState(ROUTES[0]);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stands in for whatever the real signal is — assets decoded, data
  // resolved, a font ready. Here it is a fixed 900 ms.
  useEffect(() => {
    timer.current = setTimeout(() => setLoading(false), 900);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [route]);

  const go = (key: string) => {
    const next = ROUTES.find((r) => r.key === key);
    if (!next || next.key === route?.key) return;
    setLoading(true);
    setRoute(next);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <nav className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="meta text-fg">Atelier</span>
        <div className="flex gap-4">
          {ROUTES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => go(r.key)}
              className={
                r.key === route?.key ? 'meta text-accent' : 'meta transition-colors hover:text-fg'
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex h-[calc(100%-3rem)] flex-col justify-end gap-2 p-4">
        <span className="meta text-accent">{route?.meta}</span>
        <h2 className="max-w-[16ch] text-2xl leading-[1.05] tracking-tight text-fg">
          {route?.title}
        </h2>
      </div>

      <DelayedUnmountLoader loading={loading} position="absolute" />
    </div>
  );
}
