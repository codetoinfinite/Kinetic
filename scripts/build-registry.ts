import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { SITE_ORIGIN, SITE_ORIGIN_IS_PLACEHOLDER, site } from '../site.config';
import { buildPrompt, extractRegion } from './prompt-template';
import { CATEGORIES, CATEGORY_BLURB, CATEGORY_LABEL, componentMeta, type ComponentMeta } from './schema';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const META_DIR = path.join(ROOT, 'registry', 'meta');
const DEMO_DIR = path.join(ROOT, 'registry', 'demos');
const HOOKS_DIR = path.join(ROOT, 'registry', 'hooks');
const LIB_DIR = path.join(ROOT, 'registry', 'lib');
const OUT_DIR = path.join(ROOT, '__generated__');
const PUBLIC_DIR = path.join(ROOT, 'public');

/* Identity comes from `site.config.ts`, the one file a new owner edits. This
   script bakes it into registry.json, public/r/*.json, llms.txt and
   llms-full.txt, so those outputs are only ever as correct as the last build:
   set `SITE_URL` in the deploy environment BEFORE `pnpm build`, or every
   install command the site hands out points at whatever the config falls back
   to.

   Every `registryDependencies` entry has to be an absolute URL — a bare name
   like `use-raf` resolves against shadcn's own registry, not this one, and
   installs the wrong thing or nothing at all. */
const SITE_NAME = site.registryName;
const SITE_URL = SITE_ORIGIN;

/* Locally this is a nuisance you can ignore; on a deploy it is a broken site
   that still returns 200, so it fails there rather than warning. `CI` is set by
   Vercel, GitHub Actions and every other runner, and by nothing on a laptop. */
if (SITE_ORIGIN_IS_PLACEHOLDER) {
  const message =
    `SITE_URL is unset, so every install command and registryDependency will be ` +
    `built against the placeholder origin ${SITE_ORIGIN}. Set SITE_URL in the ` +
    `build environment, or edit \`url\` in site.config.ts.`;
  if (process.env['CI'] !== undefined) throw new Error(message);
  console.warn(`\n⚠️  ${message}\n`);
}

/* ==========================================================================
   One input, several outputs that must never disagree.
   --------------------------------------------------------------------------
   `registry/meta/<slug>.ts` is the only place a component is described. From
   it this script derives the shadcn registry, the typed data the site renders,
   the lazy preview map, the markdown docs, and the AI prompt.

   The alternative — writing the description once for the registry, once for
   the docs page, and once for the prompt — degrades silently. A constant gets
   retuned in the source, the docs still quote the old value, and the prompt
   teaches it to every model that reads it. Deriving all three from one file
   means that failure is impossible rather than merely discouraged.
   ========================================================================== */

