import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'page-reveal-overlay',
  title: 'Key-Replayed Page Reveal',
  category: 'transition',
  tags: ['route', 'overlay', 'css-animation', 'react-key', 'no-js-animation'],
  blurb:
    'An opaque overlay that fades away on every route change, replayed by nothing more than a changed React key.',
  cost: 'css',
  motif: 'stack',

  files: [
    { path: 'registry/ui/page-reveal-overlay.tsx', type: 'registry:ui', role: 'component + usePageCover' },
    { path: 'registry/hooks/use-reduced-motion.ts', type: 'registry:hook', role: 'motion preference' },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'Two opaque layers and one CSS keyframe do the whole job of a route transition. The inbound layer carries `key={revealKey}`, so a route change unmounts it and mounts a new one — and a freshly mounted element runs its animation from frame zero, which replays the fade with no state, no library and nothing to reset. The outbound layer fades up to opaque and the navigation commits at 80% of that, while the screen is already covered, so the two halves hand off invisibly without ever referring to each other.',

  mechanism: [
    'The inbound layer is `<div key={revealKey} className="kinetic-reveal-in" />`. Its animation runs `from { opacity: 1 }` to `to { opacity: 0; visibility: hidden }` over 0.55 s on `cubic-bezier(0.4, 0, 0.2, 1)` with `forwards`. Changing `revealKey` is the entire replay mechanism: React sees a different key, discards the node, mounts a new one, and the new node starts its animation at frame zero.',
    '`visibility: hidden` in the `to` frame, held by `forwards`, is what retires the layer. At `opacity: 0` alone a full-viewport opaque surface stays composited for the rest of the page\'s life; `visibility` removes it from the compositor without unmounting anything.',
    '`usePageCover(coverDuration)` returns `{ covering, cover }`. `cover(commit)` sets `covering` true — which flips `data-covering` on the outbound layer and runs `opacity: 0 -> 1` over `coverDuration` on `cubic-bezier(0.4, 0, 1, 1)` — then, after `coverDuration * 0.8` seconds, calls `setCovering(false)` and `commit()` in the same tick.',
    'Both calls in one tick matters: React batches them into a single commit, so the cover drops to transparent on the exact frame the re-keyed inbound layer mounts at opacity 1. Split them across two ticks and there is one frame of bare destination content visible between the two halves.',
    'The transition property is declared on the `[data-covering="true"]` rule only, never on the base rule, so release is a hard cut rather than a fade. The inbound layer is opaque and stacked above the cover at that instant, so the cut is invisible — and a symmetric fade there would compound two opacities and hold the screen dark past the end of the reveal.',
    'The stylesheet is emitted through React 19\'s `<style href precedence>` hoisting, which dedupes by `href`. Per-instance values — durations, colour, z-index — ride in CSS custom properties set on the root, because there is only ever one copy of the rule block.',
  ],

  constants: [
    {
      name: 'revealDuration',
      value: '0.55',
      why: 'Seconds for the inbound fade. Under ~0.35 s the reveal reads as a flicker of the wrong colour rather than a curtain lifting; over ~0.8 s the destination is legible through a haze for long enough that people start clicking through it.',
    },
    {
      name: 'PAGE_COVER_DURATION',
      value: '0.32',
      why: 'Seconds for the outbound cover. Deliberately about half the reveal: leaving should feel decisive and arriving should feel gradual. Exported as a constant so the hook that times the commit and the layer that runs the transition cannot be handed two different numbers.',
    },
    {
      name: 'COMMIT_FRACTION',
      value: '0.8',
      why: 'Fraction of the cover the commit waits for. On `cubic-bezier(0.4, 0, 1, 1)` the layer is roughly 96% opaque at 80% of the way through, so the step to fully covered is imperceptible while a fifth of the perceived navigation latency disappears. At 1.0 every click pays a full 0.32 s of dead time; below ~0.6 the destination is visibly swapped behind a translucent sheet.',
    },
    {
      name: 'cover ease',
      value: 'cubic-bezier(0.4, 0, 1, 1)',
      why: 'Ease-in, no ease-out. The cover must be at its steepest as it approaches opaque, which is what makes 80% look like 100%. An ease-out cover crawls through its last 20% and the early commit becomes visible.',
    },
    {
      name: 'zIndex',
      value: '195',
      why: 'Above a custom cursor (150) and a scroll progress bar (120) — both of which must be hidden during a transition — and below a preloader (200), which must be able to sit over a reveal on first load.',
    },
  ],

  pitfalls: [
    'Animating the overlay with a tween and a timeline. There is nothing to tween: the whole reason this is bulletproof is that a remount restarts a CSS animation, so there is no in-flight animation to kill, no state to reset, and a double navigation cannot leave the overlay half-faded.',
    'Using `animation: none` for reduced motion. That leaves the inbound layer parked on its opaque `from` frame, permanently covering the site — the failure looks like a blank page. The layers get `display: none` and `usePageCover` commits synchronously instead.',
    'Committing the navigation after the cover finishes. A fifth of a second of nothing happening after a click is exactly where a visitor decides the link is broken and clicks again.',
    'Omitting `pointer-events: none`. A full-viewport opaque div swallows the click on whatever the visitor aims at next, and mid-transition that is usually another nav item.',
    'Letting `cover()` run while a cover is already up. Without the live-timer lock a fast double click schedules two commits and navigates twice, so the visitor lands one page past where they aimed.',
    'Leaving the finished inbound layer at `opacity: 0` without `visibility: hidden`. It is still a composited full-viewport surface, and on a page that also runs a WebGL hero it costs a measurable slice of fill rate for the rest of the session.',
    'Fading the cover back out symmetrically. Two opaque layers both mid-fade multiply, not add: the screen stays darker for longer and the reveal appears to stall before it starts.',
  ],

  notes: [
    'In Next.js App Router: mount once in `app/layout.tsx` with `revealKey={usePathname()}` and `position="fixed"`, then replace nav `<Link>` elements with buttons calling `cover(() => router.push(href))`. Nothing in this file imports `next/navigation` — the commit is a callback so the same component works under React Router or a plain state switch.',
    'The overlay colour must be opaque. A translucent colour makes both halves show the wrong page through the handoff, which is the one artefact this technique exists to prevent.',
    'The root carries `aria-hidden`: it is a purely decorative surface, and a screen reader announcing it on every navigation would be worse than no transition at all.',
    'Browser back and forward change the key without going through `cover()`, so they get the reveal but not the cover. That is correct — a history navigation has already happened by the time your code hears about it, so there is nothing left to cover.',
  ],

  apiSignature:
    'function PageRevealOverlay(props: { revealKey: string; revealDuration?: number; coverDuration?: number; covering?: boolean; color?: string; zIndex?: number; position?: "fixed" | "absolute"; className?: string }): JSX.Element\nfunction usePageCover(coverDuration?: number): { covering: boolean; cover: (commit: () => void) => void }',

  props: [
    { name: 'revealKey', type: 'string', description: 'Identity of the current page. A change replays the reveal. `usePathname()` in Next.js.' },
    { name: 'revealDuration', type: 'number', default: '0.55', description: 'Seconds the inbound cover takes to fade away.' },
    { name: 'coverDuration', type: 'number', default: '0.32', description: 'Seconds the outbound cover takes to reach opaque. Pass the same value to `usePageCover`.' },
    { name: 'covering', type: 'boolean', default: 'false', description: 'Drive from `usePageCover().covering`.' },
    { name: 'color', type: 'string', default: "'#000'", description: 'Any CSS colour. Must be opaque, or the page shows through the handoff.' },
    { name: 'zIndex', type: 'number', default: '195', description: 'Above the site and any custom cursor, below a preloader.' },
    { name: 'position', type: '"fixed" | "absolute"', default: '"fixed"', description: '`absolute` inside a bounded container; `fixed` for a real page transition.' },
    { name: 'className', type: 'string', description: 'Merged onto the root via `cn`.' },
  ],

  reducedMotion:
    'Both layers get `display: none`, and `usePageCover` calls the commit synchronously rather than starting a timer. Navigation is a hard cut straight to the destination — no cover, no reveal, and crucially not a zero-duration overlay, which would still be one frame of opaque colour.',

  cleanup:
    'The only resource is the commit timer, cleared in an unmount effect and nulled so the lock cannot survive a remount. There are no listeners, no rAF and no tweens; the animations are CSS and die with the nodes React removes.',

  acceptance:
    'Click a nav item: the panel fades to the overlay colour, the destination content swaps while it is covered, and the overlay fades away over roughly half a second. The heading is never visible in an intermediate state, and there is no frame where old and new content are both on screen. Click two nav items in quick succession and you land on the second one, not past it. With reduced motion the content swaps instantly with no coloured frame in either direction.',

  criticalRegion: 'critical',
};

export default meta;
