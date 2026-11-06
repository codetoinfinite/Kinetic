'use client';

import { AgentChat } from '@/registry/ui/agent-chat';
import { STARTER_SITE_PREFIX, StarterBaseContext } from '@/registry/ui/app-shell';

/* The chat starter's home screen as BoardUI hosts it: sidebar, the chat card
   and the history rail. `offline` skips the /api/chat probe and answers every
   message from the scripted demo transport, so a suggestion chip or a typed
   question streams a canned reply without a single network request. The base
   is pinned so the sidebar links lead into the hosted starter. */
export default function Demo() {
  return (
    <div className="h-full w-full bg-background-full">
      <StarterBaseContext.Provider value={STARTER_SITE_PREFIX}>
        <AgentChat contained offline className="h-full" />
      </StarterBaseContext.Provider>
    </div>
  );
}
