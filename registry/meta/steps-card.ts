/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Steps Card" (boardui.com/components/steps-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'steps-card',
  title: 'Steps Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'bar-chart', 'count-up', 'fitness', 'health', 'boardui'],
  blurb:
    'Seven daily step bars with a week switcher, a total that counts up, and an outline on the hovered bar that rolls the headline to that day.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/steps-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A grey dashboard card headed "Steps" with the week total ("31,600 total steps") and a week pill with arrows. Below are seven rounded grey tracks, Monday to Sunday, each filled from the bottom with a teal bar for that day\'s steps. The bars grow in on mount and glide to new heights when the week changes, while the total counts to the new figure. Hovering or focusing a bar outlines it, deepens its teal and rolls the headline to that day\'s steps ("6,340 steps on Thu").',

  mechanism: [
    'All weeks share one scale: `max`, or by default the busiest day across every week rounded up to the next 1,000 (8,000 for the sample data). A fill\'s height is `steps / scale` as a percentage of its track, so switching weeks compares like with like instead of re-stretching each week to its own peak.',
    'Each fill is an absolutely positioned span at the bottom of its track with an inline `height` percentage and a 600ms expo-out `height` transition, delayed 40ms per bar from Monday so the row grows left to right. On mount every height is 0; two animation frames later the real heights apply, so the transition draws them in. A week change only changes the heights, so the same transition moves them.',
    'The headline number is `useCountUp(target, 600)` from the shared hooks. The target is 0 until the bars are drawn, then the hovered day\'s steps or else the week total; the hook eases from whatever is on screen to the new target, so hovering across bars or changing week mid-roll never jumps. The unit ("total steps" or "steps on Thu") is a keyed span, so `.animate-number-fade` replays when it changes.',
    'Bars are buttons in a group with a roving tabindex: Arrow Left and Right move focus, Home and End jump to Monday and Sunday. Pointer enter and focus set the active bar and pointer leave of the row or blur clears it. The active track gets a 2px teal outline, offset 2px and faded in over 150ms, and its fill switches to `chart-1-active`; keyboard focus uses the focus-ring colour instead.',
    'The card is a container (`@container`). Under 420px the unit drops below the number so the header never collides with the week pill, and from 480px the bar gap opens from 8px to 30px.',
  ],

  constants: [
    {
      name: 'chartHeight',
      value: '200px',
      why: 'Tall enough that a 1,000-step difference is 25px, which the eye reads at a glance.',
    },
    {
      name: 'GROW_MS / STAGGER',
      value: '600ms / 40ms',
      why: 'The whole row settles in under a second, and a short stagger reads as a sweep without making Sunday wait.',
    },
    {
      name: 'scale rounding',
      value: 'up to the next 1,000',
      why: 'The busiest day nearly fills its track but never touches the top, so no bar looks clipped.',
    },
    {
      name: 'count-up',
      value: '600ms ease-out cubic',
      why: 'Same length as the bar growth, so the number and the bars land together.',
    },
  ],

  pitfalls: [
    'Scaling each week to its own peak. Every week then looks equally busy; a shared scale is what makes the switcher useful.',
    'Animating the bars with `scaleY`. It squashes the rounded corners while it grows; transitioning `height` keeps the 10px radius intact, and seven elements are cheap to lay out.',
    'Rolling the number with a fresh tween that starts from the old target. If the pointer crosses bars mid-roll the number jumps; easing from the value on screen keeps it continuous.',
  ],

  notes: [
    'Exports `STEPS_WEEKS` (six sample weeks, oldest first) and the `StepsWeek` type `{ id, label, days }`, where `days` holds seven counts starting on Monday.',
  ],

  apiSignature:
    'function StepsCard(props?: StepsCardProps): JSX.Element\ntype StepsWeek = { id: string; label: string; days: number[] }',

  props: [
    { name: 'title', type: 'string', default: '"Steps"', description: 'Header label.' },
    { name: 'totalLabel', type: 'string', default: '"total steps"', description: 'Unit after the week total.' },
    { name: 'weeks', type: 'StepsWeek[]', default: 'STEPS_WEEKS', description: 'Weeks the pill steps through, oldest first.' },
    { name: 'weekIndex', type: 'number', description: 'Controlled index into `weeks`.' },
    { name: 'defaultWeekIndex', type: 'number', default: 'weeks.length - 1', description: 'Uncontrolled starting week.' },
    { name: 'onWeekIndexChange', type: '(index: number) => void', description: 'Called when an arrow changes week.' },
    { name: 'max', type: 'number', default: 'busiest day rounded up to 1,000', description: 'Top of the shared bar scale.' },
    { name: 'chartHeight', type: 'number', default: '200', description: 'Height of the bar tracks in px.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion: reduce`, the bars render at their final heights from the first frame and `motion-reduce:transition-none` makes week changes and hover outlines instant. The headline shows the target value directly instead of counting, and the unit no longer fades.',

  cleanup:
    'The mount effect cancels both pending animation frames on unmount, and `useCountUp` cancels its frame whenever the target changes or the card unmounts. Pointer, focus and key handling are React event props.',

  acceptance:
    'The default card reads "Steps", "31,600 total steps" (counting up from 0 on load) and "29 Jun - 5 Jul", with the next arrow disabled. Seven teal bars grow left to right in grey tracks: Friday is the tallest at about nine tenths of its track and Wednesday the shortest. Hovering Thursday outlines its track in teal and the headline rolls to "6,340 steps on Thu"; leaving the row rolls it back to 31,600. Clicking the previous arrow shows "22 Jun - 28 Jun", the bars move to their new heights and the total counts to 32,010.',

  criticalRegion: 'critical',
};

export default meta;
