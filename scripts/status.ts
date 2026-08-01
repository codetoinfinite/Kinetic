/**
 * Build progress, read from disk.
 *
 * The authoring fleet runs as many parallel agents, and any one of them can die
 * mid-task on a transient API error. Agent transcripts are not a reliable record
 * of what landed — the filesystem is. This script diffs `inventory.tsv` (the
 * planned set) against the three files each component must have, so a resumed
 * agent can be told exactly what is missing and never redoes or clobbers
 * finished work.
 *
 *   pnpm status              human-readable summary
 *   pnpm status --missing    flat list of "<slug> <what>" lines, for resume messages
 *   pnpm status --json       machine-readable, for scripting
 *
 * Every run appends one line to scripts/.status-log.jsonl so progress over time
 * survives a crash on either side.
 */
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const INVENTORY = join(HERE, 'inventory.tsv');
const LOG = join(HERE, '.status-log.jsonl');

/** The three files a component is not complete without. */
const PARTS = [
  { key: 'ui', dir: 'registry/ui', ext: '.tsx' },
  { key: 'meta', dir: 'registry/meta', ext: '.ts' },
  { key: 'demo', dir: 'registry/demos', ext: '.tsx' },
] as const;

type Part = (typeof PARTS)[number]['key'];

type Row = {
  slug: string;
  category: string;
  have: Part[];
  missing: Part[];
};

function readInventory(): { slug: string; category: string }[] {
  if (!existsSync(INVENTORY)) {
    throw new Error(`inventory not found at ${INVENTORY}`);
  }

  const lines = readFileSync(INVENTORY, 'utf8').split('\n');
  const header = lines[0]?.split('\t') ?? [];
  const slugAt = header.indexOf('slug');
  const categoryAt = header.indexOf('category');

  if (slugAt === -1 || categoryAt === -1) {
    throw new Error('inventory.tsv is missing a `slug` or `category` column');
  }

  const rows: { slug: string; category: string }[] = [];
  const seen = new Set<string>();

  for (const line of lines.slice(1)) {
    if (line.trim() === '') continue;
    const cells = line.split('\t');
    const slug = cells[slugAt]?.trim();
    const category = cells[categoryAt]?.trim();
    if (slug === undefined || slug === '' || category === undefined) continue;

    // A duplicate slug is fatal to the registry build — two agents writing the
    // same name silently overwrite each other. Surface it here, early and loud.
    if (seen.has(slug)) {
      throw new Error(`duplicate slug in inventory.tsv: ${slug}`);
    }
    seen.add(slug);
    rows.push({ slug, category });
  }

  return rows;
}

function inspect(slug: string, category: string): Row {
  const have: Part[] = [];
  const missing: Part[] = [];

  for (const part of PARTS) {
    const path = join(ROOT, part.dir, `${slug}${part.ext}`);
    (existsSync(path) ? have : missing).push(part.key);
  }

  return { slug, category, have, missing };
}

/** Files on disk with no inventory row — a typo'd slug, or scope drift. */
function orphans(planned: Set<string>): string[] {
  const found = new Set<string>();

  for (const part of PARTS) {
    const dir = join(ROOT, part.dir);
    // A missing directory is not an error on a fresh checkout.
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(part.ext)) continue;
      const slug = name.slice(0, -part.ext.length);
      if (!planned.has(slug)) found.add(`${part.dir}/${name}`);
    }
  }

  return [...found].sort();
}

const planned = readInventory();
const rows = planned.map((row) => inspect(row.slug, row.category));
const complete = rows.filter((row) => row.missing.length === 0);
const started = rows.filter((row) => row.have.length > 0 && row.missing.length > 0);
const untouched = rows.filter((row) => row.have.length === 0);
const stray = orphans(new Set(planned.map((row) => row.slug)));

const byCategory = new Map<string, { total: number; done: number }>();
for (const row of rows) {
  const bucket = byCategory.get(row.category) ?? { total: 0, done: 0 };
  bucket.total += 1;
  if (row.missing.length === 0) bucket.done += 1;
  byCategory.set(row.category, bucket);
}

const snapshot = {
  at: new Date().toISOString(),
  planned: rows.length,
  complete: complete.length,
  started: started.length,
  untouched: untouched.length,
  orphans: stray.length,
};

// Append-only: the ledger is the thing that survives a crash on either side.
appendFileSync(LOG, `${JSON.stringify(snapshot)}\n`);

const argv = process.argv.slice(2);

if (argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify({ ...snapshot, rows, orphans: stray }, null, 2)}\n`);
} else if (argv.includes('--missing')) {
  for (const row of [...started, ...untouched]) {
    process.stdout.write(`${row.slug}\t${row.missing.join(',')}\n`);
  }
} else {
  const pct = rows.length === 0 ? 0 : Math.round((complete.length / rows.length) * 100);
  process.stdout.write(
    `\n  ${complete.length}/${rows.length} complete (${pct}%)  ` +
      `· ${started.length} partial · ${untouched.length} not started\n\n`,
  );

  for (const [category, bucket] of [...byCategory].sort((a, b) => a[0].localeCompare(b[0]))) {
    const width = 24;
    const filled = Math.round((bucket.done / bucket.total) * width);
    const bar = '█'.repeat(filled) + '·'.repeat(width - filled);
    process.stdout.write(
      `  ${category.padEnd(12)} ${bar}  ${String(bucket.done).padStart(3)}/${bucket.total}\n`,
    );
  }

  if (started.length > 0) {
    process.stdout.write('\n  partial:\n');
    for (const row of started) {
      process.stdout.write(`    ${row.slug.padEnd(34)} missing ${row.missing.join(', ')}\n`);
    }
  }

  if (untouched.length > 0) {
    process.stdout.write(`\n  not started (${untouched.length}):\n`);
    for (const row of untouched) {
      process.stdout.write(`    ${row.slug}\n`);
    }
  }

  if (stray.length > 0) {
    process.stdout.write(`\n  on disk but not in inventory (${stray.length}):\n`);
    for (const path of stray) {
      process.stdout.write(`    ${path}\n`);
    }
  }

  process.stdout.write('\n');
}
