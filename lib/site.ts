/**
 * Re-export so app code has one import path for the origin and does not reach
 * across the repo root for it. The value, and the reasoning behind it, live in
 * `site.config.ts` — the single file anyone rebranding this site has to edit.
 */
export { SITE_ORIGIN as SITE_URL, site } from '@/site.config';
