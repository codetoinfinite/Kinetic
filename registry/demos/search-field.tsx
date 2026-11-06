'use client';

import { useEffect, useState } from 'react';

import { SearchField } from '@/registry/ui/search-field';

const TEAM = [
  { name: 'Amir Haddad', role: 'Design' },
  { name: 'Priya Nair', role: 'Design' },
  { name: 'Lena Fischer', role: 'Engineering' },
  { name: 'Sofia Alvarez', role: 'Engineering' },
  { name: 'Marcus Webb', role: 'Sales' },
  { name: 'Kenji Watanabe', role: 'Support' },
];

/* Left: a teammate filter. Each keystroke shows the loading spinner for a
   moment, as a real search would, then the list settles. Right: the rounded
   shape with a label, as it sits in a form. */
export default function Demo() {
  const [query, setQuery] = useState('Design');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState('INV-20');

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, [loading, query]);

  const needle = query.trim().toLowerCase();
  const results = TEAM.filter(
    (person) => person.name.toLowerCase().includes(needle) || person.role.toLowerCase().includes(needle),
  );

  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-x-12 gap-y-8">
      <div className="flex w-full max-w-[280px] flex-col gap-2">
        <SearchField
          aria-label="Search teammates"
          placeholder="Search teammates"
          value={query}
          onChange={(next) => {
            setQuery(next);
            setLoading(next.trim().length > 0);
          }}
          isLoading={loading}
        />
        <ul
          aria-label="Teammates"
          className={`flex flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-xs transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}
        >
          {results.length === 0 ? (
            <li className="px-2.5 py-2 text-body-regular text-text-tertiary">No teammates match “{query}”.</li>
          ) : (
            results.map((person) => (
              <li key={person.name} className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2">
                <span className="text-body-medium text-text-primary">{person.name}</span>
                <span className="text-body-regular text-text-tertiary">{person.role}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="flex w-full max-w-[280px] flex-col">
        <SearchField
          label="Find an invoice"
          shape="rounded"
          size="small"
          placeholder="Invoice number or customer"
          value={invoice}
          onChange={setInvoice}
          hint="Press Escape to clear, Enter to search."
        />
      </div>
    </div>
  );
}
