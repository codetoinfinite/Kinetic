/**
 * Licence gate. Two things must never be true of `registry/`:
 *
 *   1. It contains GSAP source. GSAP's standard licence grants use, not
 *      redistribution, and says nothing explicit about bundling GSAP inside
 *      another library — so `gsap` stays a declared npm dependency and its code
 *      never lands in a file the CLI copies into someone's repository.
 *      (Its plugins, including the formerly Club-only ones, are free to *use*
 *      since April 2025. This is about shipping the source, not using it.)
 *
 *   2. It contains a binary. No fonts, images, video or Lottie JSON — every
 *      install stays text-only, so nobody inherits licensed artwork by accident.
 *
 * Exits non-zero with the offending paths. Part of `pnpm verify`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(ROOT, 'registry');

/**
 * Fingerprints of vendored GSAP source, not of using GSAP. An `import` from
 * 'gsap' is correct and expected; these strings only appear if the library
 * itself has been pasted in.
 */
const GSAP_SOURCE_MARKERS = [
  '_gsScope',
  'gsap.registerPlugin(_getGSAP()',
  'GreenSock Animation Platform',
  '@license Copyright 2008-',
  'Subject to the terms at https://gsap.com/standard-license',
  '_coreInitted',
  '_gsapWithCSS',
];

/** Anything not source. Everything the registry ships is one of .ts/.tsx/.css. */
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.md']);

type Failure = { path: string; reason: string };

function walk(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(path));
    } else if (entry.isFile()) {
      found.push(path);
    }
  }

  return found;
}

function check(): Failure[] {
  const failures: Failure[] = [];

  for (const path of walk(REGISTRY)) {
    const rel = relative(ROOT, path);
    const ext = extname(path);

    if (!TEXT_EXTENSIONS.has(ext)) {
      const { size } = statSync(path);
      failures.push({
        path: rel,
        reason: `not a source file (${ext || 'no extension'}, ${size} bytes) — the registry ships text only`,
      });
      continue;
    }

    const source = readFileSync(path, 'utf8');
    for (const marker of GSAP_SOURCE_MARKERS) {
      if (source.includes(marker)) {
        failures.push({
          path: rel,
          reason: `contains vendored GSAP source (matched ${JSON.stringify(marker)}) — import from 'gsap' instead`,
        });
        break;
      }
    }

    // A data URI large enough to be a real asset is a binary wearing a hat.
    const dataUri = /data:(?:image|font|video|audio)\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]{2048,})/i.exec(
      source,
    );
    if (dataUri !== null) {
      failures.push({
        path: rel,
        reason: `contains a base64 asset of ${dataUri[1]?.length ?? 0} chars — take media as a prop instead`,
      });
    }
  }

  return failures;
}

const failures = check();

if (failures.length > 0) {
  process.stderr.write(`\ncheck:licenses failed — ${failures.length} problem(s)\n\n`);
  for (const failure of failures) {
    process.stderr.write(`  ${failure.path}\n    ${failure.reason}\n`);
  }
  process.stderr.write('\n');
  process.exit(1);
}

process.stdout.write('check:licenses passed — no vendored GSAP source, no binaries under registry/\n');
