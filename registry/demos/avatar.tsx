'use client';

import { Avatar } from '@/registry/ui/avatar';

/* BoardUI's own preview: an overlapping group that fans out on hover. Each
   avatar sits in a ring the colour of the card, so the overlap reads as a
   cut-out. Below it, the four sizes with initials in each tint. */
const TEAM = [
  { name: 'John Clarkson', initials: 'JC', color: 'blue' },
  { name: 'Aspen Lubin', initials: 'AL', color: 'lime' },
  { name: 'Kianna Vaccaro', initials: 'KV', color: 'pink' },
  { name: 'Mertcan Esmergul', initials: 'M', color: 'neutral' },
] as const;

const FAN = ['group-hover:-translate-x-[27px]', 'group-hover:-translate-x-[9px]', 'group-hover:translate-x-[9px]', 'group-hover:translate-x-[27px]'];

const SIZES = [
  { size: 'xs', label: 'xs · 20', initials: 'A', color: 'blue' },
  { size: 'sm', label: 'sm · 24', initials: 'AL', color: 'lime' },
  { size: 'md', label: 'md · 32', initials: 'KV', color: 'pink' },
  { size: 'lg', label: 'lg · 36', initials: 'M', color: 'neutral' },
] as const;

export default function Demo() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div
        role="group"
        aria-label="Project members"
        className="group flex items-center rounded-2xl border border-border-table bg-background-primary-default px-10 py-5"
      >
        {TEAM.map((person, i) => (
          <div
            key={person.name}
            title={person.name}
            className={[
              'rounded-full ring-2 ring-background-primary-default transition-[translate,scale] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none',
              i > 0 ? '-ml-3' : '',
              FAN[i] ?? '',
              'group-hover:-translate-y-1 group-hover:scale-105',
            ].join(' ')}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <Avatar size="lg" color={person.color} initials={person.initials} aria-label={person.name} role="img" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-center gap-6">
        {SIZES.map((item) => (
          <div key={item.size} className="flex flex-col items-center gap-2">
            <Avatar size={item.size} color={item.color} initials={item.initials} />
            <span className="text-caption-1-medium text-text-tertiary">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
