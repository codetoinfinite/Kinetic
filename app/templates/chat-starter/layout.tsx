import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { DirectionProvider } from '@/registry/lib/direction';

export const metadata: Metadata = {
  title: { default: 'Chat starter', template: '%s — Chat starter' },
  description:
    'The BoardUI-kit chat starter running inside Kinetic: streaming chat, dashboard and auth screens built from the registry blocks.',
};

/* The starter is a whole app, not a section of a Kinetic page, so it covers
   the site chrome instead of sitting between the header and footer. The
   sidebar's links stay inside this prefix (see `useStarterBase`). */
export default function ChatStarterLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-kit="boardui"
      className="fixed inset-0 z-[60] overflow-auto bg-background-full text-text-primary antialiased"
    >
      <DirectionProvider locale="en-US">{children}</DirectionProvider>
    </div>
  );
}
