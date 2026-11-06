'use client';

import { useStarterBase } from '@/registry/ui/app-shell';
import { AuthCard } from '@/registry/ui/auth-card';

/** Sign-in, reached from the sidebar and from Log out. */
export default function ChatStarterLoginPage() {
  const base = useStarterBase();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-6">
      <AuthCard switchHref={`${base}/signup`} />
    </main>
  );
}
