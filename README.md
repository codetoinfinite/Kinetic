# Kinetic

A shadcn-compatible registry of 119 motion components for React. Every component
ships a live preview, its complete source, and a written prompt aimed at coding
agents. Nothing installs as a package — the shadcn CLI writes the real files into
the consumer's repository.

Next 16 (App Router, Turbopack) · React 19.2 · Tailwind CSS v4 · TypeScript strict.

---

## Make it yours

Everything the site prints about itself lives in one file: **`site.config.ts`**.
Nothing below is duplicated elsewhere in the codebase.

```ts
export const site: SiteConfig = {
  name: 'Kinetic',                    // <title>, wordmark, OG card, llms.txt
  registryName: 'kinetic',            // the @scope in install commands
  tagline: 'motion components for React',
  description: '…',                   // meta + OG description, 150-160 chars
  url: 'https://kinetic.example.com', // ← your domain. See SITE_URL below.
  author: { name: '', email: '', url: '' },  // '' hides that line entirely
  social: { x: '', github: '' },             // '' hides that link entirely
  license: 'MIT',
  themeStorageKey: 'kinetic-theme',
};
```

Two files carry a name the config cannot reach, because they are read outside the
app:

| File | What to change |
| --- | --- |
| `LICENSE` | `<YOUR NAME>` in the copyright line |
| `package.json` | `name`, `author`, `homepage`, `repository` |

Optional, and only if you want a different mark: `app/icon.svg` and the `MARK`
constant inside `app/apple-icon.tsx` and `app/opengraph-image.tsx`.

## `SITE_URL` — the one value that must be set at build time

Install commands cannot be relative. `npx shadcn@latest add magnetic-button`
resolves against shadcn's own registry, not yours, so every command this project
emits is a **full URL** — and those URLs are baked into `public/r/*.json`,
`public/llms.txt`, the sitemap, and the canonical tags **when the build runs**.

```bash
SITE_URL=https://your-domain.com pnpm build
```

Set `SITE_URL` in your host's environment variables (Vercel → Settings →
Environment Variables, scope: Production) **before** the first production build.
If you skip it, the deployed site hands visitors install commands pointing at
`site.config.ts`'s fallback origin. Fixing it later means changing the variable
and redeploying, not just editing a page.

## Commands

```bash
pnpm dev              # http://localhost:8927
pnpm build            # registry:build, then next build
pnpm start            # serve the production build
pnpm verify           # everything below, in order — the release gate
```

`verify` = `tsc --noEmit` → `registry:build` → `next build` → `check:licenses` →
`check:prompts` → `check:classes` → `smoke`.

Port: both `dev` and `start` honour `$PORT` and default to 8927. The Playwright
config expects 8927.

> **`next start` serves the prebuilt `.next`.** Running `next build` while a
> server is holding the port rewrites `.next` underneath it, the chunk hashes stop
> matching, and every smoke test fails for a reason that has nothing to do with
> the tests. Kill the server first: `lsof -ti:8927 | xargs kill -9`.

## Layout

```
site.config.ts       identity — the file you edit
registry/meta/*.ts   119 hand-written component descriptions · the only source of truth
registry/ui/*.tsx    the components themselves
registry/demos/      what the previews render
scripts/build-registry.ts   generates everything below from registry/meta
__generated__/       index.ts + manifest.ts          ← generated, do not edit
registry.json        shadcn registry manifest        ← generated, do not edit
public/r/*.json      one installable item per component ← generated, do not edit
public/prompts/*.md  the agent prompts               ← generated, do not edit
public/llms*.txt     machine-readable catalogue      ← generated, do not edit
app/                 Next App Router
```

Editing anything marked *generated* is wasted work — the next `pnpm build`
overwrites it. Change `registry/meta/<slug>.ts` instead.

## The gates

| Script | What it refuses to let through |
| --- | --- |
| `check:licenses` | GSAP source copied into the registry; any binary asset |
| `check:prompts` | a prompt whose code excerpt has drifted from the real file |
| `check:classes` | a Tailwind class in the source that emits no CSS |
| `smoke` | Playwright, against the production build |

## Deploying

1. Push to GitHub.
2. Import the repository on Vercel. Framework preset: Next.js — no overrides.
3. Add `SITE_URL=https://your-domain.com` under Environment Variables, Production.
4. Deploy, then attach the domain.
5. Redeploy once after attaching the domain if you set `SITE_URL` afterwards.

Any Node host works too: `pnpm build && PORT=3000 pnpm start`.

## Content and licences

The code is MIT. The media you render through these components is not covered by
it — photographs, video, typefaces and copy carry their own terms. GSAP is a peer
dependency installed from npm under
[GreenSock's Standard License](https://gsap.com/community/standard-license/); its
source is never redistributed here, and `check:licenses` enforces that.
