'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Creator" (boardui.com/components/agent-creator).
 * No BoardUI source was used.
 */

import { useEffect, useRef } from 'react';
import { AgentCreator } from '@/registry/ui/agent-creator';
import type { AgentDraft } from '@/registry/ui/agent-creator';

/* A prefilled cloud engineer. Clearing a field and pressing Create shows the
   validation; a valid draft "saves" for 900ms, then flips to the created card. */
const STARTER: Partial<AgentDraft> = {
  name: 'Cloud engineer',
  label: 'Cloud',
  description: 'Helps with server architecture, cloud costs and deploys.',
  tools: ['web', 'code'],
};

const SAVE_MS = 900;

export default function Demo() {
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
    };
  }, []);

  const save = () =>
    new Promise<void>((resolve) => {
      const id = setTimeout(() => {
        timers.current.delete(id);
        resolve();
      }, SAVE_MS);
      timers.current.add(id);
    });

  return (
    <div className="flex w-full items-center justify-center p-4">
      <AgentCreator defaultValue={STARTER} onCreate={save} className="h-[528px]" />
    </div>
  );
}
