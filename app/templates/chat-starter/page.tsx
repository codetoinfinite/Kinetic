import type { Metadata } from 'next';

import { AgentChat } from '@/registry/ui/agent-chat';

export const metadata: Metadata = {
  title: 'Chat',
  alternates: { canonical: '/templates/chat-starter' },
};

export default function ChatStarterPage() {
  return <AgentChat />;
}
