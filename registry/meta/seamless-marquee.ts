import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'seamless-marquee',
  title: 'Pixels-Per-Second Marquee',
  category: 'text',
  tags: ['gsap', 'marquee', 'loop', 'resize-observer', 'ticker'],
  blurb:
    'A marquee whose duration is derived from measured width and a px/second speed, so every strip moves at the same rate.',
  cost: 'dom',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/seamless-marquee.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'A looping strip of content whose speed is expressed in pixels per second and whose duration is derived from it, never the other way round. A fixed `duration` means a 900px strip crawls while a 4000px strip sprints, so two marquees on the same page visibly disagree about how fast scrolling is — and adding one word to either changes its speed. The loop distance is exactly one content set plus its gap, so the wrap frame is pixel-identical to the frame before it and the seam is invisible.',

  mechanism: [
    'A `ResizeObserver` on the first content copy gives `copyWidth`; the repeating unit is `setWidth = copyWidth + gap`, because the gap that follows a copy is part of the unit — omit it and the rhythm at the seam is one gap tighter than everywhere else, which reads as a stutter once per cycle.',
    'Duration is `setWidth / speed` — seconds = px / (px per second). Every marquee on the site then moves at the same rate regardless of how much content is in it.',
    'The number of copies is `Math.max(2, Math.ceil(rootWidth / setWidth) + 1)`, from a second `ResizeObserver` on the container. The `+1` covers the gap that the translation itself opens up; with the exact ceiling a blank wedge appears at the right edge on the last frame of every cycle.',
    'The tween is `gsap.fromTo(track, { x: 0 }, { x: -setWidth, duration, ease: "none", repeat: -1 })`. `ease: "none"` is mandatory — any easing makes the strip accelerate and decelerate once per cycle, which turns the seam into a visible pulse.',
    'Pausing lives in a *separate* effect that calls `tween.paused(!(visible && inView))`, driven by `useVisibility` (tab hidden) and `useInView` (scrolled away). Rebuilding the tween on a visibility flip would snap the strip back to x = 0.',
    'Hover ramps the timeScale rather than toggling paused: `gsap.to(tween, { timeScale: 0 | 1, duration: 0.35, overwrite: true })`. The tween object is itself a valid GSAP target, so the strip glides to a stop instead of stopping dead.',
  ],

  constants: [
    {
      name: 'SPEED',
      value: '60',
      why: 'Pixels per second. Around 60px/s a 12px word takes a fifth of a second to cross its own width — readable while moving. Past ~120px/s the copy is decorative texture; below ~30px/s viewers assume it is stuck.',
    },
    {
      name: 'GAP',
      value: '48',
      why: 'Pixels between items and between the last item and the next copy. It must be identical in both places or the seam is visibly a different rhythm from the interior. Below ~24px adjacent items read as one phrase.',
    },
    {
      name: 'HOVER_RAMP',
      value: '0.35',
      why: 'Seconds to ramp `timeScale` between 1 and 0. Zero (a hard pause) reads as a broken animation; past ~0.6s the strip keeps drifting long enough that a user trying to read an item has to chase it.',
    },
    {
      name: 'copies',
      value: 'max(2, ceil(rootWidth / setWidth) + 1)',
      why: 'The floor of 2 covers content wider than the container, where the ceiling alone yields 1 and there is nothing to wrap into. The `+1` covers the width the translation itself vacates.',
    },
  ],

  pitfalls: [
    'Specifying `duration` instead of a px/second speed. Two marquees on one page then move at different rates, and editing the copy silently changes the speed of the one you edited.',
    'Translating by the copy width and forgetting the gap. The seam arrives one gap early every cycle — a small, regular hitch that is very hard to diagnose from the code.',
    'Hardcoding the clone count at 2. On a wide viewport with short content the strip runs out and a blank band sweeps through once per cycle.',
    'Any ease other than `none`. The strip speeds up and slows down once per loop, so the seam that is geometrically invisible becomes obvious from the velocity change alone.',
    'Rebuilding the tween when visibility or hover changes. The `fromTo` restarts at x = 0 and the strip teleports backwards.',
    'Killing only `killTweensOf(trackElement)` on unmount. The hover ramps target the *tween object*, not the element, so they survive and keep writing `timeScale` to a dead tween — `gsap.killTweensOf(t)` before `t.kill()` is what catches them.',
    'Leaving the cloned copies exposed to assistive technology. A screen reader reads the same six items three times; every clone past the first is `aria-hidden`.',
  ],

  notes: [
    'Reduced motion renders exactly one copy with no tween and no transform, so the content sits statically at the left edge and remains fully readable.',
    'No text splitting is involved — the marquee moves whole content sets, so no split library dependency is imposed on consumers.',
  ],

  apiSignature:
    "function SeamlessMarquee(props: { children: ReactNode; speed?: number; direction?: 'left' | 'right'; gap?: number; pauseOnHover?: boolean; className?: string }): JSX.Element",

  props: [
    { name: 'children', type: 'ReactNode', description: 'One content set. Cloned as many times as the container width requires.' },
    { name: 'speed', type: 'number', default: '60', description: 'Pixels per second. Identical for every marquee whatever its width.' },
    { name: 'direction', type: "'left' | 'right'", default: "'left'", description: 'Travel direction.' },
    { name: 'gap', type: 'number', default: '48', description: 'Pixels between items and between copies.' },
    { name: 'pauseOnHover', type: 'boolean', default: 'true', description: 'Ramp `timeScale` to 0 on pointer enter and back to 1 on leave.' },
    { name: 'className', type: 'string', description: 'Merged onto the clipping container via `cn`.' },
  ],

  reducedMotion:
    'Renders a single, un-cloned content set with no tween created at all. The content is fully visible and static — the strip is not left mid-translation and nothing is clipped out of view.',

  cleanup:
    'The build effect clears the tween ref, calls `gsap.killTweensOf(tween)` to catch in-flight hover `timeScale` ramps that target the tween object, then `tween.kill()`, then `gsap.set(track, { clearProps: "transform" })`. Both `ResizeObserver` instances are disconnected by their hooks.',

  acceptance:
    'Watch the seam for a full cycle: no jump, no blank wedge, no change in spacing as one copy hands over to the next. Put two marquees with very different content lengths side by side and both move at visibly the same speed. Hover and the strip glides to a stop over about a third of a second rather than halting. Switch browser tabs and back, and the strip resumes from where it was rather than restarting. With reduced motion the content is static and readable.',

  criticalRegion: 'critical',
};

export default meta;
