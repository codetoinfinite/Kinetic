'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent List Panel" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import { useState } from 'react';
import { RiCustomerService2Line, RiSettings3Line, RiStore2Line } from '@remixicon/react';

import {
  AGENT_STATUS_META,
  AgentListPanel,
  AgentMonogram,
  AgentStatusDot,
  type AgentListItem,
} from '@/registry/ui/agent-list-panel';

const AGENTS: AgentListItem[] = [
  { id: 'landing', name: 'Landing page designer', lastMessage: 'Give the hero one clear action and move pricing below the fold.', time: '2m', status: 'running', unread: 2 },
  { id: 'content', name: 'Content reviewer', lastMessage: 'The shorter opening feels warmer. Shipping the second draft.', time: '9m', status: 'done' },
  { id: 'marketing', name: 'Marketing bot', lastMessage: 'Lead with the problem you solve, then the three outcomes.', time: '14m', status: 'waiting' },
  { id: 'seo', name: 'SEO bot', lastMessage: 'Start with a practical guide; it ranks for 40 related queries.', time: '32m', status: 'running' },
  { id: 'research', name: 'Research assistant', lastMessage: 'Ask about the last time they switched tools, not their wishes.', time: '1h', status: 'done' },
  { id: 'security', name: 'Security agent', lastMessage: 'Review access permissions on the billing workspace.', time: '3h', status: 'error' },
  { id: 'planner', name: 'Product planner', lastMessage: 'Q3 roadmap draft is ready for comments.', time: 'Mon', status: 'done' },
];

const TOOLBAR_PILL =
  'flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full bg-background-tertiary-default text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-tertiary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none';

export default function Demo() {
  const [agents, setAgents] = useState(AGENTS);
  const [selected, setSelected] = useState<string>('landing');
  const [created, setCreated] = useState(0);
  const agent = agents.find((a) => a.id === selected);
  const meta = agent?.status ? AGENT_STATUS_META[agent.status] : undefined;

  const createAgent = () => {
    const n = created + 1;
    const id = `new-${n}`;
    setCreated(n);
    setAgents((prev) => [
      { id, name: `Untitled agent ${n}`, lastMessage: 'Describe what this agent should do.', time: 'now', status: 'idle' },
      ...prev,
    ]);
    setSelected(id);
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background-full p-6">
      <div className="flex h-[512px] w-full max-w-[820px] gap-3">
        <AgentListPanel
          agents={agents}
          selectedId={selected}
          onSelect={(id) => setSelected(id)}
          onCreate={createAgent}
          toolbar={
            <button type="button" aria-label="Agent marketplace" className={TOOLBAR_PILL}>
              <RiStore2Line aria-hidden className="size-[18px]" />
            </button>
          }
          footer={
            <div className="flex flex-col">
              {[
                { label: 'Support', icon: RiCustomerService2Line },
                { label: 'Settings', icon: RiSettings3Line },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="flex h-8 cursor-pointer items-center gap-2 rounded-lg px-2 text-body-2-regular text-text-secondary outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
                >
                  <Icon aria-hidden className="size-4 text-foreground-icon-secondary" />
                  {label}
                </button>
              ))}
            </div>
          }
          className="w-full shrink-0 sm:w-[300px]"
        />

        <section
          aria-label="Conversation"
          className="hidden min-w-0 flex-1 flex-col rounded-3xl border border-border-button-default bg-background-secondary-default sm:flex"
        >
          <header className="flex items-center gap-2 border-b border-border-button-default px-4 py-3">
            <span className="relative">
              {agent && <AgentMonogram name={agent.name} className="size-7 rounded-lg" />}
            </span>
            <h2 data-testid="agent-name" className="min-w-0 flex-1 truncate text-body-medium text-text-primary">
              {agent?.name}
            </h2>
            {agent?.status && meta && (
              <span data-testid="agent-status" className="flex shrink-0 items-center gap-1.5 rounded-full bg-background-primary-default px-2.5 py-1 text-caption-1-medium text-text-secondary shadow-2xs">
                <AgentStatusDot status={agent.status} className="size-2" />
                {meta.label}
              </span>
            )}
          </header>
          <div
            key={selected}
            className="flex flex-1 flex-col justify-end gap-3 p-4 transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none"
          >
            <p className="max-w-[80%] self-end rounded-2xl rounded-br-md bg-button-primary px-3.5 py-2 text-body-2-regular text-text-white">
              What&apos;s the latest on your side?
            </p>
            <div className="flex max-w-[85%] items-end gap-2">
              {agent && <AgentMonogram name={agent.name} className="size-6 rounded-md text-caption-2-semibold" />}
              <p className="rounded-2xl rounded-bl-md border border-border-button-default bg-background-primary-default px-3.5 py-2 text-body-2-regular text-text-primary">
                {agent?.lastMessage}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
