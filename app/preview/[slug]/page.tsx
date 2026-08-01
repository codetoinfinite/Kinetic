import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MANIFEST } from '@/__generated__/manifest';
import { PreviewHost } from '@/components/preview/preview-host';
import type { Motif } from '@/scripts/schema';

/* ==========================================================================
   One component, as much viewport as it can have. Useful for judging motion
   that reads differently at card size — a scrub, a pinned track, a full-bleed
   shader — and for pointing a screen recorder at.
   ========================================================================== */

export function generateStaticParams() {
  return MANIFEST.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = MANIFEST.find((item) => item.slug === slug);
  if (entry === undefined) return {};
  // Noindex, and excluded from the sitemap: this route is the same component as
  // `/c/<slug>` with the writing stripped out, so letting it be indexed puts a
  // contentless duplicate in the index for every page on the site.
  return {
    title: `${entry.title} — preview`,
    description: entry.blurb,
    robots: { index: false, follow: false },
  };
}

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = MANIFEST.find((item) => item.slug === slug);
  if (entry === undefined) notFound();

  return (
    <div data-category={entry.category} className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pb-5">
        <h1 className="text-[1.25rem] tracking-[-0.02em] text-fg">{entry.title}</h1>
        <span className="meta text-accent">{entry.slug}</span>
        <Link
          href={`/c/${slug}`}
          className="meta ml-auto text-muted transition-colors duration-200 hover:text-fg"
        >
          ← Code and prompt
        </Link>
      </div>

      <PreviewHost
        slug={slug}
        cost={entry.cost}
        motif={entry.motif as Motif}
        focused
        className="h-[calc(100vh-13rem)] min-h-[26rem] w-full border border-line"
      />
    </div>
  );
}
