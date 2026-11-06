'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Context Window Card" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiChat3Line, RiContractLeftRightLine } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { ContextWindowCard, type ContextSegment } from '@/registry/ui/context-window-card';

/* An agent session at 820k of a 1M window. "Add a turn" grows the messages
   segment until the window is full; "Compact" summarises the conversation
   and the bar eases back down. */
const CAPACITY = 1_000_000;
const TURN = 38_000;

const BASE: Omit<ContextSegment, 'tokens'>[] = [
  { id: 'messages', label: 'Messages', color: 'blue' },
  { id: 'tools', label: 'System tools', color: 'purple' },
  { id: 'mcp', label: 'MCP tools', color: 'pink' },
  { id: 'memory', label: 'Memory files', color: 'yellow' },
  { id: 'agents', label: 'Custom agents', color: 'green' },
  { id: 'skills', label: 'Skills', color: 'sky' },
  { id: 'system', label: 'System prompt', color: 'teal' },
];

const FIXED: Record<string, number> = {
  tools: 96_000,
  mcp: 64_000,
  memory: 56_000,
  agents: 40_000,
  skills: 22_000,
  system: 22_000,
};

const FIXED_TOTAL = Object.values(FIXED).reduce((a, b) => a + b, 0);

export default function Demo() {
  const [messages, setMessages] = useState(520_000);
  const segments: ContextSegment[] = BASE.map((s) => ({
    ...s,
    tokens: s.id === 'messages' ? messages : (FIXED[s.id] ?? 0),
  }));
  const full = messages + FIXED_TOTAL >= CAPACITY;

  return (
    <div className="flex w-full max-w-[360px] flex-col gap-3 rounded-[20px] border border-border-table bg-background-primary-default p-2.5 shadow-xs">
      <ContextWindowCard capacity={CAPACITY} segments={segments} defaultExpanded />
      <div className="flex items-center justify-between gap-2 px-1.5 pb-1">
        <span className="min-w-0 truncate text-caption-1-medium text-text-tertiary" aria-live="polite">
          {full ? 'Window full' : 'Fable 5'}
        </span>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiContractLeftRightLine}
            onClick={() => setMessages(180_000)}
          >
            Compact
          </Button>
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiChat3Line}
            disabled={full}
            onClick={() => setMessages((m) => Math.min(CAPACITY - FIXED_TOTAL, m + TURN))}
          >
            Add a turn
          </Button>
        </div>
      </div>
    </div>
  );
}
