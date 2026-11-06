'use client';

import { useState } from 'react';

import { Button } from '@/registry/ui/button';
import { Divider } from '@/registry/ui/divider';

/* Every treatment in the place it is used: the bare rule and the "or" split
   from BoardUI's preview, a start-aligned date heading over an activity list,
   the double and fill bands as section headings, and a centred control that
   reveals more rows. */
const EARLIER = ['Invoice #2041 sent to Northwind', 'Q3 roadmap shared with Design', 'Aspen joined the workspace'];

export default function Demo() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="grid w-full max-w-[720px] grid-cols-1 gap-8 sm:grid-cols-2">
      <div className="flex flex-col gap-5">
        <Divider />
        <Divider>or</Divider>
        <Divider align="start">Today</Divider>
        <Divider align="end" contentClassName="text-caption-1-medium text-text-tertiary">
          3 new
        </Divider>
      </div>

      <div className="flex flex-col gap-3">
        <Divider variant="double" align="start">
          Pinned
        </Divider>
        <p className="px-1 text-body-medium text-text-primary">Release checklist for v2.4</p>

        <Divider variant="fill" align="start">
          Earlier this week
        </Divider>
        <ul className="flex flex-col gap-2 px-1">
          {(expanded ? EARLIER : EARLIER.slice(0, 1)).map((item) => (
            <li key={item} className="text-body-medium text-text-primary">
              {item}
            </li>
          ))}
        </ul>

        <Divider>
          <Button variant="secondary" size="xs" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
            {expanded ? 'Show less' : 'Show 2 more'}
          </Button>
        </Divider>
      </div>
    </div>
  );
}
