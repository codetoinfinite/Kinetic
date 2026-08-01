import type { ManifestEntry } from '@/__generated__/manifest';

/* ==========================================================================
   What a component costs to run, described once.
   --------------------------------------------------------------------------
   The card and the toolbar both name the runtime tiers, and they used to name
   them separately — which is how `WebGL` ended up in the filter row twice with
   nothing to say which of the two meanings was which. One table, two label
   lengths: `short` is the badge on a tile, `long` is the filter chip.

   `weight` is the tier's position on the cost ladder, drawn on a tile as a
   part-filled meter. It is the only piece of card metadata that ranks rather
   than labels, and it is what makes a shader showpiece look unlike a CSS
   primitive before a word has been read.

   Typed off the manifest rather than off `scripts/schema`: schema.ts pulls in
   zod, and this module is imported by client components.
   ========================================================================== */

export type RuntimeTier = ManifestEntry['cost'];

export const RUNTIME_ORDER = [
  'css',
  'dom',
  'canvas2d',
  'webgl',
] as const satisfies readonly RuntimeTier[];

export const RUNTIME: Record<RuntimeTier, { short: string; long: string; weight: number }> = {
  css: { short: 'CSS', long: 'CSS', weight: 1 },
  dom: { short: 'DOM', long: 'DOM', weight: 2 },
  canvas2d: { short: '2D', long: 'Canvas 2D', weight: 3 },
  webgl: { short: 'GL', long: 'WebGL', weight: 4 },
};

export const TIER_TICKS = [1, 2, 3, 4] as const;

export function isRuntimeTier(value: string | null | undefined): value is RuntimeTier {
  return value !== undefined && value !== null && value in RUNTIME;
}
