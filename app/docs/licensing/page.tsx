import type { Metadata } from 'next';

import { site } from '@/site.config';

export const metadata: Metadata = {
  title: 'Licensing',
  description: `What you may do with the ${site.name} code, and what the peer dependencies require.`,
  alternates: { canonical: '/docs/licensing' },
};

/**
 * Read from each package's own `license` field rather than remembered, because a
 * licence stated wrongly is worse than one not stated at all.
 *
 * Only libraries something here actually imports. A dependency listed but never
 * used is a licence obligation taken on for nothing, and it reads to anyone
 * auditing this page as though the components need more than they do.
 */
const DEPENDENCIES = [
  { name: 'gsap', license: "Standard 'no charge' license", note: 'See the section above.' },
  { name: 'three', license: 'MIT', note: 'Used by the WebGL components.' },
  { name: 'ogl', license: 'Unlicense', note: 'Lighter WebGL alternative to three.' },
  { name: 'lenis', license: 'MIT', note: 'Smooth-scroll driver.' },
  { name: 'react-aria-components', license: 'Apache-2.0', note: 'BoardUI form, overlay and navigation components.' },
  { name: 'react-aria', license: 'Apache-2.0', note: 'BoardUI notifications and settings.' },
  { name: '@internationalized/date', license: 'Apache-2.0', note: 'BoardUI date and time fields.' },
  { name: '@remixicon/react', license: 'Remix Icon License 1.0', note: 'BoardUI icons. See the section above.' },
  { name: 'motion', license: 'MIT', note: 'BoardUI enter and exit animations.' },
  { name: 'recharts', license: 'MIT', note: 'BoardUI chart cards.' },
  { name: '@tanstack/react-table', license: 'MIT', note: 'BoardUI data table.' },
  { name: 'tailwind-merge', license: 'MIT', note: 'BoardUI class merging.' },
  { name: 'ai, @ai-sdk/*', license: 'Apache-2.0', note: 'BoardUI agent chat and its API route.' },
  { name: 'shiki', license: 'MIT', note: 'Site only — never installed with a component.' },
  { name: 'fuse.js', license: 'Apache-2.0', note: 'Site only — powers search.' },
] as const;

export default function LicensingPage() {
  return (
    <article className="space-y-6">
      <div className="prose">
        <p className="meta text-faint">Docs</p>
        <h1 className="!mt-3 text-display-2 text-fg">Licensing</h1>
        <p>
          Two separate questions, often confused with each other: what you may do with the code
          here, and what the libraries it depends on require.
        </p>

        <h2>The component code</h2>
        <p>
          Every component on this site is {site.license} licensed. Installing writes files into your
          repository and the relationship ends there — no runtime, no package, no phone-home. Use it
          commercially, edit it beyond recognition, ship it. The Kinetic components need no
          attribution, and a link back is welcome but never required. The BoardUI kit carries its
          own MIT notice, described below.
        </p>
        <p>
          What you cannot get from here is a warranty. Every component is written to handle its own
          edge cases and clean up after itself, and each one states its acceptance criterion — but
          it is your production, so test it in your production.
        </p>

        <h2>The BoardUI kit</h2>
        <p>
          The components marked BoardUI are not written from scratch. They are adapted from the free
          source of <a href="https://github.com/BoardUI/boardui">BoardUI</a>, which is MIT licensed,
          copyright (c) 2026 Mertcan Dundar Esmergul. MIT does ask for one thing: the copyright and
          permission notice stays with every copy. Each adapted file keeps the copyright line in
          its header, and the full notice is in <code>boardui-theme.css</code>, which installs with
          every BoardUI component. Keep both, and the obligation is met. The repository&rsquo;s{' '}
          <code>THIRD_PARTY_NOTICES.md</code> lists every adapted file.
        </p>
        <p>
          BoardUI&rsquo;s own licence page says its free source may be used under MIT terms
          wherever it came from, and that the rest of the page applies only where MIT is silent.
          That rest includes the author&rsquo;s wish that the code not be used to build a competing
          component library. BoardUI Pro is not included here.
        </p>
        <p>
          The kit&rsquo;s icons come from <code>@remixicon/react</code> under the Remix Icon
          License. It allows commercial use without attribution, but it forbids selling the icons on
          their own, building a competing icon set from them, and using one as a logo.
        </p>

        <h2>GSAP</h2>
        <p>
          Some components use GSAP, and its licensing changed in a way worth being precise about.
          Since April 2025, following Webflow&rsquo;s acquisition of GreenSock, GSAP is free for
          commercial use — including the plugins that used to require a paid Club membership, among
          them SplitText, MorphSVG, DrawSVG and ScrollSmoother. They all ship inside the{' '}
          <code>gsap</code> package on npm. Nothing here needs a subscription.
        </p>
        <p>
          The standard license does carry one restriction. It prohibits implementing GSAP in tools
          that let users build visual animations without code in a way that competes with
          Webflow&rsquo;s own visual animation building. {site.name} hands you source code to edit
          rather than a no-code animation builder, which is a different kind of product — but if
          what you are building is closer to that description than to a codebase, read the license
          yourself rather than taking this paragraph&rsquo;s word for it.
        </p>
        <p>
          One rule follows from all this and is enforced in CI: GSAP source is never copied into
          this registry. The license grants use, not redistribution, and says nothing explicit about
          bundling GSAP inside another library. So components declare <code>gsap</code> as a
          dependency and the CLI installs it from npm under its own terms.
        </p>
      </div>

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[34rem] border-collapse text-left text-[0.875rem]">
          <thead>
            <tr className="border-b border-line">
              <th className="meta px-4 py-2.5 font-normal text-faint">Package</th>
              <th className="meta px-4 py-2.5 font-normal text-faint">Licence</th>
              <th className="meta px-4 py-2.5 font-normal text-faint">Role</th>
            </tr>
          </thead>
          <tbody>
            {DEPENDENCIES.map((dependency) => (
              <tr key={dependency.name} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 font-mono text-[0.8125rem] text-fg">
                  {dependency.name}
                </td>
                <td className="px-4 py-2.5 text-muted">{dependency.license}</td>
                <td className="px-4 py-2.5 text-muted">{dependency.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prose">
        <p>
          Most components have no dependency at all. Each component page lists exactly what it
          pulls in, and the cost badge tells you before you install.
        </p>

        <h2>No assets</h2>
        <p>
          Nothing in the registry is a binary. No fonts, no images, no video, no Lottie JSON —
          textures are generated procedurally and media is taken as a prop. That keeps every install
          text-only and means you can never inherit someone else&rsquo;s licensed artwork by
          accident. It is checked on every build.
        </p>

        <h2>Techniques versus expression</h2>
        <p>
          Motion techniques are shared craft. A scroll-scrubbed cylinder of images, a magnetic
          cursor target, a pinned horizontal track — these are methods, and methods get reused
          constantly across the web. Every Kinetic implementation here is written from scratch, and
          the licence above covers it. The BoardUI kit is the one exception, and it is credited
          above.
        </p>
        <p>
          What a licence never covers is content. The photographs, copy, typefaces and layout you
          put into one of these components are a separate question from the component itself, and
          shipping someone else&rsquo;s media through your build does not become fine because the
          code around it is {site.license}. Take the mechanism; bring your own content.
        </p>
      </div>
    </article>
  );
}