// Order matters: the `ui` catch-all must run last, and `cn` last of all.
const PATH_REWRITES: ReadonlyArray<readonly [RegExp, string]> = [
  [/@\/registry\/hooks\//g, '@/hooks/'],
  [/@\/registry\/lib\//g, '@/lib/'],
  [/@\/registry\/shaders\//g, '@/components/motion/shaders/'],
  [/@\/registry\/ui\//g, '@/components/motion/'],
  [/@\/lib\/cn/g, '@/lib/utils'],
];

function rewritePaths(source: string): string {
  let out = source;
  for (const [pattern, replacement] of PATH_REWRITES) out = out.replace(pattern, replacement);
  return out;
}

/** Where a registry file lands in the consumer's project. */
function targetFor(filePath: string): string {
  const name = path.basename(filePath);
  if (filePath.includes('registry/hooks/')) return `hooks/${name}`;
  if (filePath.includes('registry/lib/')) return `lib/${name}`;
  if (filePath.includes('registry/shaders/')) return `components/motion/shaders/${name}`;
  return `components/motion/${name}`;
}

function langFor(filePath: string): string {
  return filePath.endsWith('.tsx') ? 'tsx' : 'ts';
}

/**
 * A shared hook or lib file. These are published as their own registry items
 * and reached through `registryDependencies`; a component that also inlines one
 * into its own `files[]` ships two copies of it, which drift apart the first
 * time either is edited.
 */
function isSupportPath(filePath: string): boolean {
  return filePath.includes('registry/hooks/') || filePath.includes('registry/lib/');
}

/**
 * Runtime packages that ship no type declarations of their own, mapped to the
 * package that supplies them. `three` is the only one the catalogue uses —
 * `gsap` and `ogl` both point a `types` entry at their own bundled
 * declarations — but without this a three-based component installs into a
 * strict TypeScript project and fails to compile on its very first import.
 */
const TYPES_PACKAGE: Record<string, string> = { three: '@types/three' };

/** `"three@^0.185.1"` → `"three"`, leaving a scoped name's own `@` alone. */
function packageName(spec: string): string {
  const at = spec.lastIndexOf('@');
  return at > 0 ? spec.slice(0, at) : spec;
}

/**
 * The type packages a consumer needs alongside `dependencies`.
 *
 * Ranges are read from this repo's own devDependencies rather than written out
 * here, so the version a consumer installs cannot drift from the one the
 * catalogue is actually compiled against.
 */
function typeDependencies(dependencies: string[], devDeps: Record<string, string>): string[] {
  const out: string[] = [];
  for (const spec of dependencies) {
    const types = TYPES_PACKAGE[packageName(spec)];
    if (types === undefined) continue;
    const range = devDeps[types];
    if (range === undefined) {
      throw new Error(`"${spec}" needs ${types}, which is not in package.json devDependencies`);
    }
    out.push(`${types}@${range}`);
  }
  return out;
}

/** A same-registry dependency has to be addressed by URL, not by bare name. */
function itemUrl(slug: string): string {
  return `${SITE_URL}/r/${slug}.json`;
}

/* -- what a file actually imports ------------------------------------------ */

const REF_RE = /@\/registry\/(hooks|lib|shaders|ui)\/([a-z0-9-]+)/g;

interface Refs {
  hooks: Set<string>;
  lib: Set<string>;
  shaders: Set<string>;
  ui: Set<string>;
}

function emptyRefs(): Refs {
  return { hooks: new Set(), lib: new Set(), shaders: new Set(), ui: new Set() };
}

/**
 * Reads dependencies out of the source rather than trusting the metadata.
 *
 * A hand-maintained `registryDependencies` list is one more thing to forget,
 * and forgetting it is invisible here — it only shows up in a consumer's
 * project as an unresolved import after `npx shadcn add`. The imports are the
 * truth; the declaration is a courtesy.
 */
function collectRefs(code: string, into: Refs = emptyRefs()): Refs {
  for (const match of code.matchAll(REF_RE)) {
    const kind = match[1];
    const name = match[2];
    if (kind === undefined || name === undefined) continue;
    if (kind === 'hooks') into.hooks.add(name);
    else if (kind === 'lib') into.lib.add(name);
    else if (kind === 'shaders') into.shaders.add(name);
    else into.ui.add(name);
  }
  return into;
}

/** A shared hook or lib file, published as its own registry item. */
interface Support {
  slug: string;
  path: string;
  type: 'registry:hook' | 'registry:lib';
  /** Other support slugs this one imports. */
  deps: string[];
  code: string;
}

async function loadSupport(): Promise<Map<string, Support>> {
  const support = new Map<string, Support>();

  for (const [dir, prefix, type] of [
    [HOOKS_DIR, 'registry/hooks', 'registry:hook'],
    [LIB_DIR, 'registry/lib', 'registry:lib'],
  ] as const) {
    if (!existsSync(dir)) continue;
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.ts')).sort()) {
      const slug = file.replace(/\.ts$/, '');
      const relative = `${prefix}/${file}`;
      const code = await readFile(path.join(dir, file), 'utf8');
      const refs = collectRefs(code);
      support.set(slug, {
        slug,
        path: relative,
        type,
        deps: [...refs.hooks, ...refs.lib].filter((d) => d !== slug).sort(),
        code: rewritePaths(code),
      });
    }
  }

  return support;
}

interface Loaded {
  meta: ComponentMeta;
  /** Every shipped file, source already rewritten for consumers. */
  sources: Array<{ path: string; target: string; type: string; lang: string; code: string }>;
  /** Support slugs + component slugs this component genuinely imports. */
  deps: { support: string[]; ui: string[] };
  prompt: string;
}

class BuildErrors {
  private readonly messages: string[] = [];

  add(scope: string, message: string): void {
    this.messages.push(`  ${scope}: ${message}`);
  }

  get count(): number {
    return this.messages.length;
  }

  throwIfAny(stage: string): void {
    if (this.messages.length === 0) return;
    throw new Error(
      `${stage} failed with ${this.messages.length} error(s):\n${this.messages.join('\n')}`,
    );
  }
}

/* -- 1. discover + validate ------------------------------------------------ */

async function load(support: Map<string, Support>): Promise<Loaded[]> {
  if (!existsSync(META_DIR)) {
    throw new Error(`No metadata directory at ${META_DIR}`);
  }

  const files = (await readdir(META_DIR)).filter((f) => f.endsWith('.ts')).sort();
  const errors = new BuildErrors();
  const loaded: Loaded[] = [];
  const seen = new Map<string, string>();
  /** Support files a meta listed in `files[]`; stripped, then reported. */
  const inlinedSupport: string[] = [];

  for (const file of files) {
    const scope = `registry/meta/${file}`;
    const expectedSlug = file.replace(/\.ts$/, '');

    let raw: unknown;
    try {
      const mod = (await import(pathToFileURL(path.join(META_DIR, file)).href)) as {
        default?: unknown;
      };
      raw = mod.default;
    } catch (error) {
      errors.add(scope, `failed to import — ${(error as Error).message}`);
      continue;
    }

    if (raw === undefined) {
      errors.add(scope, 'no default export');
      continue;
    }

    const parsed = componentMeta.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.add(scope, `${issue.path.join('.') || '(root)'} — ${issue.message}`);
      }
      continue;
    }

    const meta = parsed.data;

    // A slug that disagrees with its filename breaks the lazy import map in a
    // way that only shows up as a 404 at runtime, on one route, in production.
    if (meta.slug !== expectedSlug) {
      errors.add(scope, `slug "${meta.slug}" does not match filename "${expectedSlug}"`);
      continue;
    }

    const previous = seen.get(meta.slug);
    if (previous !== undefined) {
      errors.add(scope, `duplicate slug "${meta.slug}", already defined by ${previous}`);
      continue;
    }
    seen.set(meta.slug, scope);

    // -- files exist, and carry their consumer-side target
    const sources: Loaded['sources'] = [];
    const refs = emptyRefs();
    let missing = false;
    for (const file_ of meta.files) {
      const abs = path.join(ROOT, file_.path);
      if (!existsSync(abs)) {
        errors.add(scope, `files[] references missing file ${file_.path}`);
        missing = true;
        continue;
      }
      const code = await readFile(abs, 'utf8');
      collectRefs(code, refs);
      // A support file listed here is still read, so its own imports are
      // collected, but it is not shipped inside this item — the import that
      // put it in `refs` already routes it through `registryDependencies`.
      if (isSupportPath(file_.path)) {
        inlinedSupport.push(`${meta.slug} → ${file_.path}`);
        continue;
      }
      sources.push({
        path: file_.path,
        target: file_.target ?? targetFor(file_.path),
        type: file_.type,
        lang: langFor(file_.path),
        code: rewritePaths(code),
      });
    }
    if (missing) continue;

    // -- a shader the component imports but did not list would install as a
    // component with no shader. Fold it in rather than making it an error the
    // author has to fix by hand.
    for (const shader of refs.shaders) {
      const relative = `registry/shaders/${shader}.ts`;
      if (sources.some((s) => s.path === relative)) continue;
      const abs = path.join(ROOT, relative);
      if (!existsSync(abs)) {
        errors.add(scope, `imports @/registry/shaders/${shader} but ${relative} does not exist`);
        missing = true;
        continue;
      }
      const code = await readFile(abs, 'utf8');
      collectRefs(code, refs);
      sources.push({
        path: relative,
        target: targetFor(relative),
        type: 'registry:lib',
        lang: 'ts',
        code: rewritePaths(code),
      });
    }
    if (missing) continue;

    // -- demo exists
    const demoPath = path.join(DEMO_DIR, `${meta.slug}.tsx`);
    if (!existsSync(demoPath)) {
      errors.add(scope, `no demo at registry/demos/${meta.slug}.tsx`);
      continue;
    }

    // -- the prompt's code excerpt comes from the real source, never retyped
    const primary = sources[0];
    if (primary === undefined) {
      errors.add(scope, 'files[] is empty after resolution');
      continue;
    }
    const original = await readFile(path.join(ROOT, primary.path), 'utf8');
    const excerpt = extractRegion(original, meta.criticalRegion);
    if (excerpt === null) {
      errors.add(
        scope,
        `no "// #region ${meta.criticalRegion}" … "// #endregion" block in ${primary.path}`,
      );
      continue;
    }

    // A component made of several files imports its own siblings; those are
    // already shipped in files[] and must not become registry dependencies.
    const own = new Set(sources.map((s) => path.basename(s.path).replace(/\.tsx?$/, '')));

    loaded.push({
      meta,
      sources,
      deps: {
        support: [...refs.hooks, ...refs.lib].sort(),
        ui: [...refs.ui].filter((name) => !own.has(name)).sort(),
      },
      prompt: buildPrompt({ meta, excerpt: rewritePaths(excerpt), lang: primary.lang }),
    });
  }

  errors.throwIfAny('Validation');

  if (inlinedSupport.length > 0) {
    process.stdout.write(
      `note: ${inlinedSupport.length} inlined support file(s) moved to registryDependencies\n` +
        inlinedSupport.map((line) => `  ${line}\n`).join(''),
    );
  }

  // Cross-references resolve only once every slug is known.
  const slugs = new Set(loaded.map((l) => l.meta.slug));
  const linkErrors = new BuildErrors();
  for (const { meta, deps } of loaded) {
    const scope = `registry/meta/${meta.slug}.ts`;

    for (const dep of deps.ui) {
      if (!slugs.has(dep)) {
        linkErrors.add(scope, `imports @/registry/ui/${dep}, which is not a component`);
      }
    }
    for (const dep of deps.support) {
      if (!support.has(dep)) {
        linkErrors.add(scope, `imports @/registry/{hooks,lib}/${dep}, which does not exist`);
      }
    }

    // A declared dependency that nothing imports is stale metadata, not a
    // build failure — but a declared name that resolves to neither a component
    // nor a support file is a typo that would ship.
    for (const dep of meta.registryDependencies) {
      if (dep.startsWith('http') || dep.startsWith('@') || dep.includes('/')) continue;
      if (!slugs.has(dep) && !support.has(dep)) {
        linkErrors.add(scope, `registryDependencies "${dep}" matches no component or support file`);
      }
    }
  }
  linkErrors.throwIfAny('Cross-reference');

  loaded.sort((a, b) => a.meta.slug.localeCompare(b.meta.slug));
  return loaded;
}

/* -- 2. shadcn registry.json ----------------------------------------------- */

/**
 * Every support file reachable from `roots`, following support-to-support
 * imports. `use-smooth-pointer` pulls in `use-raf` and `damp`; installing it
 * without them produces a component that does not compile.
 */
function closeOverSupport(roots: Iterable<string>, support: Map<string, Support>): string[] {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const slug = queue.pop();
    if (slug === undefined || seen.has(slug)) continue;
    const entry = support.get(slug);
    if (entry === undefined) continue;
    seen.add(slug);
    queue.push(...entry.deps);
  }
  return [...seen].sort();
}

