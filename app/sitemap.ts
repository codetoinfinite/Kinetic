import type { MetadataRoute } from 'next';

import { MANIFEST } from '@/__generated__/manifest';
import { SITE_ORIGIN } from '@/site.config';

/* Listed literally rather than imported from `components/docs/docs-nav`: that
   module is `'use client'`, and pulling it into a build-time route would drag
   the whole client component in for the sake of four strings. Four docs pages
   is a set that changes about once a year — the component routes below, which
   change constantly, are the ones that must be derived. */
const DOCS = ['/docs/installation', '/docs/theming', '/docs/prompts', '/docs/licensing'] as const;

/* The BoardUI-kit chat starter: a whole app under one prefix. `/components`
   inside it only redirects to the catalogue, so it is not listed. */
const TEMPLATES = [
  '/templates/chat-starter',
  '/templates/chat-starter/dashboard',
  '/templates/chat-starter/login',
  '/templates/chat-starter/signup',
] as const;

/* ==========================================================================
   /sitemap.xml
   --------------------------------------------------------------------------
   Derived, not maintained. The component routes come from the generated
   manifest and the docs routes from the same array the docs rail renders, so
   adding a component or a docs page updates the sitemap with no edit here.

   `/preview/[slug]` is absent on purpose: those routes exist only to be framed
   inside a component page and have no standalone content worth indexing. They
   are also marked `noindex` in their own metadata, and a sitemap entry for a
   noindexed URL is a crawl error in Search Console.

   `lastModified` is omitted rather than stamped with the build date. A date
   that changes on every deploy tells a crawler every page changed, which is
   false, and the signal is then ignored for the pages that really did.
   ========================================================================== */

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_ORIGIN, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_ORIGIN}/components`, changeFrequency: 'weekly', priority: 0.9 },
    ...DOCS.map((href) => ({
      url: `${SITE_ORIGIN}${href}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...TEMPLATES.map((href) => ({
      url: `${SITE_ORIGIN}${href}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...MANIFEST.map((entry) => ({
      url: `${SITE_ORIGIN}/c/${entry.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
