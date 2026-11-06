'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Multi Agent Chat" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import { MultiAgentChat } from '@/registry/ui/multi-agent-chat';

export default function Demo() {
  return (
    <div className="h-full w-full">
      <MultiAgentChat />
    </div>
  );
}
