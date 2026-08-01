import Link from 'next/link';

import { CATEGORY_BLURB, CATEGORY_COUNTS, CATEGORY_LABEL } from '@/__generated__/manifest';
import { FeaturedSpreads } from '@/components/home/featured-spreads';
import { Hero } from '@/components/home/hero';
import { CATEGORIES } from '@/scripts/schema';

/* ==========================================================================
   Home.
   --------------------------------------------------------------------------
   One job: make the three-part promise legible in about four seconds — you can
   watch it, you can take the code, you can hand it to an agent — and then get
   out of the way with a link to the grid.

   Everything here is full-bleed. A 1600px column centred in a 2560px window is
   a decision from when pages were documents; this one is an instrument panel,
   so the rules run to both edges and the only thing holding an inner measure is
   prose, which is capped in `ch` where it appears. Sections are separated by a
   single hairline rather than by whitespace.

   No section on this page is a grid of cards. Each band has its own shape, and
   the shape is what tells the reader which band they are in without reading the
   heading:

     Hero        340vh pinned stage, a split-flap board, four lines of copy
     Specs       one hairline row — closes the hero, no dead gap under it
     Spreads     seven full-width bands, alternating, one component each
     Workflow    a sticky heading beside three stacked steps
     Index       seven tall rules handing off to the footer

   There is no eighth band pitching the agent endpoints — the footer already
   lists all three, and saying it twice on one page is how a home page grows to
   six screens of copy.
   ========================================================================== */

/* One line each. These were three paragraphs, and a paragraph is the wrong
   length for a step: the reader is scanning for what the site is, and the
   detail behind every one of these claims is on the page it links to. */
const STEPS = [
  {
    n: '01',
    title: 'Watch it',
    body: 'The real component, running here. Off-screen previews suspend themselves.',
  },
  {
    n: '02',
    title: 'Take the code',
    body: 'Component, hooks, shaders, maths. One shadcn command, or copy the files.',
  },
  {
    n: '03',
    title: 'Hand it to an agent',
    body: 'Every entry ships a written brief. Paste it into Claude Code, Codex or Gemini.',
  },
] as const;

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedSpreads />

      {/* -- workflow ---------------------------------------------------------
          Three boxed columns became a ledger: the heading pins to the top of
          the viewport and stays there while the three steps run past it, so the
          question the steps answer is still on screen when the reader reaches
          the answer. Three columns of equal width made the reader's eye choose
          a starting point; a stack has one.

          The ordinal is the largest type in the section and the faintest colour
          in it, which is what lets a step be read as a step without a box drawn
          round it. */}
      <section className="border-b border-line bg-bg-subtle">
        <div className="xl:grid xl:grid-cols-12">
          <div className="rise px-5 pt-24 pb-14 sm:px-8 sm:pt-32 xl:sticky xl:top-24 xl:col-span-4 xl:self-start xl:pb-32">
            <p className="meta">Workflow</p>
            {/* Display-2, not display-1: this column is a third of the grid, and
                a hero-scale line inside it wraps to four ragged lines with "From
                a" alone on the first. */}
            <h2 className="mt-5 max-w-[16ch] text-display-2 text-fg">
              From a preview to your repository.
            </h2>
            <p className="mt-7 max-w-[34ch] text-lead text-muted">
              Three steps, no account, and nothing to install before the first one.
            </p>
          </div>

          <ol className="xl:col-span-8">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="brace border-t border-line px-5 py-16 sm:px-8 sm:py-24 xl:border-l"
              >
                <div className="grid gap-y-8 sm:grid-cols-[9rem_1fr] sm:gap-x-12">
                  <span className="slide font-mono text-display-1 leading-none text-faint">
                    {step.n}
                  </span>
                  <div>
                    <div aria-hidden="true" className="draw h-px w-full bg-line-strong" />
                    <h3 className="mt-8 text-display-2 text-fg">{step.title}</h3>
                    <p className="mt-5 max-w-[44ch] text-lead text-muted">{step.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -- index ------------------------------------------------------------
          The last band, and deliberately unclosed: the footer's own top hairline
          is the rule that ends it. Seven rules rather than seven cards, each
          tall enough to be a target on a phone, each growing an accent brace at
          its left edge on hover — the same accent the category carries
          everywhere else on the site. */}
      <section>
        <div className="rise flex flex-wrap items-end justify-between gap-x-10 gap-y-6 px-5 pt-24 pb-14 sm:px-8 sm:pt-32 sm:pb-16">
          <div>
            <p className="meta">Index</p>
            <h2 className="mt-5 text-display-1 text-fg">By category</h2>
          </div>
          <p className="max-w-[32ch] text-[0.9375rem] leading-relaxed text-muted">
            Seven families. Each count is what exists today, not a roadmap.
          </p>
        </div>

        {/* Asymmetric padding on purpose: `SiteFooter` opens with `mt-32`, so a
            matching space here would leave a void at the end of the page. */}
        <ul className="pb-6 sm:pb-8">
          {CATEGORIES.map((category) => (
            <li key={category} data-category={category}>
              <Link
                href={`/components?category=${category}`}
                className="brace group grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-x-6 border-t border-line px-5 py-8 transition-colors duration-control ease-out-quart hover:bg-bg-subtle sm:grid-cols-[5rem_16rem_1fr_auto] sm:gap-x-10 sm:px-8 sm:py-11"
              >
                <span className="font-mono text-display-3 leading-none text-accent">
                  {String(CATEGORY_COUNTS[category] ?? 0).padStart(2, '0')}
                </span>
                <span className="text-display-3 text-fg">{CATEGORY_LABEL[category]}</span>
                <span className="hidden max-w-[48ch] text-[0.9375rem] leading-relaxed text-muted sm:block">
                  {CATEGORY_BLURB[category]}
                </span>
                <span
                  aria-hidden="true"
                  className="text-muted transition-transform duration-control ease-out-quart group-hover:translate-x-2"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
