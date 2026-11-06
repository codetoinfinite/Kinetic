import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { BY_SLUG, COMPONENTS } from '@/__generated__';
import { CATEGORY_LABEL } from '@/__generated__/manifest';
import { PROMPTS, SOURCES } from '@/__generated__/sources';
import { CodeTabs, type CodeFile } from '@/components/code/code-tabs';
import { InstallBlock } from '@/components/code/install-block';
import { Rich } from '@/components/detail/rich-text';
import { SectionHeading } from '@/components/detail/section-heading';
import { SectionNav, type SectionLink } from '@/components/detail/section-nav';
import { ConstantTable, ParamTable } from '@/components/detail/spec-table';
import { PreviewHost } from '@/components/preview/preview-host';
import { PromptPanel } from '@/components/prompt/prompt-panel';
import { highlight } from '@/lib/highlight';
import { SITE_URL } from '@/lib/site';

export function generateStaticParams() {
  return COMPONENTS.map((component) => ({ slug: component.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = BY_SLUG[slug];
  if (meta === undefined) return {};
  // Relative canonical: Next resolves it against `metadataBase`, so a preview
  // deployment points at itself rather than claiming the production URL.
  return {
    title: meta.title,
    description: meta.blurb,
    alternates: { canonical: `/c/${slug}` },
    openGraph: { title: meta.title, description: meta.blurb, url: `/c/${slug}` },
  };
}

const COST_LABEL = {
  css: 'CSS only',
  dom: 'DOM',
  canvas2d: 'Canvas 2D',
  webgl: 'WebGL',
} as const;

/* One list, shared by the sticky nav and the sections themselves, so a renamed
   section cannot leave the nav pointing at an id that no longer exists. Module
   scope because the nav observes it in an effect: a fresh array per render would
   tear down and rebuild the observer every time the active section changed. */
const SECTIONS: readonly SectionLink[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'install', label: 'Install' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'source', label: 'Source' },
  { id: 'api', label: 'API' },
  { id: 'mechanism', label: 'Mechanism' },
  { id: 'behaviour', label: 'Behaviour' },
];

/* ==========================================================================
   The component page.
   --------------------------------------------------------------------------
   Read top to bottom it answers, in order: what does it look like, how do I get
   it, how do I get an agent to build it, what is the code, what can I pass it,
   why does it work, and what will it do to my users.

   Hierarchy is carried by depth and by box grammar rather than by size alone,
   because the previous version was four identical hairline rectangles and read
   as a form. There are exactly four surfaces on this page:

     stage   the preview, in a surface bezel at elev-3 — the only elev-3 here
     panel   the prompt and the source viewer, at elev-1
     well    the install command and the API signature, inset — code you take
             out of the page rather than read in it
     page    tables, mechanism, behaviour: no box at all, hairlines only

   Everything below the preview enters on `.rise`; the hero and the preview
   never do. A test — and a visitor — must find the preview visible on arrival,
   and an entrance animation on the one element the page exists to show is a
   risk with no upside.
   ========================================================================== */

export default async function ComponentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = BY_SLUG[slug];
  if (meta === undefined) notFound();

  const sources = SOURCES[slug] ?? [];
  const prompt = PROMPTS[slug] ?? '';

  // Highlighting all files up front rather than per tab: they are needed
  // together anyway, and it keeps the client component free of async state.
  // The signature and the prompt join the same pass — one highlighter, three
  // kinds of payload, all resolved before the page streams.
  const [files, promptHtml, signatureHtml] = await Promise.all([
    Promise.all(
      sources.map(async (file): Promise<CodeFile> => ({
        path: file.path,
        target: file.target,
        code: file.code,
        kind: file.type.replace('registry:', ''),
        html: await highlight(file.code, file.lang),
      })),
    ),
    highlight(prompt, 'markdown'),
    highlight(meta.apiSignature, 'ts'),
  ]);

  const index = COMPONENTS.findIndex((component) => component.slug === slug);
  const previous = index > 0 ? COMPONENTS[index - 1] : undefined;
  const next = index >= 0 && index < COMPONENTS.length - 1 ? COMPONENTS[index + 1] : undefined;

  const facts: readonly { term: string; value: string }[] = [
    { term: 'Category', value: CATEGORY_LABEL[meta.category] },
    { term: 'Runtime', value: COST_LABEL[meta.cost] },
    { term: 'Files', value: String(files.length) },
    {
      term: 'Dependencies',
      value: meta.dependencies.length === 0 ? 'none' : String(meta.dependencies.length),
    },
  ];

  return (
    <div data-category={meta.category}>
      {/* -- hero ----------------------------------------------------------- */}
      <header className="wash border-b border-line">
        <div className="mx-auto max-w-[100rem] px-5 pt-12 pb-11 sm:px-8 sm:pt-16 sm:pb-14">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Link
              href={`/components?category=${meta.category}`}
              className="meta wipe text-accent"
            >
              {CATEGORY_LABEL[meta.category]}
            </Link>
            <span className="size-1 rounded-full bg-line-strong" aria-hidden="true" />
            <span className="meta text-faint">{COST_LABEL[meta.cost]}</span>
            <span className="size-1 rounded-full bg-line-strong" aria-hidden="true" />
            <span className="meta text-faint">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
            {/* Titles are data, and some of them are a single 20-character
                identifier ("IntersectionObserver Reveal"). At the clamp floor
                of 2.5rem that word is wider than a phone, and without a break
                opportunity it took the whole document with it. */}
            <h1 className="text-display-1 max-w-[20ch] wrap-anywhere text-fg">{meta.title}</h1>

            <div className="lg:pb-1.5">
              <p className="text-lead max-w-prose text-muted">{meta.summary}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {meta.tags.map((tag) => (
                  <span key={tag} className="meta rounded-sm bg-bg-subtle px-2 py-1 text-faint">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <SectionNav sections={SECTIONS} title={meta.title} />

      {/* -- 01 preview ----------------------------------------------------- */}
      <section
        id="preview"
        aria-labelledby="preview-title"
        className="scroll-mt-32 border-b border-line py-9 sm:py-12"
      >
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
          <SectionHeading
            index="01"
            id="preview-title"
            title="Live preview"
            hint="The real component, running in this page."
            action={
              <Link
                href={`/preview/${slug}`}
                className="meta wipe shrink-0 text-muted transition-colors duration-instant hover:text-fg"
              >
                Open standalone
              </Link>
            }
          />

          {/* The bezel is the hierarchy: a surface frame at elev-3 with the
              recessed preview inside it. Nothing else on the page is raised
              this far, so the eye lands here first without needing a size war
              with the headline. */}
          <div className="rounded-sm border border-line bg-surface p-1.5 shadow-[var(--k-highlight),var(--k-elev-3)] sm:p-2">
            <PreviewHost
              slug={slug}
              cost={meta.cost}
              motif={meta.motif}
              kit={meta.kit}
              category={meta.category}
              focused
              className="aspect-square w-full border border-line sm:aspect-[16/10] xl:aspect-[21/9]"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[100rem] px-5 pt-14 pb-20 sm:px-8 sm:pt-16">
        {/* The base `grid-cols` is load-bearing, not decoration. Without it the
            single implicit column is `auto`, which sizes to the max-content of
            its items — and one item is a code panel holding unwrapped source
            lines. That pushed the track past the viewport on a phone and gave
            the whole document a horizontal scrollbar. `minmax(0,1fr)` pins the
            track to the container so the code scrolls inside its own panel. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-16 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0 space-y-16 sm:space-y-20">
            {/* -- 02 install ------------------------------------------------ */}
            <section id="install" aria-labelledby="install-title" className="rise scroll-mt-32">
              <SectionHeading
                index="02"
                id="install-title"
                title="Install"
                hint="Copies the source into your project. Nothing is imported from us at runtime."
              />
              <InstallBlock slug={slug} siteUrl={SITE_URL} dependencies={meta.dependencies} />
              {meta.registryDependencies.length > 0 ? (
                <p className="mt-2 text-[0.8125rem] text-faint">
                  Also installs {meta.registryDependencies.join(', ')} from this registry.
                </p>
              ) : null}
            </section>

            {/* -- 03 prompt ------------------------------------------------- */}
            <section id="prompt" aria-labelledby="prompt-title" className="rise scroll-mt-32">
              <SectionHeading
                index="03"
                id="prompt-title"
                title="Prompt"
                hint="The whole technique, written for an agent."
              />
              <PromptPanel slug={slug} prompt={prompt} html={promptHtml} />
            </section>

            {/* -- 04 source ------------------------------------------------- */}
            <section id="source" aria-labelledby="source-title" className="rise scroll-mt-32">
              <SectionHeading
                index="04"
                id="source-title"
                title="Source"
                hint={
                  files.length === 1
                    ? 'One file, exactly as installed.'
                    : `${files.length} files, exactly as installed.`
                }
              />
              <CodeTabs files={files} />
            </section>

            {/* -- 05 api ---------------------------------------------------- */}
            <section id="api" aria-labelledby="api-title" className="rise scroll-mt-32">
              <SectionHeading
                index="05"
                id="api-title"
                title="API"
                hint="Every parameter, its type and what happens when you change it."
              />

              <div className="scrollbar-none overflow-x-auto rounded-sm border border-line bg-bg-subtle px-4 py-3.5 text-[0.8125rem] leading-[1.7] shadow-[inset_0_1px_3px_var(--k-shadow)] [&_pre]:bg-transparent">
                <div dangerouslySetInnerHTML={{ __html: signatureHtml }} />
              </div>

              {meta.props.length > 0 ? <ParamTable props={meta.props} className="mt-9" /> : null}
            </section>

            {/* -- 06 mechanism ---------------------------------------------- */}
            <section id="mechanism" aria-labelledby="mechanism-title" className="rise scroll-mt-32">
              <SectionHeading
                index="06"
                id="mechanism-title"
                title="How it works"
                hint="The technique in order, not the code in order."
              />

              <ol className="border-t border-line">
                {meta.mechanism.map((step, stepIndex) => (
                  <li
                    key={step}
                    className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 border-b border-line py-4"
                  >
                    <span className="meta pt-1 tabular-nums text-faint">
                      {String(stepIndex + 1).padStart(2, '0')}
                    </span>
                    <p className="max-w-prose text-[0.9375rem] leading-relaxed text-muted">
                      <Rich>{step}</Rich>
                    </p>
                  </li>
                ))}
              </ol>

              {meta.constants.length > 0 ? (
                <div className="mt-11">
                  <h3 className="meta mb-4 text-fg">Load-bearing constants</h3>
                  <ConstantTable constants={meta.constants} />
                </div>
              ) : null}
            </section>

            {/* -- 07 behaviour ---------------------------------------------- */}
            <section id="behaviour" aria-labelledby="behaviour-title" className="rise scroll-mt-32">
              <SectionHeading
                index="07"
                id="behaviour-title"
                title="Behaviour"
                hint="What it does about motion sensitivity, teardown and being finished."
              />

              <div className="rise-row grid gap-4 md:grid-cols-3">
                {[
                  { term: 'Reduced motion', value: meta.reducedMotion },
                  { term: 'Cleanup', value: meta.cleanup },
                  { term: 'Definition of done', value: meta.acceptance },
                ].map((fact) => (
                  <div key={fact.term} className="rise panel rounded-sm p-4">
                    <p className="meta text-faint">{fact.term}</p>
                    <p className="mt-2.5 text-[0.875rem] leading-relaxed text-muted">
                      <Rich>{fact.value}</Rich>
                    </p>
                  </div>
                ))}
              </div>

              {/* The only warning-coloured element on the page, and it is a 2px
                  edge rather than a tinted box: these are notes from someone who
                  has already made the mistake, not an error state. */}
              <div className="mt-10 border-l-2 border-danger/45 pl-5">
                <h3 className="meta text-fg">Pitfalls</h3>
                <ul className="mt-4 space-y-3">
                  {meta.pitfalls.map((pitfall) => (
                    <li
                      key={pitfall}
                      className="max-w-prose text-[0.875rem] leading-relaxed text-muted"
                    >
                      <Rich>{pitfall}</Rich>
                    </li>
                  ))}
                </ul>
              </div>

              {meta.notes.length > 0 ? (
                <div className="mt-10">
                  <h3 className="meta text-fg">Notes</h3>
                  <ul className="mt-4 space-y-3">
                    {meta.notes.map((note) => (
                      <li
                        key={note}
                        className="max-w-prose text-[0.875rem] leading-relaxed text-muted"
                      >
                        <Rich>{note}</Rich>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>

          {/* -- rail ------------------------------------------------------- */}
          <aside className="xl:sticky xl:top-32 xl:self-start">
            <div className="border-t border-line pt-5">
              <dl className="grid grid-cols-2 gap-y-5 xl:grid-cols-1">
                {facts.map((fact) => (
                  <div key={fact.term}>
                    <dt className="meta text-faint">{fact.term}</dt>
                    <dd className="mt-1.5 text-[0.875rem] text-fg">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-7 border-t border-line pt-5">
              <p className="meta text-faint">Installs to</p>
              <ul className="mt-2.5 space-y-1.5">
                {sources.map((file) => (
                  <li
                    key={file.path}
                    className="truncate font-mono text-[0.75rem] text-muted"
                    title={file.target}
                  >
                    {file.target}
                  </li>
                ))}
              </ul>
            </div>

            {meta.dependencies.length > 0 ? (
              <div className="mt-7 border-t border-line pt-5">
                <p className="meta text-faint">Pulls in</p>
                <ul className="mt-2.5 space-y-1.5">
                  {meta.dependencies.map((dependency) => (
                    <li key={dependency} className="font-mono text-[0.75rem] text-muted">
                      {dependency}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {/* -- flow onward ---------------------------------------------------- */}
      <nav aria-label="Adjacent components" className="border-t border-line">
        <div className="mx-auto max-w-[100rem] px-5 py-10 sm:px-8">
          <div className="rise-row grid gap-4 sm:grid-cols-2">
            {previous === undefined ? (
              <span />
            ) : (
              <Link
                href={`/c/${previous.slug}`}
                data-category={previous.category}
                className="rise lift panel group rounded-sm px-5 py-5"
              >
                <span className="meta text-faint">← Previous</span>
                <span className="mt-2.5 block text-[1.0625rem] tracking-[-0.015em] text-muted transition-colors duration-instant group-hover:text-fg">
                  {previous.title}
                </span>
              </Link>
            )}
            {next === undefined ? null : (
              <Link
                href={`/c/${next.slug}`}
                data-category={next.category}
                className="rise lift panel group rounded-sm px-5 py-5 sm:text-right"
              >
                <span className="meta text-faint">Next →</span>
                <span className="mt-2.5 block text-[1.0625rem] tracking-[-0.015em] text-muted transition-colors duration-instant group-hover:text-fg">
                  {next.title}
                </span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
