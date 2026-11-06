import type { Metadata } from 'next';
import Link from 'next/link';

import { CodeBlock } from '@/components/code/code-block';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Prompts',
  description:
    'Every component ships a written brief you can paste into Claude Code, Codex or Gemini.',
  alternates: { canonical: '/docs/prompts' },
};

const SECTIONS = [
  ['What it does', 'The effect in plain language, so the model builds the right thing before it writes a line.'],
  ['How it works', 'The mechanism as ordered steps. This is the part that stops a model inventing a plausible but wrong approach.'],
  ['Constants — use these values', 'Every tuned number with the reason it holds. Without this a model picks round numbers and the motion feels wrong in a way nobody can name.'],
  ['API', 'The exact signature — prop names, types, defaults.'],
  ['Reference implementation of the core', 'The load-bearing region of the real source, excerpted. Not the whole file: enough that the model matches the technique, little enough that it still writes code in your conventions.'],
  ['Requirements', 'Dependencies, cleanup obligations, and reduced-motion behaviour stated as requirements rather than suggestions.'],
  ['Known pitfalls — avoid these specifically', 'The mistakes this technique actually invites. Naming them up front is cheaper than reviewing them out later.'],
  ['Notes', 'Anything else that changes the implementation — browser limits, ordering constraints, licence boundaries.'],
  ['Definition of done', 'The observable test. The model knows when to stop, and so do you.'],
] as const;

export default function PromptsPage() {
  return (
    <article className="space-y-6">
      <div className="prose">
        <p className="meta text-faint">Docs</p>
        <h1 className="!mt-3 text-display-2 text-fg">Prompts</h1>
        <p>
          Installing the code gives you this implementation. The prompt gives you the technique —
          which is what you want when the component needs to be built against your own markup,
          your own state, or a framework that is not React.
        </p>
        <p>
          Every component page carries one, ready to copy. Paste it into Claude Code, Codex, Gemini
          or any agent with write access to your repository.
        </p>

        <h2>What is in it</h2>
        <p>
          A prompt is not a description of the component. It is a specification, generated from the
          same metadata that drives this site, so it can never drift from the code shown next to
          it. Nine sections:
        </p>
      </div>

      <ol className="space-y-px border-t border-line">
        {SECTIONS.map(([title, body], index) => (
          <li key={title} className="flex gap-5 border-b border-line py-4">
            <span className="meta w-6 shrink-0 pt-0.5 text-faint">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] text-fg">{title}</p>
              <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="prose">
        <h2>Using it</h2>
        <p>
          Copy from the component page, or download the same text as a markdown file and point the
          agent at the path — useful when the prompt is long enough that pasting it into a terminal
          is awkward.
        </p>
      </div>

      <CodeBlock
        code={`# in your project, with the .md saved alongside
claude "build the component described in ./magnetic-button.md"

# or fetch it directly
curl -O ${SITE_URL}/prompts/magnetic-button.md`}
      />

      <div className="prose">
        <h2>Say what is different about your project</h2>
        <p>
          The prompt describes the technique completely and says nothing about your codebase. Add
          that yourself in a sentence or two — it is the difference between a component that works
          and one that fits.
        </p>
      </div>

      <CodeBlock
        lang="markdown"
        code={`<paste the prompt>

Adapt it to this project:
- Plain CSS modules, not Tailwind.
- Our motion values live in tokens.css — use those, not literals.
- Must work inside the existing <Carousel> without owning the scroll container.`}
      />

      <div className="prose">
        <h2>Letting the agent choose the component</h2>
        <p>
          If you do not know which component you want, give the agent the index instead and let it
          pick. <code>/llms.txt</code> is one line per component;{' '}
          <code>/llms-full.txt</code> carries every brief inline, at the cost of being large.
        </p>
        <p>
          Both are plain text and need no key. You can also read the registry itself at{' '}
          <code>/r/registry.json</code>, or browse the same catalogue by hand on the{' '}
          <Link href="/components">components page</Link>.
        </p>
      </div>
    </article>
  );
}
