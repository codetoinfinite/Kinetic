/**
 * Dead-class gate. A Tailwind utility written in a namespace Tailwind does not
 * read compiles to nothing, throws nothing, and looks entirely correct in the
 * source — the element simply inherits whatever it would have inherited anyway.
 *
 * This is not hypothetical. The four-tier duration scale in globals.css was
 * declared as `--duration-*` and used as `duration-control`, but the utility
 * resolves against `--transition-duration-*`; 45 usages across the site were
 * silently falling back to Tailwind's 150ms default. Nothing failed. `tsc` is
 * happy, the build is happy, the tests are happy, and the design system is
 * decoration.
 *
 * So the check is: ask the compiler. Every class-shaped token in every
 * className is compiled on its own, and one that adds no CSS to the output is
 * reported. There is no way to do this by inspection, because the set of valid
 * utilities is a function of the theme.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from 'tailwindcss';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(ROOT, 'app', 'globals.css');

/** Where classes are written. `registry/` is excluded deliberately — see below. */
const SOURCE_ROOTS = ['app', 'components', 'lib'] as const;

/**
 * Classes that legitimately produce no utility CSS.
 *
 * `group` and `peer` are markers read by variants rather than declarations of
 * their own, and `dark`/`light` are the theme switches the toggle writes onto
 * <html>. Everything else in this category — `.panel`, `.lift`, `.meta` and the
 * rest — is discovered from globals.css rather than listed here, so adding a
 * component class does not mean remembering to come back and edit this file.
 */
const MARKERS = new Set(['group', 'peer', 'dark', 'light']);

/** Selectors written directly in globals.css, e.g. `.panel`, `.rise-row`. */
function siteClasses(css: string): Set<string> {
  const found = new Set<string>();
  for (const match of css.matchAll(/\.(-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*)/g)) {
    const name = match[1];
    if (name !== undefined) found.add(name);
  }
  return found;
}

function sourceFiles(): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(path)) files.push(path);
    }
  };

  for (const root of SOURCE_ROOTS) walk(join(ROOT, root));
  return files;
}

/**
 * Class-shaped tokens out of `className={...}` and `cn(...)` calls.
 *
 * Deliberately narrow. Reading only these two forms is what keeps import paths,
 * slugs and prose out of the candidate set, and a class that is assembled at
 * runtime out of fragments is skipped rather than guessed at — a gate that
 * cries wolf gets switched off.
 *
 * `registry/` is out of scope for the same reason: those components ship to
 * other people's projects with other people's themes, so a class that is dead
 * against *this* theme may be alive against theirs.
 */
function candidates(files: string[]): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();

  for (const file of files) {
    const text = readFileSync(file, 'utf8');

    // Bounded to the value of a `className=` (JSX attribute or DOM property)
    // and to the arguments of a `cn(` call. The earlier version started at the
    // word `className` and ran to the next `>`, which in a file that assigns
    // `el.className` swallowed the rest of the function up to the next arrow
    // function — every quoted string in it arriving as a candidate class.
    const blocks = [
      ...text.matchAll(/className\s*=\s*(?:\{[\s\S]{0,4000}?\}|'[^']*'|"[^"]*"|`[^`]*`)/g),
      ...text.matchAll(/\bcn\([\s\S]{0,4000}?\)/g),
    ];

    for (const block of blocks) {
      const body = block[0]
        // Comments first. A prose comment inside a className expression is
        // where `the`, `to` and `none` came from: an apostrophe in "row's"
        // pairs with the next quote and the words between them arrive as a
        // class list.
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ')
        // `state === 'copied' ? … : …` inside cn(): the string is being
        // compared, not applied.
        .replace(/[!=]==?\s*(['"`])[^'"`\n]*\1/g, ' ');

      for (const literal of body.matchAll(/['"`]([^'"`\n]{1,400})['"`]/g)) {
        const body = literal[1];
        if (body === undefined || body.includes('${')) continue;

        for (const token of body.split(/\s+/)) {
          // Uppercase outside an arbitrary value is prose, not a class.
          if (token.length === 0 || /[A-Z]/.test(token.replace(/\[[^\]]*\]/g, ''))) continue;
          if (!/^[a-z@[!-]/.test(token)) continue;

          const seen = found.get(token) ?? new Set<string>();
          seen.add(relative(ROOT, file));
          found.set(token, seen);
        }
      }
    }
  }

  return found;
}

async function main(): Promise<void> {
  const css = readFileSync(ENTRY, 'utf8');

  const compiler = await compile(css, {
    base: ROOT,
    // Second argument is the importing stylesheet's *base directory*, not its
    // path, and the resolver is awaited — returning a plain object type-checks
    // under tsx but not under `tsc`.
    async loadStylesheet(id, base) {
      // `@import "tailwindcss"` and its sub-imports are the only imports this
      // stylesheet has. Resolved against the package rather than through
      // require.resolve so the mapping is visible here rather than implicit.
      const path = id.startsWith('tailwindcss')
        ? join(ROOT, 'node_modules', id === 'tailwindcss' ? 'tailwindcss/index.css' : id)
        : resolve(base, id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
    loadModule() {
      throw new Error('check-classes: globals.css is not expected to load a JS plugin');
    },
  });

  // Everything the stylesheet emits before any candidate is considered: the
  // theme's custom properties, preflight, and every hand-written class.
  //
  // `compiler.build()` is CUMULATIVE — it returns the CSS for every candidate
  // it has been handed so far, not for its argument alone. So "did this token
  // emit anything" is a comparison against the previous call, not against a
  // fixed baseline. Comparing against the baseline made every token after the
  // first live one look live: a gate that always reported success and checked
  // exactly one class. Verified empirically against tailwindcss 4.1 —
  // build([]) 14575, build(['flex']) 14611, build(['duration-bogus']) 14611.
  let emitted = compiler.build([]).length;
  const ignore = siteClasses(css);

  const dead: [string, string[]][] = [];

  for (const [token, where] of candidates(sourceFiles())) {
    const bare = token.replace(/^.*:/, '').replace(/\/[^/]*$/, '');
    if (MARKERS.has(bare) || ignore.has(bare)) continue;
    // `kx-` is the registry's component-local namespace: those classes are
    // declared in a <style> element beside the markup that uses them, not in
    // globals.css, so the compiler is the wrong oracle for them.
    if (bare.startsWith('kx-')) continue;

    let length = emitted;
    try {
      length = compiler.build([token]).length;
    } catch {
      // A token the parser rejects outright is not a class we wrote wrong; it
      // is not a class at all.
      continue;
    }
    if (length <= emitted) dead.push([token, [...where]]);
    else emitted = length;
  }

  if (dead.length === 0) {
    console.log('check:classes — no dead utilities');
    return;
  }

  dead.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  console.error(`check:classes — ${dead.length} class(es) compile to nothing:\n`);
  for (const [token, where] of dead) {
    console.error(`  ${token}`);
    console.error(`      ${where.join(', ')}`);
  }
  console.error(
    '\nEither the utility is misspelled, or the theme variable behind it is in a ' +
      'namespace Tailwind does not read (see the --transition-duration-* aliases ' +
      'in app/globals.css for the shape of that mistake).',
  );
  process.exitCode = 1;
}

await main();
