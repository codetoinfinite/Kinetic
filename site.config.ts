/* ==========================================================================
   Site identity — the only file you edit to make this site yours.
   --------------------------------------------------------------------------
   Every name, URL, handle and licence string the site renders is read from
   here. Nothing below is duplicated anywhere else in the codebase: the page
   metadata, the footer, the wordmark, the install commands, the shadcn
   registry, `llms.txt`, the sitemap, the robots file, the favicon and the
   social card all derive from these values.

   Change a value here, run `pnpm registry:build`, and the whole site follows.

   The one field that cannot live here alone is `url`. It has to be an absolute
   origin, it is baked into every install command and every registry
   cross-dependency at BUILD time, and it differs between your laptop and
   production — so it reads `SITE_URL` from the environment and falls back to
   the value below. Set `SITE_URL` in your host's environment variables before
   the production build, or the deployed site will hand visitors install
   commands pointing at `localhost`.
   ========================================================================== */

interface SiteConfig {
  /** Product name. Appears in <title>, the wordmark, the OG card, llms.txt. */
  name: string;
  /** Lowercase, no spaces. The shadcn registry name and the `@scope` in install commands. */
  registryName: string;
  /** One short line under the wordmark and after the name in <title>. */
  tagline: string;
  /** The meta description and the OG/Twitter description. Aim for 150-160 characters. */
  description: string;
  /** Absolute production origin, no trailing slash. Overridden by the SITE_URL env var. */
  url: string;
  /** You. `email` is the contact address printed on the licensing page. */
  author: {
    name: string;
    email: string;
    /** Your personal or company site. Empty string hides the link. */
    url: string;
  };
  /** Empty string hides that link everywhere it would appear. */
  social: {
    /** Handle including the leading @, e.g. '@yourhandle'. Used for the Twitter card. */
    x: string;
    /** Full URL to the repository or profile, e.g. 'https://github.com/you/repo'. */
    github: string;
  };
  /** SPDX identifier printed in the footer and on the licensing page. */
  license: string;
  /** localStorage key for the light/dark choice. Namespaced so it cannot collide. */
  themeStorageKey: string;
}

export const site: SiteConfig = {
  name: 'Kinetic',
  registryName: 'kinetic',
  tagline: 'motion components for React',
  description:
    'Production motion components for React: live previews, complete source, and a prompt written for coding agents.',

  // ⚠️ Replace with your own domain, then set SITE_URL to the same value in
  // your host's build environment. Keep the scheme, drop the trailing slash.
  url: 'https://kinetic.example.com',

  // Every field here is opt-in: an empty string removes the link or the line
  // rather than shipping a placeholder. A footer with no contact is better than
  // a footer with a `mailto:` pointing at example.com.
  author: {
    name: 'Ordis AI',
    email: '',
    url: '',
  },

  social: {
    x: '',
    github: '',
  },

  license: 'MIT',
  themeStorageKey: 'kinetic-theme',
};

/**
 * The origin the site is actually served from.
 *
 * Absolute and correct or nothing works: `npx shadcn add <name>` resolves a
 * bare name against shadcn's own registry, so every install command and every
 * cross-item dependency this project emits is a full URL built from this value.
 *
 * Three sources, in order:
 *
 *   1. `SITE_URL` — an explicit override, and the only one that works on a host
 *      that is not Vercel.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — set by Vercel on every deployment
 *      including previews, and always the *production* domain (the shortest
 *      custom domain, or the .vercel.app one). That is what we want even on a
 *      preview build: an install command has to point somewhere permanent, and
 *      a preview URL is dead within days. It carries no scheme, so https:// is
 *      prepended.
 *   3. `site.url` — the value written above.
 *
 * Trailing slashes are stripped so `${SITE_ORIGIN}/r/x.json` can never become
 * `//r/`.
 */
function resolveOrigin(): string {
  const explicit = process.env['SITE_URL'];
  if (explicit !== undefined && explicit !== '') return explicit;

  const vercel = process.env['VERCEL_PROJECT_PRODUCTION_URL'];
  if (vercel !== undefined && vercel !== '') return `https://${vercel}`;

  return site.url;
}

export const SITE_ORIGIN: string = resolveOrigin().replace(/\/+$/, '');

/**
 * True while the origin is still the placeholder nobody has replaced.
 * `scripts/build-registry.ts` turns this into a hard failure on CI, where a
 * build that bakes `example.com` into 119 install commands is not a warning.
 */
export const SITE_ORIGIN_IS_PLACEHOLDER: boolean = SITE_ORIGIN.includes('example.com');
