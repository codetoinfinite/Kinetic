/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Generating Loader" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'image-generating-loader',
  title: 'Image Generating Loader',
  category: 'display',
  kit: 'boardui',
  tags: ['loader', 'progress', 'ai', 'image-generation', 'halftone', 'chat', 'boardui'],
  blurb:
    'A chat tile for an image still being generated: a rippling halftone ring, a % and stage pill, a seconds countdown and a halftone reveal.',
  cost: 'dom',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/image-generating-loader.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The placeholder an image model leaves in a chat thread while it paints. A 17 by 17 field of dots forms a ring that ripples outward from the centre, a frosted pill in the middle shows the percentage and the current stage, and the footer pairs a shimmering "Generating image" label with a seconds countdown. Past 40% the finished picture develops through a halftone mask whose dots swell until they merge, so the image grows in rather than fading. It runs on its own timer or takes a controlled `progress`.',

  mechanism: [
    'The dot field is computed once at module load from fixed constants. Each grid cell gets a normalised distance from the centre, a Gaussian ring weight `exp(-((d - 0.7) / 0.22)²)` and, outside the ring, a floor of 0.18. Cells under 0.08 or beyond d 1.04 are skipped, so the middle stays empty. The result is rendered by a memoised `DotField` SVG with `fill="currentColor"`, so it follows `text-text-primary` in both themes.',
    'One `@keyframes kx-igl-ripple` rule is injected through a React 19 `<style href precedence>`, which hoists it to `<head>` once per document. Each circle carries its own `--kx-igl-a` (its ring alpha) and an animation delay of `d * 1.1s - 1.8s`. The keyframes read the variable per element, so every dot pulses from 20% to 100% of its own alpha and the negative, outward-growing delay turns the field into an expanding wave.',
    'Without a `progress` prop, a requestAnimationFrame loop adds each frame\'s delta to an `elapsed` ref, capped at `duration`, and stores progress rounded to 0.1%. Pausing cancels the loop and leaves the ref alone, so resuming continues where it stopped. `animation-play-state: paused` freezes the ripple at the same time.',
    'The result layer sits over the dots with a two-layer CSS mask. The first layer is a 6px repeating radial dot whose radius grows from 0 to 4.5px as `t` goes from 0 at 40% to 1 at 100%. The second is a centred disc that ends at `t² * 100%` with a 22% feather. Their union lets the image show first as a fine halftone and then as a solid disc spreading from the centre. At 100% the mask is removed and the dot field fades out over 500ms.',
    'The stage name is `stages[floor(progress / 100 * stages.length)]`, so four stages each cover a quarter of the run. The countdown is `ceil((100 - progress) / 100 * duration / 1000)` in its own chip, keyed by its value so `.animate-number-fade` replays on each tick, with an sr-only "N seconds remaining" beside it.',
    'The square is `role="progressbar"` with `aria-valuenow` and an `aria-valuetext` of "38%, Sketching". A polite live region announces `doneLabel` once, and `onComplete` fires from an effect keyed on the done flag through a ref, so a new callback every render does not refire it.',
  ],

  constants: [
    {
      name: 'grid',
      value: '17 × 17 dots, 10-unit pitch, r 1.7',
      why: 'Fine enough to read as a halftone at 176px, coarse enough that each dot is still a distinct mark. An odd count puts a cell exactly on the centre so the ring is symmetric.',
    },
    {
      name: 'ring',
      value: 'peak at 0.7 of the half-width, spread 0.22, outer floor 0.18',
      why: 'Leaves room in the middle for the percentage pill and keeps a faint halo out to the corners of the circle, the way a printed halftone fades.',
    },
    {
      name: 'ripple',
      value: '1.8s cycle, centre-to-edge lag 1.1s, opacity 20%→100%, scale 0.5→1.2',
      why: 'Slow enough to feel like work in progress and not an alert. The lag is shorter than the cycle, so a new wave starts before the last one reaches the rim.',
    },
    {
      name: 'reveal',
      value: 'starts at 40%, 6px halftone cell, dot radius up to 0.75 of the cell, core disc t² with a 22% feather',
      why: 'The first 40% stays abstract, as a real model\'s early steps are noise. At 0.75 of the cell neighbouring dots overlap, so the halftone closes into a solid picture just before the disc covers it.',
    },
    {
      name: 'tile',
      value: '200px wide, rounded-2xl, p-3, square media with rounded-xl',
      why: 'The size of a single image card in a chat thread. It leaves room for the footer label and the countdown on one line.',
    },
  ],

  pitfalls: [
    'Animating the dots with React state. Two hundred circles re-rendering every frame would cost far more than the ripple is worth. The field is memoised and only its `animated` and `paused` flags ever change; the motion lives in CSS.',
    'Using a positive animation delay for the outward wave. Every dot would sit still until its delay passed and the field would start blank. A negative delay `d * lag - period` starts each dot mid-cycle, so the wave is already running on the first frame.',
    'Writing `mask-image` without `mask-size` and `mask-repeat` per layer. The dot layer has to repeat at 6px and the disc layer must not repeat, so both lists need two comma-separated values in the same order as the images.',
    'Setting the `animation` shorthand and `animationPlayState` on the same inline style. React warns on every re-render that toggles one of them, once per dot. The circles use the animation longhands only.',
    'Rounding progress to whole percent inside the timer. The mask would then step visibly. The loop keeps one decimal and only the label floors it.',
  ],

  notes: [
    'Pass any node as `result`; direct children are stretched to fill the square, so an `<svg>` or `<img>` with `object-cover` works as is.',
    'Restart a run by changing the component\'s `key`, as the demo does. Changing `duration` mid-run rescales the remaining time without resetting it.',
    'With `progress` controlled, pass `remainingSeconds` yourself if you want the countdown chip; there is no duration to derive it from.',
  ],

  apiSignature:
    'function ImageGeneratingLoader(props: ImageGeneratingLoaderProps): JSX.Element\ninterface ImageGeneratingLoaderProps { progress?: number; duration?: number; paused?: boolean; remainingSeconds?: number; result?: ReactNode; label?: string; doneLabel?: string; stages?: readonly string[]; onComplete?: () => void; className?: string }',

  props: [
    { name: 'progress', type: 'number', description: 'Controlled progress from 0 to 100. Leave it out to run on the internal timer.' },
    { name: 'duration', type: 'number', default: '6000', description: 'Length of the internal run in ms. Ignored when `progress` is set.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Freezes the internal timer and the ripple.' },
    { name: 'remainingSeconds', type: 'number', description: 'Seconds shown in the countdown chip. Derived from `duration` when uncontrolled.' },
    { name: 'result', type: 'ReactNode', description: 'The finished image. It develops through the halftone mask from 40% and is fully shown at 100%.' },
    { name: 'label', type: 'string', default: '"Generating image"', description: 'Footer label while working, and the progress bar\'s accessible name.' },
    { name: 'doneLabel', type: 'string', default: '"Image ready"', description: 'Footer label and live announcement at 100%.' },
    { name: 'stages', type: 'readonly string[]', default: '["Composing", "Sketching", "Painting", "Refining"]', description: 'Stage names under the percentage, spread evenly across the run.' },
    { name: 'onComplete', type: '() => void', description: 'Called once when progress reaches 100.' },
    { name: 'className', type: 'string', description: 'Merged onto the tile, for example to change its width.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion the dots drop their animation and sit at a fixed 70% of their ring alpha, the halftone reveal is skipped (the result stays hidden until 100%, then appears at once), the dot field does not fade out, and the countdown chip does not fade between values. The percentage, stage and countdown still update, since they carry information.',

  cleanup:
    'The timer effect cancels its pending animation frame on pause, on unmount and when `duration` or controlled mode changes. The ripple is pure CSS, and the hoisted `<style>` is shared and removed by React when no loader is left. There are no listeners or observers.',

  acceptance:
    'A 200px white tile on a grey thread shows a ring of dark dots rippling outward around a frosted "0% Composing" pill, with "Generating image" shimmering in the footer and a "7 s" countdown. The percentage climbs through Sketching, Painting and Refining. From about 40% a blue poster shows through as fine dots that thicken and merge from the centre. At 100% the dots fade, the footer reads "Image ready" with a lime check, and the demo status reads "Done". Pause freezes the count and the ripple; Restart starts again from 0%.',

  criticalRegion: 'critical',
};

export default meta;
