import type { Metadata } from 'next';
import Link from 'next/link';

import { CodeBlock } from '@/components/code/code-block';
import { site, SITE_URL } from '@/lib/site';

/* Every command on this page is built from `site.config.ts`. The registry
   namespace and the origin are the two things a fork has to change, and both
   appear here half a dozen times — interpolating them is the difference
   between rebranding one file and hunting strings across the docs. */
const NAMESPACE = `@${site.registryName}`;

export const metadata: Metadata = {
  title: 'Installation',
  description: `Add a ${site.name} component to a React project with the shadcn CLI, or copy it by hand.`,
};

export default function InstallationPage() {
  return (
    <article className="space-y-6">
      <div className="prose">
        <p className="meta text-faint">Docs</p>
        <h1 className="!mt-3 text-display-2 text-fg">Installation</h1>
        <p>
          {site.name} is a shadcn-compatible registry. Nothing is installed as a package — the CLI
          writes the actual files into your repository, and from that moment the code is yours to
          edit.
        </p>

        <h2>Requirements</h2>
        <ul>
          <li>React 19.2 or newer — the preview host uses the stable <code>&lt;Activity&gt;</code> API, and several components rely on it to suspend off-screen work.</li>
          <li>Tailwind CSS v4, configured through <code>@theme</code> in CSS rather than a JS config.</li>
          <li>A <code>components.json</code> at the project root. If you do not have one, run the init command below first.</li>
        </ul>
      </div>

      <CodeBlock code="npx shadcn@latest init" />

      <div className="prose">
        <h2>Add one component</h2>
        <p>
          Every component page carries its own command. It is always a full URL, and that is
          deliberate: a bare name like <code>magnetic-button</code> resolves against shadcn&rsquo;s
          own registry, not this one, so a short command would either fail or install something
          else entirely.
        </p>
      </div>

      <CodeBlock code={`npx shadcn@latest add ${SITE_URL}/r/magnetic-button.json`} />

      <div className="prose">
        <p>
          The CLI writes the component, every hook, shader and helper it imports, and installs the
          npm dependencies it declares. Shared files are written once — install four WebGL
          components and you get one copy of the WebGL helper, not four.
        </p>

        <h2>Add the registry as a namespace</h2>
        <p>
          If you plan to install more than one component, register the origin once and then use
          short names.
        </p>
      </div>

      <CodeBlock code={`npx shadcn@latest registry add ${NAMESPACE}=${SITE_URL}/r/{name}.json`} />

      <div className="prose">
        <p>
          That writes a <code>registries</code> entry into <code>components.json</code>. You can
          also add it by hand:
        </p>
      </div>

      <CodeBlock
        lang="json"
        code={`{
  "registries": {
    "${NAMESPACE}": "${SITE_URL}/r/{name}.json"
  }
}`}
      />

      <div className="prose">
        <p>After that, installs are short:</p>
      </div>

      <CodeBlock code={`npx shadcn@latest add ${NAMESPACE}/magnetic-button`} />

      <div className="prose">
        <h2>Copy it by hand</h2>
        <p>
          The Code panel on every component page shows every file the component needs, including
          the hooks and shaders, each labelled with the path it installs to. Copying all of them
          into those paths is exactly equivalent to running the command — there is no hidden
          runtime and no package to add.
        </p>
        <p>
          The one thing to check: these files import each other as{' '}
          <code>@/components/motion/...</code>. The CLI does not rewrite import paths, so if your
          alias differs, adjust the imports after copying.
        </p>

        <h2>Peer dependencies</h2>
        <p>
          Most components are dependency-free. Where one needs a library it is declared in the
          registry item and installed for you. Two are worth knowing about before you install:
        </p>
        <ul>
          <li>
            <strong>GSAP</strong> is used by some components and is not redistributed here — you
            install it from npm under its own licence. Nothing in this registry uses a paid Club
            plugin. See <Link href="/docs/licensing">Licensing</Link>.
          </li>
          <li>
            <strong>three</strong> is a large dependency. If you only need one shader effect,
            check whether a <code>css</code> or <code>canvas2d</code> component in the same
            category does the job — the cost badge on each card tells you which.
          </li>
        </ul>

        <h2>Reduced motion</h2>
        <p>
          Every component reads <code>prefers-reduced-motion</code> and renders a still, correct
          state rather than a zero-duration animation. You do not need to wire anything up; the
          behaviour for each one is written on its page.
        </p>
      </div>
    </article>
  );
}
