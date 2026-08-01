'use client';

import { useId, useState } from 'react';

import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/cn';

/* ==========================================================================
   The prompt.
   --------------------------------------------------------------------------
   This is the reason the site exists, and it used to be the third of four
   identical boxes. It gets the accent, the width, and the one primary button on
   the page; nothing else here competes for that.

   Everything besides the button — the rendered text, the collapse, the download
   — exists so the visitor can satisfy themselves about what they are about to
   paste into an agent with write access to their repository. A prompt you
   cannot read before sending is a prompt you should not send.

   Collapsed by default at a fixed height rather than truncated: the full text
   is in the DOM, so browser search and select-all get all of it even while the
   panel is showing you the first screen. Height, not `grid-template-rows`,
   because the collapsed state is a visible slice of the text rather than zero —
   a length cannot interpolate against a flex fraction.
   ========================================================================== */

/* Named because "paste into your agent" means nothing until you recognise your
   own. All five read plain markdown from stdin or the composer, which is the
   whole compatibility story. */
const TOOLS = ['Claude Code', 'Cursor', 'Codex', 'Copilot', 'Gemini CLI'] as const;

export function PromptPanel({
  slug,
  prompt,
  html,
}: {
  slug: string;
  /** Raw markdown. The clipboard payload — never the rendered HTML. */
  prompt: string;
  /** Same markdown, highlighted on the server. */
  html: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();

  const lines = prompt.split('\n').length;
  const words = prompt.split(/\s+/).filter((word) => word.length > 0).length;

  return (
    <div className="panel relative overflow-hidden">
      {/* The one accent-weighted edge in the content column. */}
      <span className="absolute inset-x-0 top-0 h-px bg-accent" aria-hidden="true" />

      <div className="flex flex-wrap items-start gap-x-8 gap-y-5 border-b border-line px-5 pt-5 pb-4">
        <div className="min-w-[16rem] flex-1">
          <h3 className="text-[1.0625rem] tracking-[-0.015em] text-fg">
            Build it with your agent
          </h3>
          <p className="mt-1.5 max-w-prose text-[0.875rem] leading-relaxed text-muted">
            A single self-contained brief: the technique, the constants and why they hold, the
            pitfalls, and the definition of done. Paste it and the component gets written in your
            own conventions instead of copied in ours.
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {TOOLS.map((tool) => (
              <span key={tool} className="meta rounded-sm bg-bg-subtle px-2 py-1 text-faint">
                {tool}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/prompts/${slug}.md`}
            download={`${slug}.md`}
            className="meta rounded-sm border border-line px-2 py-1.5 text-muted transition-colors duration-instant hover:border-line-strong hover:text-fg"
          >
            .md
          </a>
          <CopyButton
            value={prompt}
            label="Copy prompt"
            className="border-transparent bg-accent px-3 py-2 text-accent-fg shadow-[var(--k-elev-1)] transition-[opacity,box-shadow] duration-control hover:opacity-90 hover:shadow-[var(--k-elev-2)]"
          />
        </div>
      </div>

      <div className="relative">
        <div
          id={bodyId}
          className={cn(
            'scrollbar-none overflow-auto px-5 py-5 text-[0.8125rem] leading-[1.7] transition-[max-height] duration-surface ease-out-quart',
            // Markdown wraps: a prompt has prose paragraphs, and a horizontal
            // scrollbar on prose is a reading failure.
            '[&_pre]:bg-transparent [&_pre]:whitespace-pre-wrap [&_code]:break-words',
            expanded ? 'max-h-[52rem]' : 'max-h-[19rem]',
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Always mounted, opacity-toggled: a mask that mounts and unmounts can
            leave a gradient over readable text if the transition is interrupted. */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-surface to-transparent transition-opacity duration-surface',
            expanded ? 'opacity-0' : 'opacity-100',
          )}
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-2.5">
        <span className="meta tabular-nums text-faint">
          {lines} lines · {words} words
        </span>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="meta text-muted transition-colors duration-instant hover:text-fg"
        >
          {expanded ? 'Collapse' : 'Read it all'}
        </button>
      </div>
    </div>
  );
}
