import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { SiteHeader } from '@/components/nav/site-header';
import { SiteFooter } from '@/components/nav/site-footer';
import { ThemeScript } from '@/components/nav/theme-script';
import { SITE_ORIGIN, site } from '@/site.config';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/* Every string below comes from `site.config.ts`. Nothing here is worth
   editing directly — change the config and the tags, the OG card, the sitemap
   and the install commands all move together. */
const TITLE = `${site.name} — ${site.tagline}`;

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: ['react', 'motion', 'animation', 'components', 'tailwind', 'shadcn registry'],
  metadataBase: new URL(SITE_ORIGIN),
  // Self-referencing canonical for the home page. Every other route sets its
  // own relative `alternates.canonical`, which Next resolves against
  // `metadataBase` — so a preview deployment never claims the production URL.
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  // `icons` and `openGraph.images` are deliberately absent: `app/icon.svg`,
  // `app/apple-icon.tsx` and `app/opengraph-image.tsx` are file conventions,
  // and Next emits the tags for them itself. Declaring them here as well would
  // duplicate every tag.
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: TITLE,
    description: site.description,
    url: SITE_ORIGIN,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: site.description,
    // Both fields drop out of the rendered tags when the handle is blank.
    ...(site.social.x === '' ? {} : { site: site.social.x, creator: site.social.x }),
  },
  ...(site.author.name === ''
    ? {}
    : {
        authors: [
          site.author.url === ''
            ? { name: site.author.name }
            : { name: site.author.name, url: site.author.url },
        ],
        creator: site.author.name,
        publisher: site.author.name,
      }),
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // Next 16 no longer sets scroll-behavior itself; this attribute opts back
      // in without breaking the router's scroll restoration.
      data-scroll-behavior="smooth"
      // The theme script writes `class` before paint, so the server HTML and
      // the first client render legitimately disagree on this one element.
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      {/* Column layout so the footer is pushed to the bottom of the viewport on
          pages shorter than the window — a footer floating mid-screen above
          bare canvas is the single clearest tell of an unfinished site. */}
      <body className="flex min-h-dvh flex-col bg-bg text-fg antialiased">
        <ThemeScript />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:border focus:border-line-strong focus:bg-surface focus:px-3 focus:py-2 focus:text-fg focus:shadow-[var(--k-elev-2)]"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