async function writeRegistryJson(items: Loaded[], support: Map<string, Support>): Promise<void> {
  // Only publish support files something actually uses. An unreferenced hook
  // in the registry is a promise to maintain an item nobody installs.
  const usedSupport = closeOverSupport(
    items.flatMap((i) => i.deps.support),
    support,
  );

  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8')) as {
    devDependencies?: Record<string, string>;
  };
  const devDeps = pkg.devDependencies ?? {};

  const componentItems = items.map(({ meta, sources, deps }) => ({
    name: meta.slug,
    type: 'registry:ui' as const,
    title: meta.title,
    description: meta.blurb,
    categories: [meta.category],
    dependencies: meta.dependencies,
    // Only emitted when something is actually needed, so the common case stays
    // an unchanged payload rather than an empty array on every item.
    ...(() => {
      const types = typeDependencies(meta.dependencies, devDeps);
      return types.length > 0 ? { devDependencies: types } : {};
    })(),
    // Derived from the imports, not from the declaration — see collectRefs.
    registryDependencies: [...deps.ui, ...deps.support].map(itemUrl),
    files: sources.map((s) => ({ path: s.path, type: s.type, target: s.target })),
    ...(meta.cssVars ? { cssVars: meta.cssVars } : {}),
    // `meta` is copied verbatim into every public/r/<name>.json, which is
    // what `npx shadcn add` downloads. Prose belongs in the docs, not in a
    // payload every consumer pays for — keep this to filter facets.
    meta: { category: meta.category, cost: meta.cost, tags: meta.tags },
  }));

  const supportItems = usedSupport.map((slug) => {
    const entry = support.get(slug);
    if (entry === undefined) throw new Error(`unreachable: support "${slug}"`);
    return {
      name: entry.slug,
      type: entry.type,
      title: entry.slug,
      description: `Shared ${entry.type === 'registry:hook' ? 'hook' : 'utility'} used by ${site.name} components.`,
      dependencies: [] as string[],
      registryDependencies: entry.deps.map(itemUrl),
      files: [{ path: entry.path, type: entry.type, target: targetFor(entry.path) }],
    };
  });

  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: SITE_NAME,
    homepage: SITE_URL,
    items: [...componentItems, ...supportItems],
  };

  await writeFile(path.join(ROOT, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
}

/* -- 3. generated modules -------------------------------------------------- */

const BANNER = `// Generated by scripts/build-registry.ts. Do not edit.\n`;

async function writeGenerated(items: Loaded[], support: Map<string, Support>): Promise<void> {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  // -- full metadata, server-side only
  await writeFile(
    path.join(OUT_DIR, 'index.ts'),
    `${BANNER}import type { ComponentMeta } from '@/scripts/schema';

export const COMPONENTS: ComponentMeta[] = ${JSON.stringify(
      items.map((i) => i.meta),
      null,
      2,
    )};

export const BY_SLUG: Record<string, ComponentMeta> = Object.fromEntries(
  COMPONENTS.map((c) => [c.slug, c]),
);
`,
  );

  // -- the light index the client filters against
  await writeFile(
    path.join(OUT_DIR, 'manifest.ts'),
    `${BANNER}export interface ManifestEntry {
  slug: string;
  title: string;
  category: ${CATEGORIES.map((c) => `'${c}'`).join(' | ')};
  cost: 'css' | 'dom' | 'canvas2d' | 'webgl';
  motif: string;
  blurb: string;
  tags: string[];
  deps: string[];
}

export const MANIFEST: ManifestEntry[] = ${JSON.stringify(
      items.map(({ meta }) => ({
        slug: meta.slug,
        title: meta.title,
        category: meta.category,
        cost: meta.cost,
        motif: meta.motif,
        blurb: meta.blurb,
        tags: meta.tags,
        deps: meta.dependencies.map((d) => d.split('@')[0] ?? d),
      })),
      null,
      2,
    )};

export const CATEGORY_LABEL = ${JSON.stringify(CATEGORY_LABEL, null, 2)} as const;
export const CATEGORY_BLURB = ${JSON.stringify(CATEGORY_BLURB, null, 2)} as const;
export const CATEGORY_COUNTS: Record<string, number> = ${JSON.stringify(
      Object.fromEntries(
        CATEGORIES.map((c) => [c, items.filter((i) => i.meta.category === c).length]),
      ),
      null,
      2,
    )};
`,
  );

  // -- lazy preview map.
  // Every specifier below is a static string literal. A template literal here
  // would defer the resolution to runtime, so a renamed or deleted demo would
  // ship as a chunk that 404s on one route instead of failing the build.
  await writeFile(
    path.join(OUT_DIR, 'previews.tsx'),
    `${BANNER}'use client';

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export const PREVIEWS: Record<string, LazyExoticComponent<ComponentType>> = {
${items
  .map(({ meta }) => `  '${meta.slug}': lazy(() => import('@/registry/demos/${meta.slug}')),`)
  .join('\n')}
};
`,
  );

  // -- raw sources for the code panel. Server-side: highlighting happens in
  // the RSC, so none of this reaches a client bundle.
  //
  // Everything the component pulls in is included, transitively: the sibling
  // components it renders and the hooks and libs any of those import. "Get the
  // code" has to mean all of it — a page that shows the component but not the
  // hook it depends on hands the visitor something that does not compile.
  // Keyed by target so a file reached by two paths is one tab, not two.
  const bySlug = new Map(items.map((item) => [item.meta.slug, item] as const));

  const withSupport = items.map((item) => {
    const files = new Map<string, Loaded['sources'][number]>();
    const supportRoots = new Set<string>();
    const visited = new Set<string>();
    const queue = [item.meta.slug];

    while (queue.length > 0) {
      const slug = queue.pop();
      if (slug === undefined || visited.has(slug)) continue;
      visited.add(slug);

      const component = bySlug.get(slug);
      // Unreachable — deps.ui is validated against the slug set in load() —
      // but a component silently dropped here would be a missing tab, so it
      // fails loudly instead.
      if (component === undefined) throw new Error(`unreachable: component "${slug}"`);

      for (const source of component.sources) files.set(source.target, source);
      for (const dep of component.deps.support) supportRoots.add(dep);
      queue.push(...component.deps.ui);
    }

    for (const slug of closeOverSupport(supportRoots, support)) {
      const entry = support.get(slug);
      if (entry === undefined) throw new Error(`unreachable: support "${slug}"`);
      const target = targetFor(entry.path);
      if (files.has(target)) continue;
      files.set(target, {
        path: entry.path,
        target,
        type: entry.type,
        lang: 'ts',
        code: entry.code,
      });
    }

    return [item.meta.slug, [...files.values()]] as const;
  });

  await writeFile(
    path.join(OUT_DIR, 'sources.ts'),
    `${BANNER}export interface SourceFile {
  path: string;
  target: string;
  type: string;
  lang: string;
  code: string;
}

export const SOURCES: Record<string, SourceFile[]> = ${JSON.stringify(
      Object.fromEntries(withSupport),
      null,
      2,
    )};

export const PROMPTS: Record<string, string> = ${JSON.stringify(
      Object.fromEntries(items.map((i) => [i.meta.slug, i.prompt])),
      null,
      2,
    )};
`,
  );
}

/* -- 4. markdown + llms.txt ------------------------------------------------ */

async function writeMarkdown(items: Loaded[]): Promise<void> {
  const promptsDir = path.join(PUBLIC_DIR, 'prompts');
  await rm(promptsDir, { recursive: true, force: true });
  await mkdir(promptsDir, { recursive: true });

  for (const { meta, prompt } of items) {
    await writeFile(path.join(promptsDir, `${meta.slug}.md`), prompt);
  }

  const byCategory = CATEGORIES.map((category) => {
    const list = items.filter((i) => i.meta.category === category);
    if (list.length === 0) return null;
    return `## ${CATEGORY_LABEL[category]}\n\n${list
      .map(({ meta }) => `- [${meta.title}](${SITE_URL}/c/${meta.slug}): ${meta.blurb}`)
      .join('\n')}`;
  }).filter((s): s is string => s !== null);

  await writeFile(
    path.join(PUBLIC_DIR, 'llms.txt'),
    `# ${site.name}

> ${items.length} ${site.tagline}. Every component ships its full source, a
> shadcn registry item, and a prompt written for coding agents.

Each component has a prompt at ${SITE_URL}/prompts/<slug>.md

${byCategory.join('\n\n')}
`,
  );

  await writeFile(
    path.join(PUBLIC_DIR, 'llms-full.txt'),
    items.map(({ prompt }) => prompt).join('\n\n---\n\n'),
  );
}

/* -- 5. installable items -------------------------------------------------- */

/** Metadata only. Declares the format; nothing fetches it at install time. */
const ITEM_SCHEMA = 'https://ui.shadcn.com/schema/registry-item.json';

/**
 * One JSON file per item under `public/r/`, each carrying its sources inlined.
 * This is what `npx shadcn add <url>` downloads.
 *
 * This step used to shell out to the shadcn CLI. It does two things — add
 * `$schema` and inline `content` — so doing it here costs a dozen lines and
 * removes the last third-party executable from the build. The emitted shape is
 * unchanged, so consumers keep installing with the same CLI: the format is a
 * published contract, not a dependency.
 *
 * Imports are rewritten on the way out. On disk these files reach each other
 * through `@/registry/*`, which is this repository's layout and not the
 * consumer's; shipping them unrewritten produces components that import
 * directories nobody else has.
 */
async function writeRegistryItems(): Promise<void> {
  const registry = JSON.parse(await readFile(path.join(ROOT, 'registry.json'), 'utf8')) as {
    items: Array<{ name: string; files: Array<{ path: string }> }>;
  };

  const outDir = path.join(PUBLIC_DIR, 'r');
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await Promise.all(
    registry.items.map(async (item) => {
      const files = await Promise.all(
        item.files.map(async (file) => ({
          ...file,
          content: rewritePaths(await readFile(path.join(ROOT, file.path), 'utf8')),
        })),
      );

      await writeFile(
        path.join(outDir, `${item.name}.json`),
        `${JSON.stringify({ $schema: ITEM_SCHEMA, ...item, files }, null, 2)}\n`,
      );
    }),
  );

  // The index, served next to the items so the whole catalogue is reachable
  // from one URL. File contents stay out of it — it is a directory, not a
  // payload, and inlining 119 components would make it megabytes.
  await writeFile(path.join(outDir, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
}

/* -- main ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const support = await loadSupport();
  const items = await load(support);

  if (items.length === 0) {
    throw new Error('No components found. Expected files in registry/meta/.');
  }

  await writeRegistryJson(items, support);
  await writeGenerated(items, support);
  await writeMarkdown(items);
  await writeRegistryItems();

  const counts = CATEGORIES.map(
    (c) => `${c} ${items.filter((i) => i.meta.category === c).length}`,
  ).join('  ');
  console.log(`registry: ${items.length} components  (${counts})`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
