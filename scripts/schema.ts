import { z } from 'zod';

/* ==========================================================================
   The contract.
   --------------------------------------------------------------------------
   Every component in the registry ships a `meta.ts` that satisfies this
   schema. It is the single input to three outputs that must never disagree:

     1. the shadcn registry item        -> npx shadcn add
     2. the detail page                 -> what a human reads
     3. the AI prompt                   -> what a model is told to build

   Deriving all three from one typed object is the whole reason this is a
   schema and not MDX. A field missing here is a compile error, not a silently
   weaker prompt for one component out of a hundred.
   ========================================================================== */

/** Runtime weight. Decides how many previews may be live at once. */
export const cost = z.enum(['css', 'dom', 'canvas2d', 'webgl']);
export type Cost = z.infer<typeof cost>;

/** Which of the eight abstract posters stands in for a dormant preview. */
export const motif = z.enum([
  'rings',
  'wave',
  'grid',
  'noise',
  'split',
  'orbit',
  'stack',
  'trail',
]);
export type Motif = z.infer<typeof motif>;

export const category = z.enum([
  'scroll',
  'webgl',
  'cursor',
  'transition',
  'text',
  'layout',
  'primitive',
]);
export type Category = z.infer<typeof category>;

export const CATEGORIES = category.options;
export const COSTS = cost.options;
export const MOTIFS = motif.options;

export const CATEGORY_LABEL: Record<Category, string> = {
  scroll: 'Scroll',
  webgl: 'WebGL',
  cursor: 'Cursor',
  transition: 'Transition',
  text: 'Text',
  layout: 'Layout',
  primitive: 'Primitives',
};

export const CATEGORY_BLURB: Record<Category, string> = {
  scroll: 'Systems driven by scroll position, velocity, or direction.',
  webgl: 'Shader and GPU work — fields, planes, particles, distortion.',
  cursor: 'Pointer-following, magnetism, hover state, custom cursors.',
  transition: 'Route changes, reveals, enter and exit choreography.',
  text: 'Splitting, staggering, scrambling, and typographic motion.',
  layout: 'Grids, carousels, sticky stacks, and spatial arrangement.',
  primitive: 'The hooks and math everything else is built from.',
};

/** A file that ships to the consumer's project via `npx shadcn add`. */
const registryFile = z.object({
  /** Repo-relative path, e.g. `registry/ui/cylinder-gallery/index.tsx`. */
  path: z.string().min(1),
  /**
   * Where it lands in the consumer's project, e.g. `components/motion/...`.
   * Optional: the build derives it from `path` via `targetFor()`. Deriving is
   * the norm — a hand-written target is 118 chances to typo a consumer path,
   * and a wrong one installs a file where nothing imports it.
   */
  target: z.string().min(1).optional(),
  type: z.enum(['registry:ui', 'registry:hook', 'registry:lib']),
  /** Human label used in the AI prompt's file manifest. */
  role: z.string().min(1).optional(),
});

const constant = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  /** Why this exact number. Blank reasons are how magic numbers get "cleaned up". */
  why: z.string().min(1),
});

const prop = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  default: z.string().optional(),
  description: z.string().min(1),
});

/* `z.record(key, value)` with both arguments is valid in zod 3 and required in
   zod 4 — written this way so the schema is not the thing that breaks on a
   major bump. */
const cssVarBucket = z.record(z.string(), z.string());

export const componentMeta = z.object({
  /** Must equal the containing directory name. Enforced in build phase 0. */
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  title: z.string().min(1),
  category,
  tags: z.array(z.string().min(1)).min(2),
  /** Grid card copy and the registry item's `description`. One line. */
  blurb: z.string().min(1).max(140),
  cost,
  motif,

  files: z.array(registryFile).min(1),

  /** npm specifiers, version included: `three@^0.185.1`. */
  dependencies: z.array(z.string()).default([]),
  /** Other registry items, by bare slug. Resolved transitively by shadcn. */
  registryDependencies: z.array(z.string()).default([]),
  cssVars: z
    .object({
      theme: cssVarBucket.optional(),
      light: cssVarBucket.optional(),
      dark: cssVarBucket.optional(),
    })
    .optional(),

  /** 2-4 sentences. What it is and what it feels like. */
  summary: z.string().min(1),
  /** Ordered implementation steps. This is the spine of the AI prompt. */
  mechanism: z.array(z.string().min(1)).min(3),
  /** Load-bearing numbers a model would otherwise round off. */
  constants: z.array(constant).default([]),
  /** "Do not…" — the highest-signal section of the generated prompt. */
  pitfalls: z.array(z.string().min(1)).min(1),
  notes: z.array(z.string()).default([]),

  /** The exact exported TypeScript signature, verbatim from the source. */
  apiSignature: z.string().min(1),
  props: z.array(prop).default([]),

  /** What this renders when `prefers-reduced-motion: reduce`. */
  reducedMotion: z.string().min(1),
  /** What unmounting must release. WebGL items are checked for this. */
  cleanup: z.string().min(1),
  /** One testable sentence. The smoke test's definition of working. */
  acceptance: z.string().min(1),

  /**
   * Name of the `// #region <name>` block in the source whose body is embedded
   * in the AI prompt. Extracted from the real file at build time so the prompt
   * cannot drift from the code.
   */
  criticalRegion: z.string().default('critical'),
});

export type ComponentMeta = z.infer<typeof componentMeta>;
/** What authors write — `.default()` fields are optional on the way in. */
export type ComponentMetaInput = z.input<typeof componentMeta>;
