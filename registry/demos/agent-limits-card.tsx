'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Limits Card" (boardui.com/components/agent-limits-card).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiChatNewLine, RiContractLeftRightLine } from '@remixicon/react';
import { AgentLimitsCard } from '@/registry/ui/agent-limits-card';
import type { ContextGroup, PlanLimit } from '@/registry/ui/agent-limits-card';
import { Button } from '@/registry/ui/button';

/* A session at 820k of a 1M window. "Send a message" grows the Messages
   bucket and the plan limits; "Compact" shrinks Messages back down. */
const CAPACITY = 1_000_000;
const START_MESSAGES = 520_000;
const MESSAGE_COST = 38_000;
const COMPACTED = 140_000;

const GROUPS: ContextGroup[] = [
  {
    label: 'MCP tools',
    tokens: 137_900,
    members: [
      { label: 'browser', tokens: 54_200 },
      { label: 'github', tokens: 41_300 },
      { label: 'linear', tokens: 25_600 },
      { label: 'filesystem', tokens: 16_800 },
    ],
  },
  {
    label: 'Memory files',
    tokens: 24_000,
    members: [
      { label: 'Project notes', tokens: 15_000 },
      { label: 'Personal notes', tokens: 9_000 },
    ],
  },
  {
    label: 'Custom agents',
    tokens: 16_000,
    members: [
      { label: 'reviewer', tokens: 6_400 },
      { label: 'planner', tokens: 5_200 },
      { label: 'researcher', tokens: 4_400 },
    ],
  },
];

const START_LIMITS: PlanLimit[] = [
  { label: '5-hour limit', used: 0.38, resets: 'Resets in 2 hr 46 min' },
  { label: 'Weekly · all models', used: 0.03, resets: 'Resets Tue 3:00 PM' },
  { label: 'Weekly · Pro', used: 0.05, resets: 'Resets Tue 3:00 PM' },
];
const LIMIT_STEP = [0.09, 0.01, 0.015];

export default function Demo() {
  const [messages, setMessages] = useState(START_MESSAGES);
  const [limits, setLimits] = useState(START_LIMITS);
  const [note, setNote] = useState('');

  const buckets = [
    { label: 'Messages', tokens: messages },
    { label: 'System tools', tokens: 96_000 },
    { label: 'MCP tools', tokens: 68_000 },
    { label: 'Skills', tokens: 54_000 },
    { label: 'System prompt', tokens: 42_000 },
    { label: 'Memory files', tokens: 24_000 },
    { label: 'Custom agents', tokens: 16_000 },
    { label: 'MCP tools (deferred)', tokens: 69_900, deferred: true },
    { label: 'System tools (deferred)', tokens: 16_100, deferred: true },
  ];
  const fixed = 96_000 + 68_000 + 54_000 + 42_000 + 24_000 + 16_000;
  const roomLeft = CAPACITY - fixed - messages;

  const send = () => {
    setMessages((m) => Math.min(CAPACITY - fixed, m + MESSAGE_COST));
    setLimits((list) => list.map((l, i) => ({ ...l, used: Math.min(1, l.used + (LIMIT_STEP[i] ?? 0)) })));
    setNote('Sent a message.');
  };
  const compact = () => {
    setMessages(COMPACTED);
    setNote('Compacted the conversation.');
  };
  const reset = () => {
    setMessages(START_MESSAGES);
    setLimits(START_LIMITS);
    setNote('Back to the starting session.');
  };

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 p-4 md:flex-row md:items-start">
      <AgentLimitsCard
        context={{ capacity: CAPACITY, buckets, groups: GROUPS }}
        plan="Max (5x)"
        limits={limits}
        onManagePlan={() => setNote('Plan settings would open here.')}
        maxBreakdownHeight={236}
      />
      <div className="flex w-full max-w-[448px] flex-col gap-2 md:w-48">
        <p className="text-caption-1-medium text-text-tertiary">Simulate the session</p>
        <Button
          variant="secondary"
          size="small"
          leadingIcon={RiChatNewLine}
          onClick={send}
          disabled={roomLeft <= 0}
        >
          Send a message
        </Button>
        <Button variant="secondary" size="small" leadingIcon={RiContractLeftRightLine} onClick={compact}>
          Compact
        </Button>
        <Button variant="ghost" size="small" onClick={reset}>
          Reset
        </Button>
        <p role="status" className="min-h-5 text-caption-1-regular text-text-secondary">
          {note}
        </p>
      </div>
    </div>
  );
}
