'use client';

import { useStarterBase } from '@/registry/ui/app-shell';
import { AuthCard, AuthMediaCarousel } from '@/registry/ui/auth-card';

import { GRADIENT_SLIDES } from '../slides';

/** Sign-up: the split layout, form beside artwork. */
export default function ChatStarterSignupPage() {
  const base = useStarterBase();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background-full p-6">
      <AuthCard
        mode="signup"
        layout="grid"
        centered
        confirmPassword
        providers={['apple', 'google', 'figma']}
        title="Create your account"
        description="Enter your email below to create your account"
        switchHref={`${base}/login`}
        footnote={<>By clicking continue, you agree to our Terms of Service and Privacy Policy.</>}
        media={<AuthMediaCarousel slides={GRADIENT_SLIDES} />}
      />
    </main>
  );
}
