import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'idle-gated-page-states',
  title: 'Idle-Gated Page States',
  category: 'transition',
  tags: [
    'route',
    'gsap',
    'requestIdleCallback',
    'state-machine',
    'preloader',
    'scheduling',
  ],
  blurb:
    'A page entrance that will not start until a floor delay has elapsed and the main thread has reported itself idle.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/idle-gated-page-states.tsx',
      type: 'registry:ui',
      role: 'component + useIdlePageStates + whenIdleAfter',
    },
    { path: 'registry/hooks/use-gsap.ts', type: 'registry:hook', role: 'gsap.context + revert' },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'motion preference',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A page entrance is the one animation guaranteed to run at the worst possible moment: hydration, font swap, image decode and the first layout pass all land in the same few hundred milliseconds. Start a stagger there and it does not look slow, it looks broken — three elements arrive, the thread blocks, the rest snap in. This gates the entrance on two conditions at once, a floor delay resolved on a frame boundary and at least one report of an idle main thread, and starts only when the slower of the two finishes. Enter and leave are one paused timeline played forward and reversed.',

  mechanism: [
    'The machine is `preload -> gating -> entering -> settled`, with `leave(commit)` sending it to `leaving` and the exit\'s completion sending it back to `gating` for the next page. The current phase is written to `data-page-state` on the root so CSS can read it without a second source of truth.',
    '`whenIdleAfter(delay, timeout, done)` is the gate. It schedules two independent waits and calls `done` only when both flags are set: a `setTimeout(delay)` whose callback schedules a `requestAnimationFrame`, and either `requestIdleCallback(cb, { timeout })` or — where that is missing — `setTimeout(cb, timeout)`. It returns a canceller that clears the timer, cancels the frame, and releases whichever of the two idle mechanisms was actually used.',
    'The floor delay resolves inside the rAF rather than in the timer itself. A timer callback can fire in the middle of a long task; the frame callback after it cannot, so the first tween is handed a fresh frame budget instead of the tail end of somebody else\'s work.',
    '`requestIdleCallback`\'s `timeout` option is the safety net — the callback is guaranteed to run within that many milliseconds whether the thread ever goes idle or not — and the `setTimeout` fallback uses the same number as its delay, so both code paths have identical worst-case behaviour.',
    'The first entrance uses `preloadDelay` (0.8 s) and every subsequent one uses `routeDelay` (0.15 s), switched by a `firstEnter` ref. Only the first competes with hydration; keeping 0.8 s for route changes would put nearly a second of nothing between every click and its page.',
    'The choreography is ONE paused GSAP timeline: `fromTo([data-page-enter], { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.08 })`. `state === "entering"` calls `play()`; `state === "leaving"` calls `timeScale(enterDuration / leaveDuration).reverse()`. The timeline\'s `onComplete` and `onReverseComplete` report back into the machine, so no phase is advanced by a timer that could disagree with what is on screen.',
    'The pre-JS hidden state is a stylesheet rule keyed on `[data-page-state="preload"]` and `[data-page-state="gating"]`, not a `gsap.set` in an effect. Effects run after the first paint, so a JS-only hidden state paints the page fully composed and then hides it. The build then applies `gsap.set(targets, from)` immediately, in the same React commit that swapped the page in, which covers every frame after that.',
  ],

  constants: [
    {
      name: 'PRELOAD_DELAY',
      value: '0.8',
      why: 'Seconds of floor delay before the FIRST entrance — the one competing with hydration, font loading and the initial layout pass. Below ~0.5 s the stagger still lands inside the hydration burst on a mid-range phone; above ~1 s a fast device shows a finished, blank-looking page and waits.',
    },
    {
      name: 'ROUTE_DELAY',
      value: '0.15',
      why: 'Seconds of floor delay for every entrance after the first. Hydration has already happened; the only competing work is the destination subtree\'s own mount. Long enough that the mount lands inside it, short enough that the click still feels answered.',
    },
    {
      name: 'IDLE_TIMEOUT',
      value: '1200',
      why: 'Milliseconds after which the idle wait gives up, passed both as `requestIdleCallback`\'s `timeout` and as the fallback timer\'s delay. A saturated thread — a WebGL hero, a heavy hydration, a third-party long task — may never report idle, and an entrance that never starts is a blank page. Longer than a typical hydration burst, comfortably shorter than the ~2 s at which a visitor decides the site is broken.',
    },
    {
      name: 'ENTER_DURATION',
      value: '0.5',
      why: 'Seconds for the entrance, matching the source\'s `enterDuration`. With a 0.08 s stagger over four elements the last one finishes at 0.74 s, which is the upper limit for a page that should feel like it is already there.',
    },
    {
      name: 'LEAVE_DURATION',
      value: '0.5',
      why: 'Seconds for the exit, matching the source\'s `leaveDuration`. Applied as `timeScale(enterDuration / leaveDuration)` on the reversed timeline rather than as a second set of tweens, so the exit cannot drift from the entrance. Drop it to 0.25 for an exit that feels decisive against a gradual arrival.',
    },
    {
      name: 'ENTER_STAGGER',
      value: '0.08',
      why: 'Seconds between elements. Below ~0.05 s the group reads as one block and the stagger is wasted; above ~0.12 s the last element arrives after the eye has already moved on and the page feels like it is still loading.',
    },
    {
      name: 'ENTER_DISTANCE',
      value: '24',
      why: 'Pixels each element rises through. Small enough that no element crosses another\'s resting position — which would read as the layout reflowing rather than arriving — and large enough to be legible at the 0.5 s duration.',
    },
  ],

  pitfalls: [
    'Starting the entrance on mount. Mount is the single busiest moment in the page\'s life. The stagger runs against hydration and the first layout pass, so the first two or three elements animate and the rest jump — and it only reproduces on the devices you do not test on.',
    'Waiting for idle ALONE. On a fast machine `requestIdleCallback` fires almost immediately, before the hydration burst has even begun, so the gate opens straight into the work it was supposed to avoid. The floor delay is what makes the idle check meaningful.',
    'Waiting for a delay ALONE. On a slow machine the timer expires while the thread is still saturated and you are back to a stuttering stagger. Neither condition works without the other.',
    'Calling `requestIdleCallback` without the `timeout` option. On a page with a long-running rAF loop the callback may never fire, and the entrance never starts — a permanently blank page, on exactly the devices that can least afford it.',
    'Cancelling the wrong handle. `requestIdleCallback` returns a handle for `cancelIdleCallback`, and a `setTimeout` returns one for `clearTimeout`; passing either to the other is a silent no-op. Exactly one is ever scheduled and the canceller releases the one that was, or the gate outlives the page and fires an entrance into a tree that no longer exists.',
    'Assuming `requestIdleCallback` exists. Safari only shipped it in 17.4, so `window.requestIdleCallback(...)` throws on a browser that is still in real use — and it throws inside an effect, which takes the whole page down rather than degrading.',
    'Putting the phase in the `useGsap` dependency list. Every dependency change reverts the context, and `revert()` strips the inline values GSAP wrote — so the reverse tween reads the stylesheet default as its start value and the exit animates from nowhere to nowhere. The timeline is built once per page and driven from a second effect.',
    'Hiding `[data-page-enter]` from JavaScript only. An effect runs after the first paint, so the destination is painted fully composed and then hides itself — a flash of the finished page immediately before it animates in. The hidden state belongs in a stylesheet rule keyed on the phase.',
    'Returning to `preload` after a route change. The preloader is a first-load state; showing it again on every click is the classic version of this mistake. The machine goes back to `gating`, which re-runs the gate without re-running the preloader.',
    'Gating with reduced motion on. There is no animation left to protect, so all the gate does is hold a blank page in front of someone who asked for less motion, not more waiting. That path skips straight to `settled`.',
  ],

  notes: [
    'In Next.js App Router: mount once in `app/layout.tsx` with `pageKey={usePathname()}`, call `ready()` from `document.fonts.ready`, and replace nav `<Link>` elements with buttons calling `leave(() => router.push(href))`. Nothing here imports `next/navigation` — the commit is a callback, so the same machine works under React Router or a plain `useState` page switch.',
    '`onGateOpen` fires on the frame the gate opens, before the entrance starts. That is where `ScrollTrigger.refresh()` belongs: measure while nothing is moving, or every trigger is offset by the distance the entrance travels. The source did the same thing, refreshing after its preload completed and before its enter.',
    'Neither `requestIdleCallback` nor `requestAnimationFrame` runs in a backgrounded tab, so the gate does not open until the tab is foregrounded. That is the correct behaviour — an entrance nobody can see is wasted work — but it is also why a headless screenshot taken against a background tab captures the pre-entrance state. Foreground the tab, or drive the timeline to `progress(1)` for capture.',
    'The preloader should stay up for the whole of `gating`, not just `preload`. The wait is dead time only if you show the visitor an empty page during it; behind a preloader it is indistinguishable from loading.',
    'The `@media (scripting: none)` rule reveals the content for visitors with JavaScript disabled. It is Media Queries 5 and is simply dropped where unsupported, so treat it as a bonus rather than as the fix.',
  ],

  apiSignature:
    'function IdleGatedPageStates(props: { controller: IdlePageStates; pageKey: string; children: ReactNode; enterDuration?: number; leaveDuration?: number; stagger?: number; distance?: number; className?: string }): JSX.Element\nfunction useIdlePageStates(options?: { preloadDelay?: number; routeDelay?: number; idleTimeout?: number; onGateOpen?: () => void }): { state: PageState; ready: () => void; leave: (commit: () => void) => void; entered: () => void; left: () => void }\nfunction whenIdleAfter(delaySeconds: number, timeout: number, done: () => void): () => void\ntype PageState = "preload" | "gating" | "entering" | "settled" | "leaving"',

  props: [
    {
      name: 'controller',
      type: 'IdlePageStates',
      description: 'From `useIdlePageStates()`. Supplies the phase and receives the timeline\'s completions.',
    },
    {
      name: 'pageKey',
      type: 'string',
      description: 'Identity of the current page. A change rebuilds the timeline against the new `[data-page-enter]` elements. `usePathname()` in Next.js.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      description: 'The page. Descendants marked `data-page-enter` are staggered in and, reversed, out.',
    },
    {
      name: 'enterDuration',
      type: 'number',
      default: '0.5',
      description: 'Seconds for the entrance.',
    },
    {
      name: 'leaveDuration',
      type: 'number',
      default: '0.5',
      description: 'Seconds for the exit, applied as a `timeScale` on the reversed timeline.',
    },
    {
      name: 'stagger',
      type: 'number',
      default: '0.08',
      description: 'Seconds between staggered elements. Reversed on exit, so the last one leaves first.',
    },
    {
      name: 'distance',
      type: 'number',
      default: '24',
      description: 'Pixels each element rises through.',
    },
    { name: 'className', type: 'string', description: 'Merged onto the root via `cn`.' },
  ],

  reducedMotion:
    'The gate is skipped entirely — holding a blank page would be more waiting, not less motion — so `gating` advances straight to `settled` with no idle callback and no timer scheduled, and therefore nothing to cancel. The timeline is never played: the phase effect parks it with `tl.progress(1).pause()`, so opacity, offset and stagger all land on their end frame together because they are all on the one timeline. `leave()` calls the commit synchronously, and a stylesheet rule inside `@media (prefers-reduced-motion: reduce)` keeps `[data-page-enter]` visible for the frames before hydration.',

  cleanup:
    'The gate\'s canceller is the effect\'s cleanup: it clears the floor-delay timer, cancels the pending `requestAnimationFrame`, and releases whichever idle mechanism was scheduled — `cancelIdleCallback` for the handle, `clearTimeout` for the fallback — with a `cancelled` flag so a callback already in the queue cannot fire after teardown. `useGsap` reverts the `gsap.context`, killing the timeline and stripping every inline style it wrote. The pending commit is nulled on unmount so a leave in flight cannot navigate a tree that has gone.',

  acceptance:
    'Load the preview: the preloader holds, then the content staggers up and in as one group with no element jumping ahead of the tween. Throttle the CPU to 6x in DevTools and reload — the entrance still runs as a smooth stagger rather than arriving in two jerks, because it starts later rather than starting on time and stuttering. Click a nav item: the current content staggers out last-element-first, the page swaps, and the next one arrives after a much shorter gate than the first load used. Click two nav items in quick succession and you land on the first one you clicked. With reduced motion the content is present immediately with no gate, no stagger, and no preloader held past the font load.',

  criticalRegion: 'critical',
};

export default meta;
