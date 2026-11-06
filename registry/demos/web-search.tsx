'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Web Search" (boardui.com/components/web-search).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { RiArrowUpLine, RiLightbulbLine, RiSearchLine } from '@remixicon/react';
import { WebSearch } from '@/registry/ui/web-search';
import type { WebSearchStep } from '@/registry/ui/web-search';
import { Button } from '@/registry/ui/button';
import { Input } from '@/registry/ui/input';

/* A chat turn: the question is sent, the search trail streams in under it and
   the answer waits on onComplete. Open a Sources row to read titles and
   domains, hover a mark for its tooltip, and send again to re-run. The second
   search found eight pages, so its last two collapse into a count. */

const STEPS: WebSearchStep[] = [
  { label: 'Ran 3 searches', icon: RiSearchLine, heading: true, dwell: 700 },
  {
    label: 'Searching for what teams actually pay for in a component library',
    icon: RiLightbulbLine,
    meta: '5 results',
    dwell: 1500,
    sources: [
      { title: 'Tailwind UI vs building your own: a cost breakdown', domain: 'www.reddit.com', brand: 'reddit' },
      { title: 'We shipped our design system in 6 weeks. Here is what it cost', domain: 'www.linkedin.com', brand: 'linkedin' },
      { title: 'shadcn/ui — the registry model explained', domain: 'github.com', brand: 'github' },
      { title: 'Design tokens: a practical guide', domain: 'www.figma.com', brand: 'figma' },
      { title: 'How we priced our component library', domain: 'www.notion.so', brand: 'notion' },
    ],
  },
  {
    label: 'Searched Reddit for',
    query: 'component library licensing',
    brand: 'reddit',
    meta: '8 results',
    dwell: 1300,
    sources: [
      { title: 'Paid UI kits: worth it for a two person team?', domain: 'www.reddit.com', brand: 'reddit' },
      { title: 'One license per seat or per project?', domain: 'www.reddit.com', brand: 'reddit' },
      { title: 'Pricing threads from the design tokens crowd', domain: 'x.com', brand: 'x' },
      { title: 'Open source registries and how they earn', domain: 'github.com', brand: 'github' },
      { title: 'Selling Figma kits alongside code', domain: 'www.figma.com', brand: 'figma' },
      { title: 'A year of selling a component library', domain: 'www.youtube.com' },
      { title: 'Seat pricing for developer tools', domain: 'www.linkedin.com', brand: 'linkedin' },
      { title: 'Lifetime deals: what they did to our revenue', domain: 'indiehackers.com' },
    ],
  },
  { label: 'Searched X for', query: 'design system pricing', brand: 'x', meta: '3 results', dwell: 900 },
];

const ANSWER =
  'Teams mostly pay for time saved: polished, accessible components they can own outright. One-off licenses per project beat seats, and a Figma kit that matches the code is the add-on people cite most.';

export default function Demo() {
  const [run, setRun] = useState(0);
  const [question, setQuestion] = useState('What do teams actually pay for in a component library?');
  const [draft, setDraft] = useState('What do teams actually pay for in a component library?');
  const [answered, setAnswered] = useState(false);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setQuestion(text);
    setAnswered(false);
    setRun((r) => r + 1);
  };

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div data-demo className="flex w-full max-w-[520px] flex-col gap-3">
        <p className="ms-auto max-w-[85%] rounded-2xl bg-background-secondary-default px-3.5 py-2 text-body-regular text-text-primary">
          {question}
        </p>

        <WebSearch key={run} steps={STEPS} startDelay={320} stepInterval={800} onComplete={() => setAnswered(true)} />

        <p role="status" className={answered ? 'text-body-regular text-text-primary' : 'sr-only'}>
          {answered ? ANSWER : ''}
        </p>

        <form onSubmit={send} className="flex items-end gap-2 border-t border-border-button-default pt-3">
          <Input
            aria-label="Message"
            placeholder="Ask anything"
            value={draft}
            onChange={setDraft}
            size="small"
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            size="small"
            iconOnly
            leadingIcon={RiArrowUpLine}
            aria-label="Send message"
            disabled={!draft.trim()}
          />
        </form>
      </div>
    </div>
  );
}
