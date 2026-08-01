import type { ComponentMeta } from './schema';

/* ==========================================================================
   The AI prompt.
   --------------------------------------------------------------------------
   This is the artefact that makes the library useful to someone who is not
   going to run `npx shadcn add`. They paste it into Claude Code, Codex or
   Gemini and get the component built into their own codebase, in their own
   conventions.

   The design constraint is that a coding agent fails at motion work in a
   predictable way: it produces something that animates, but with invented
   constants, no cleanup, no reduced-motion path, and a per-frame lerp that
   runs at the wrong speed on a 120 Hz display. So the prompt is organised
   around removing exactly those failure modes — every constant arrives with
   the reason it has that value, cleanup and reduced motion are stated as
   requirements rather than left implicit, and the pitfalls section names the
   specific wrong turns so the model can route around them.

   The critical excerpt is EXTRACTED FROM THE REAL SOURCE at build time, not
   retyped here. A prompt that quotes code which no longer exists is worse
   than a prompt with no code at all.
   ========================================================================== */

function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function numbered(items: readonly string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join('\n');
}

export interface PromptInput {
  meta: ComponentMeta;
  /** The `// #region <criticalRegion>` block, lifted from the real source. */
  excerpt: string | null;
  /** Language tag for the excerpt fence. */
  lang: string;
}

export function buildPrompt({ meta, excerpt, lang }: PromptInput): string {
  const deps = meta.dependencies.length > 0 ? meta.dependencies.join(', ') : 'none beyond React';

  const sections: string[] = [];

  sections.push(
    `# Build: ${meta.title}

${meta.summary}

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.`,
  );

  sections.push(
    `## What it does

${meta.blurb}

- Category: ${meta.category}
- Runtime cost: ${meta.cost}
- Dependencies: ${deps}`,
  );

  sections.push(`## How it works

${numbered(meta.mechanism)}`);

  if (meta.constants.length > 0) {
    sections.push(
      `## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

${meta.constants
  .map((c) => `- \`${c.name} = ${c.value}\`\n  ${c.why}`)
  .join('\n')}`,
    );
  }

  sections.push(
    `## API

\`\`\`ts
${meta.apiSignature}
\`\`\`${
      meta.props.length > 0
        ? `

${meta.props
  .map(
    (p) =>
      `- \`${p.name}: ${p.type}\`${p.default === undefined ? '' : ` — default \`${p.default}\``}\n  ${p.description}`,
  )
  .join('\n')}`
        : ''
    }`,
  );

  if (excerpt) {
    sections.push(
      `## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

\`\`\`${lang}
${excerpt}
\`\`\``,
    );
  }

  sections.push(
    `## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** ${meta.cleanup}

**Reduced motion.** ${meta.reducedMotion}

**Frame-rate independence.** Any smoothing must be a function of delta time.
\`x += (target - x) * 0.1\` converges twice as fast at 120 Hz as at 60 Hz; use
\`x = target + (x - target) * Math.pow(smoothing, dt)\` instead, where
\`smoothing\` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.`,
  );

  sections.push(
    `## Known pitfalls — avoid these specifically

${bullets(meta.pitfalls)}`,
  );

  if (meta.notes.length > 0) {
    sections.push(`## Notes

${bullets(meta.notes)}`);
  }

  sections.push(
    `## Definition of done

${meta.acceptance}

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.`,
  );

  return `${sections.join('\n\n')}\n`;
}

/**
 * Lifts a `// #region name` … `// #endregion` block out of a source file.
 *
 * Returns `null` rather than throwing so the build can aggregate every missing
 * region into one error listing instead of failing on the first.
 */
export function extractRegion(source: string, name: string): string | null {
  const start = new RegExp(`^[ \\t]*//[ \\t]*#region[ \\t]+${escapeRegExp(name)}[ \\t]*$`, 'm');
  const startMatch = start.exec(source);
  if (!startMatch) return null;

  const from = startMatch.index + startMatch[0].length;
  const end = /^[ \t]*\/\/[ \t]*#endregion.*$/m;
  const rest = source.slice(from);
  const endMatch = end.exec(rest);
  if (!endMatch) return null;

  return dedent(rest.slice(0, endMatch.index)).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function dedent(block: string): string {
  const lines = block.split('\n');
  let min = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    if (line.trim() === '') continue;
    const indent = line.length - line.trimStart().length;
    if (indent < min) min = indent;
  }
  if (!Number.isFinite(min) || min === 0) return block;
  return lines.map((line) => (line.trim() === '' ? line : line.slice(min))).join('\n');
}
