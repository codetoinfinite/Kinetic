'use client';

import { CursorFollower } from '@/registry/ui/gsap-cursor-follower';

const PROJECTS = [
  { title: 'Meridian Atlas', year: '2024', discipline: 'Identity' },
  { title: 'Salt & Iron', year: '2024', discipline: 'Art direction' },
  { title: 'Northline Rail', year: '2023', discipline: 'Web' },
];

export default function Demo() {
  return (
    <CursorFollower label="Open" className="h-full w-full bg-bg">
      <div className="flex h-full w-full flex-col justify-center px-6 py-8 sm:px-10">
        <p className="meta mb-5">Selected work</p>
        <ul className="flex flex-col">
          {PROJECTS.map((p) => (
            <li key={p.title} data-cursor-target className="border-t border-line last:border-b">
              <div className="flex items-baseline justify-between gap-4 py-4 sm:py-5">
                <span className="text-xl tracking-tight sm:text-2xl">{p.title}</span>
                <span className="meta shrink-0">
                  {p.discipline} — {p.year}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-xs text-xs leading-relaxed text-faint">
          Everything outside the list keeps the small dot. The rows carry the label.
        </p>
      </div>
    </CursorFollower>
  );
}
