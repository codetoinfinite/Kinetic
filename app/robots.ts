import type { MetadataRoute } from 'next';

import { SITE_ORIGIN } from '@/site.config';

/* ==========================================================================
   /robots.txt
   --------------------------------------------------------------------------
   Everything is crawlable except `/preview/`, which holds one bare route per
   component whose only job is to be framed inside the component page. Indexing
   119 chrome-less iframes would put a second, contentless result in the index
   for every real page on the site.
   ========================================================================== */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/preview/' },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
