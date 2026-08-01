/**
 * Prompt gate. The AI prompt is a first-class deliverable, not a byproduct — a
 * component whose prompt is missing a section, or whose reference excerpt came
 * out empty because the `// #region critical` marker was never added to the
 * source, is a component that silently fails the third of this site's three
 * promises.
 *
 * Reads the emitted markdown in public/prompts/ rather than re-deriving it, so
 * it validates exactly what a user downloads. Run after `registry:build`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROMPTS = join(ROOT, 'public', 'prompts');
const META = join(ROOT, 'registry', 'meta');

/** Emitted unconditionally by buildPrompt(). Absence is a bug, not a choice. */
const REQUIRED_SECTIONS = [
  '## What it does',
  '## How it works',
  '## API',
  '## Requirements',
  '## Known pitfalls — avoid these specifically',
  '## Definition of done',
] as const;

const EXCERPT_HEADING = '## Reference implementation of the core';

/**
 * Values that mean a template hole was filled with nothing.
 *
 * All four are also legitimate prose and legitimate code: an API signature says
 * `RefObject<HTMLElement | null>`, a pitfall warns that `navigator.clipboard`
 * is `undefined` on insecure origins, a guard rejects NaN. So the token alone
 * proves nothing — see `leaks()` for where it has to appear to be a defect.
 */
const LEAKED = ['undefined', 'null', '[object Object]', 'NaN'] as const;

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Fenced blocks and inline code spans, replaced by a marker of equal weight. */
const FENCE = /```[\s\S]*?```/g;
const CODE_SPAN = /`[^`\n]*`/g;

/**
 * Only the positions the template itself controls are checked. `undefined`,
 * `null` and `NaN` are all things a well-written prompt says on purpose — in a
 * type (`RefObject<HTMLElement | null>`), in a pitfall ("on `http://` origins it
 * is `undefined`"), in a guard ("reject NaN"). Flagging the token wherever it
 * appears makes the gate fire on every good prompt, which is worse than not
 * having it.
 *
 * A leak is the token standing *in place of a value*: as the whole body of an
 * emitted fence, or as the whole value of a bullet or bolded field. Plus
 * `[object Object]`, which is never something anyone wrote deliberately.
 */
function leaks(prompt: string): string | null {
  const tokens = LEAKED.map(escapeRegExp).join('|');

  // Never legitimate anywhere, in prose or in code.
  if (prompt.includes('[object Object]')) return '[object Object]';

  // ```\nundefined\n``` — an emitted fence with nothing but the hole in it.
  const emptyFence = new RegExp(`\`\`\`[a-z]*\\n\\s*(${tokens})\\s*\\n?\`\`\``);
  const fenceMatch = emptyFence.exec(prompt);
  if (fenceMatch?.[1] !== undefined) return fenceMatch[1];

  // `- undefined`, `- **Requires:** null`, `**Cost:** NaN` — a field whose
  // entire value is the hole. Backticks around it are allowed, since the
  // template wraps some holes in a code span.
  const emptyField = new RegExp(
    `^\\s*(?:[-*]\\s+)?(?:\\*\\*[^*\\n]+\\*\\*:?\\s*)?\`?(${tokens})\`?\\s*$`,
    'm',
  );
  const fieldMatch = emptyField.exec(prompt.replace(FENCE, '\n'));
  if (fieldMatch?.[1] !== undefined) return fieldMatch[1];

  // Deliberately no check for the token loose in prose. Every good prompt in
  // this catalogue contains at least one — "log() is mathematically undefined
  // at 0", "returns null for anything the browser handles itself", "renders
  // without a divide-by-zero or a NaN transform". A leak is a hole where a
  // value belongs, and the two rules above are where holes actually land.
  return null;
}

type Failure = { slug: string; reason: string };

function slugsFrom(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(ext))
    .map((name) => name.slice(0, -ext.length))
    .sort();
}

/** Body of the fenced block that follows `heading`, or null if there is none. */
function fencedBlockAfter(prompt: string, heading: string): string | null {
  const at = prompt.indexOf(heading);
  if (at === -1) return null;

  const fenceOpen = prompt.indexOf('```', at);
  if (fenceOpen === -1) return null;

  const bodyStart = prompt.indexOf('\n', fenceOpen);
  if (bodyStart === -1) return null;

  const fenceClose = prompt.indexOf('```', bodyStart);
  if (fenceClose === -1) return null;

  return prompt.slice(bodyStart + 1, fenceClose).trim();
}

function check(): Failure[] {
  const failures: Failure[] = [];
  const expected = slugsFrom(META, '.ts');
  const emitted = new Set(slugsFrom(PROMPTS, '.md'));

  if (expected.length === 0) {
    failures.push({ slug: '—', reason: `no meta files found in ${relative(ROOT, META)}` });
    return failures;
  }

  for (const slug of expected) {
    if (!emitted.has(slug)) {
      failures.push({ slug, reason: 'has a meta file but no emitted prompt — run registry:build' });
      continue;
    }

    const prompt = readFileSync(join(PROMPTS, `${slug}.md`), 'utf8');

    if (prompt.trim().length === 0) {
      failures.push({ slug, reason: 'prompt is empty' });
      continue;
    }

    if (!prompt.startsWith('# Build: ')) {
      failures.push({ slug, reason: 'does not open with the "# Build: <title>" line' });
    }

    for (const heading of REQUIRED_SECTIONS) {
      if (!prompt.includes(heading)) {
        failures.push({ slug, reason: `missing required section ${JSON.stringify(heading)}` });
      }
    }

    // The excerpt is the highest-value part of the prompt and the only part
    // that can vanish silently: `extractRegion` returns nothing when the source
    // has no matching `// #region` marker, and the section is then skipped.
    if (!prompt.includes(EXCERPT_HEADING)) {
      failures.push({
        slug,
        reason: `no ${JSON.stringify(EXCERPT_HEADING)} section — the source is probably missing its "// #region critical" marker`,
      });
    } else {
      const excerpt = fencedBlockAfter(prompt, EXCERPT_HEADING);
      if (excerpt === null) {
        failures.push({ slug, reason: 'reference implementation section has no fenced code block' });
      } else if (excerpt.length < 120) {
        failures.push({
          slug,
          reason: `reference excerpt is only ${excerpt.length} chars — the #region markers are probably in the wrong place`,
        });
      }
    }

    // `## API` always emits a fence around meta.apiSignature.
    const api = fencedBlockAfter(prompt, '## API');
    if (api === null || api.length === 0) {
      failures.push({ slug, reason: 'API section has no signature' });
    }

    const leak = leaks(prompt);
    if (leak !== null) {
      failures.push({ slug, reason: `a template value came out as "${leak}"` });
    }
  }

  for (const slug of emitted) {
    if (!expected.includes(slug)) {
      failures.push({ slug, reason: 'prompt exists with no matching meta file — stale, re-run registry:build' });
    }
  }

  return failures;
}

const failures = check();

if (failures.length > 0) {
  process.stderr.write(`\ncheck:prompts failed — ${failures.length} problem(s)\n\n`);
  for (const failure of failures) {
    process.stderr.write(`  ${failure.slug}\n    ${failure.reason}\n`);
  }
  process.stderr.write('\n');
  process.exit(1);
}

process.stdout.write(
  `check:prompts passed — ${slugsFrom(PROMPTS, '.md').length} prompts, all sections present\n`,
);
