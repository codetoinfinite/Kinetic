import type { Metadata } from 'next';

import { CodeBlock } from '@/components/code/code-block';
import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Theming',
  description: `How ${site.name} components pick up your colours, and the token layer behind them.`,
};

export default function ThemingPage() {
  return (
    <article className="space-y-6">
      <div className="prose">
        <p className="meta text-faint">Docs</p>
        <h1 className="!mt-3 text-display-2 text-fg">Theming</h1>
        <p>
          Components never hard-code a colour. They read Tailwind theme tokens, so they inherit
          whatever your project already defines — installing one into a light, brand-coloured app
          does not drag this site&rsquo;s near-black palette along with it.
        </p>

        <h2>The two-layer token system</h2>
        <p>
          Raw values live on <code>:root</code> as <code>--k-*</code> custom properties. A{' '}
          <code>@theme inline</code> block then republishes them under Tailwind&rsquo;s namespaces,
          which is what turns them into real utilities like <code>bg-bg</code>,{' '}
          <code>text-muted</code> and <code>border-line</code>.
        </p>
        <p>
          The <code>inline</code> keyword is load-bearing. Without it Tailwind resolves each token
          to its <code>:root</code> value at build time, and any theme override you write later
          never lands.
        </p>
      </div>

      <CodeBlock
        lang="css"
        code={`:root {
  --k-bg: oklch(0.145 0 0);
  --k-fg: oklch(0.949 0 0);
  --k-line: oklch(1 0 0 / 8%);
  --k-accent: oklch(0.75 0.16 250);
}

@theme inline {
  --color-bg: var(--k-bg);
  --color-fg: var(--k-fg);
  --color-line: var(--k-line);
  --color-accent: var(--k-accent);
}`}
      />

      <div className="prose">
        <h2>Light and dark</h2>
        <p>
          Dark is the <code>:root</code> default here because the product is motion — a shader or
          particle field reads correctly against black and washes out against white. Only the light
          theme needs a class, which halves the work the blocking theme script has to do before
          first paint.
        </p>
        <p>
          Your project almost certainly does the opposite. That is fine: the components care only
          that the token names resolve, not which theme is the default.
        </p>

        <h2>Accent by category</h2>
        <p>
          Any subtree tagged with <code>data-category</code> reassigns <code>--k-accent</code> to
          that category&rsquo;s hue. A card, its badge, its motif poster and its hover rule then
          agree on one colour with no props threaded through them, and they cannot drift apart.
        </p>
      </div>

      <CodeBlock
        lang="css"
        code={`[data-category='scroll'] { --k-accent: var(--k-cat-scroll); }
[data-category='webgl'] { --k-accent: var(--k-cat-webgl); }
[data-category='cursor'] { --k-accent: var(--k-cat-cursor); }`}
      />

      <div className="prose">
        <h2>Retheming an installed component</h2>
        <p>
          Two options, both ordinary CSS. Either define the token names the component uses in your
          own theme layer, or wrap it in an element that overrides them locally:
        </p>
      </div>

      <CodeBlock
        lang="tsx"
        code={`<div style={{ ['--k-accent' as string]: 'oklch(0.7 0.19 20)' }}>
  <MagneticButton>Get in touch</MagneticButton>
</div>`}
      />

      <div className="prose">
        <h2>Motion tokens</h2>
        <p>
          Site chrome uses a deliberately narrow easing vocabulary —{' '}
          <code>--ease-out-quart</code>, <code>--ease-out-expo</code>,{' '}
          <code>--ease-in-out-quart</code>. Components do not use these; each one brings the timing
          its technique actually requires, and those values are documented on its page with the
          reason they hold.
        </p>

        <h2>Reduced motion</h2>
        <p>
          The site&rsquo;s own chrome collapses every transition to near-zero under{' '}
          <code>prefers-reduced-motion: reduce</code>. Components deliberately do not rely on that
          rule — for them &ldquo;no motion&rdquo; means rendering a different, still-correct state,
          not running the same animation instantly. Each component reads the preference itself and
          its page states exactly what it does.
        </p>
      </div>
    </article>
  );
}
