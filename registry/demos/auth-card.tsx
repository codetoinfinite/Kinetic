'use client';

import { useState } from 'react';
import { AuthCard, AuthMediaCarousel } from '@/registry/ui/auth-card';
import type { AuthLayout, AuthMediaSlide, AuthMode } from '@/registry/ui/auth-card';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';
import { SOCIAL_PROVIDERS } from '@/registry/ui/social-providers';
import type { SocialProvider } from '@/registry/ui/social-providers';

/* BoardUI's split sign-in page: the form on the left, a carousel of board
   artwork on the right. Submitting either form moves to the code step with
   the address that was typed; the toolbar jumps between steps and provider
   layouts. The artwork is inline SVG, so the demo makes no requests. */
const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">${body}</svg>`,
  )}`;

const SLIDES: AuthMediaSlide[] = [
  {
    // Kanban columns on indigo to pink.
    src: svg(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>
      <rect width="600" height="800" fill="url(#g)"/>
      <g fill="#ffffff">
        <rect x="70" y="190" width="140" height="420" rx="18" fill-opacity="0.14"/>
        <rect x="230" y="190" width="140" height="420" rx="18" fill-opacity="0.14"/>
        <rect x="390" y="190" width="140" height="420" rx="18" fill-opacity="0.14"/>
        <rect x="84" y="208" width="112" height="70" rx="12" fill-opacity="0.9"/>
        <rect x="84" y="290" width="112" height="96" rx="12" fill-opacity="0.75"/>
        <rect x="84" y="398" width="112" height="58" rx="12" fill-opacity="0.6"/>
        <rect x="244" y="208" width="112" height="110" rx="12" fill-opacity="0.9"/>
        <rect x="244" y="330" width="112" height="64" rx="12" fill-opacity="0.7"/>
        <rect x="404" y="208" width="112" height="80" rx="12" fill-opacity="0.9"/>
      </g>`,
    ),
  },
  {
    // Sprint burn-down bars on teal to blue.
    src: svg(
      `<defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0d9488"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
      <rect width="600" height="800" fill="url(#g)"/>
      <rect x="80" y="220" width="440" height="360" rx="28" fill="#ffffff" fill-opacity="0.12"/>
      <g fill="#ffffff" fill-opacity="0.85">
        <rect x="120" y="300" width="40" height="240" rx="10"/>
        <rect x="180" y="340" width="40" height="200" rx="10"/>
        <rect x="240" y="380" width="40" height="160" rx="10"/>
        <rect x="300" y="400" width="40" height="140" rx="10"/>
        <rect x="360" y="450" width="40" height="90" rx="10"/>
        <rect x="420" y="490" width="40" height="50" rx="10"/>
      </g>
      <path d="M120 290 L460 500" stroke="#ffffff" stroke-width="4" stroke-dasharray="10 10" stroke-linecap="round" fill="none"/>`,
    ),
  },
  {
    // Team nodes joined on amber to rose.
    src: svg(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#e11d48"/></linearGradient></defs>
      <rect width="600" height="800" fill="url(#g)"/>
      <g stroke="#ffffff" stroke-opacity="0.5" stroke-width="4" fill="none">
        <path d="M300 400 L170 270"/><path d="M300 400 L440 290"/><path d="M300 400 L180 540"/><path d="M300 400 L430 540"/>
      </g>
      <g fill="#ffffff">
        <circle cx="300" cy="400" r="62" fill-opacity="0.95"/>
        <circle cx="170" cy="270" r="40" fill-opacity="0.75"/>
        <circle cx="440" cy="290" r="46" fill-opacity="0.75"/>
        <circle cx="180" cy="540" r="36" fill-opacity="0.6"/>
        <circle cx="430" cy="540" r="42" fill-opacity="0.6"/>
      </g>`,
    ),
  },
];

const PROVIDERS: SocialProvider[] = ['google', 'apple', 'github', 'x'];

const STEPS: { id: AuthMode; name: string }[] = [
  { id: 'signin', name: 'Sign in' },
  { id: 'signup', name: 'Sign up' },
  { id: 'verify', name: 'Verify' },
];

const LAYOUTS: { id: AuthLayout; name: string }[] = [
  { id: 'inline', name: 'Inline' },
  { id: 'grid', name: 'Grid' },
  { id: 'stacked', name: 'Stacked' },
];

function Logo() {
  return (
    <div className="flex items-center gap-2 text-text-primary">
      <svg aria-hidden viewBox="0 0 28 28" className="size-7">
        <rect width="28" height="28" rx="8" fill="currentColor" />
        <g fill="#ffffff">
          <rect x="7" y="7" width="6" height="14" rx="2" />
          <rect x="15" y="7" width="6" height="8" rx="2" fillOpacity="0.7" />
        </g>
      </svg>
      <span className="text-headline-semibold">Boardly</span>
    </div>
  );
}

export default function Demo() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [layout, setLayout] = useState<AuthLayout>('inline');
  const [email, setEmail] = useState('olivia@boardly.co');
  const [status, setStatus] = useState<string | null>(null);

  const goTo = (next: AuthMode) => {
    setMode(next);
    setStatus(null);
  };

  const footnote =
    status ??
    (mode === 'signup'
      ? 'By creating an account you agree to the Boardly Terms of Service and Privacy Policy.'
      : 'Workspaces on the Business plan can require single sign-on.');

  return (
    <div className="flex h-full w-full flex-col bg-background-secondary-default">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pt-4">
        <SegmentedControl
          aria-label="Step"
          selectedKeys={[mode]}
          onSelectionChange={(keys) => {
            const next = STEPS.find((s) => keys.has(s.id));
            if (next) goTo(next.id);
          }}
        >
          {STEPS.map((s) => (
            <SegmentedControlItem key={s.id} id={s.id}>
              {s.name}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <SegmentedControl
          aria-label="Provider layout"
          variant="plain"
          selectedKeys={[layout]}
          onSelectionChange={(keys) => {
            const next = LAYOUTS.find((l) => keys.has(l.id));
            if (next) setLayout(next.id);
          }}
        >
          {LAYOUTS.map((l) => (
            <SegmentedControlItem key={l.id} id={l.id}>
              {l.name}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-4 py-6">
          <AuthCard
            mode={mode}
            layout={layout}
            providers={PROVIDERS}
            email={email}
            logo={<Logo />}
            centered
            headingLevel={2}
            media={<AuthMediaCarousel slides={SLIDES} />}
            footnote={<span aria-live="polite">{footnote}</span>}
            onSubmit={(data) => {
              const typed = data.get('email');
              if (typeof typed === 'string' && typed.trim()) setEmail(typed.trim());
              goTo('verify');
            }}
            onComplete={() => setStatus(`Code accepted. Signing ${email} in to Boardly.`)}
            onResend={() => setStatus(`A new code is on its way to ${email}.`)}
            onProvider={(provider) => setStatus(`Continuing with ${SOCIAL_PROVIDERS[provider].label}.`)}
          />
        </div>
      </div>
    </div>
  );
}
