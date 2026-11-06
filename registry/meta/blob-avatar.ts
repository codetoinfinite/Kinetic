/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Blob Avatar" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'blob-avatar',
  title: 'Blob Avatar',
  category: 'display',
  kit: 'boardui',
  tags: ['boardui', 'avatar', 'svg', 'morph', 'agents', 'generative'],
  blurb: 'Seeded SVG blob with eyes: a name picks its shape, colour and face, the body gently morphs and blinks, six sizes.',
  cost: 'css',
  motif: 'wave',
  files: [
    {
      path: 'registry/ui/blob-avatar.tsx',
      type: 'registry:ui',
      role: 'BlobAvatar, blobLook, blobPaths, BLOB_SHAPES, BLOB_FACES, BLOB_COLORS, BLOB_AVATAR_SIZES',
    },
  ],
  dependencies: [],
  summary:
    'A friendly avatar for agents and bots: a soft coloured body with a darker edge and a pair of eyes. Seven body shapes (blob, squircle, star, flower, diamond, shield, cloud), six faces and eight colours. Give it only a name and the name picks all three, always the same way; set any of them to override. While motion is allowed the outline slowly breathes between three wobbled versions of itself and the eyes blink, each avatar on its own timing so a list never moves in step.',
  mechanism: [
    'blobLook(seed) hashes the string once (FNV-1a via hashSeed) and reads colour, shape and face from different bits of the hash, so changing one letter of a name gives a new avatar but the same name is stable across renders, servers and reloads.',
    'Each shape is a unit outline of 40 points: polar radius functions for squircle (superellipse, p = 4), star (raised cosine of 5θ), flower (|cos 3θ|^0.6), cloud (five bumps with a flat base) and blob (three seeded cosine lumps), and arc-length samples along a polygon for diamond and shield.',
    'A seeded tilt of up to ±8° rotates the outline, then toPath turns the points into a closed Catmull-Rom spline written as cubic Béziers (control points at ±1/6 of the neighbour chord), which rounds polygon corners and keeps curves smooth.',
    'blobPaths builds the rest path and two wobbled frames by scaling every point along its radius by 1 + 5.5% × (0.6 sin(2θ + φ) + 0.4 sin(3θ − 2φ)), with φ advanced a third of a turn per frame. All frames share the same command list, so SMIL <animate attributeName="d"> can interpolate rest → A → B → rest with eased keySplines.',
    'The same animate element drives the edge path (offset 2.5, 3.5), the body and the clip path of a soft top-left highlight, so light and edge follow the morph. Eyes are drawn around their own origin and blink with an animateTransform scale to 12% height for 4% of a 3.5 to 6.5 s cycle.',
    'Morph length (5.5 to 8 s), blink length and a negative begin offset are drawn from a second seeded generator, so every avatar starts mid-cycle and neighbours drift apart.',
  ],
  constants: [
    { name: 'samples', value: '40 per outline', why: 'Divides by 5 and 8, so star tips land exactly on a sample; fewer points made the diamond and shield corners mushy.' },
    { name: 'wobble', value: '5.5% of the radius', why: 'Reads as breathing at 32px without changing the silhouette enough to look like a different shape.' },
    { name: 'edge offset', value: '2.5, 3.5 in a 100 viewBox', why: 'A thin darker rim on the lower right gives the flat blob a bit of thickness, like a cut-out sticker.' },
    { name: 'sizes', value: 'xs 24 · sm 32 · md 40 · lg 56 · xl 80 · 2xl 128 px', why: 'Matches list rows (32), headers (40) and the large editor preview (128); any number also works.' },
    { name: 'blink', value: 'scaleY 0.12 for 4% of the cycle', why: 'About 200 ms closed, quick enough to read as a blink rather than a squint.' },
  ],
  pitfalls: [
    'Morph frames must have the same number of points and commands; mixing shapes inside one animate snaps instead of morphing.',
    'Round path numbers before rendering (here to 0.1): long floats bloat the markup and can differ between the server and the browser, which breaks hydration.',
    'SMIL ignores prefers-reduced-motion, so the animate elements are only rendered when motion is allowed; do not rely on a CSS media query to stop them.',
    'Pass decorative when the name already sits next to the avatar, otherwise screen readers hear every agent name twice.',
  ],
  notes: [
    'Children are overlaid on the avatar box, so a status dot can sit on its corner.',
    'BLOB_COLORS holds plain artwork colours (fill and edge) that stay the same in light and dark themes; they are only used inside the SVG.',
    'blobLook and blobPaths are exported for pickers and for drawing the same blob in a canvas or an OG image.',
  ],
  apiSignature:
    'function BlobAvatar(props: { name: string; seed?: string; shape?: BlobShape; color?: BlobColor; face?: BlobFace; size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number; animated?: boolean; decorative?: boolean; children?: ReactNode; className?: string }): JSX.Element',
  props: [
    { name: 'name', type: 'string', description: 'Accessible name and default seed.' },
    { name: 'seed', type: 'string', description: 'Seed for look and wobble when it should not follow the name (for example a stable id).' },
    { name: 'shape', type: '"blob" | "squircle" | "star" | "flower" | "diamond" | "shield" | "cloud"', description: 'Overrides the seeded shape.' },
    { name: 'color', type: '"lime" | "mint" | "sky" | "violet" | "peach" | "butter" | "pink" | "coral"', description: 'Overrides the seeded colour.' },
    { name: 'face', type: '"dots" | "happy" | "sleepy" | "wink" | "surprised" | "none"', description: 'Overrides the seeded face.' },
    { name: 'size', type: '"xs" | "sm" | "md" | "lg" | "xl" | "2xl" | number', default: '"md"', description: 'Preset or pixel size.' },
    { name: 'animated', type: 'boolean', default: 'true', description: 'Morph and blink; forced off under reduced motion.' },
    { name: 'decorative', type: 'boolean', default: 'false', description: 'aria-hidden instead of role="img" with the name.' },
    { name: 'children', type: 'ReactNode', description: 'Overlay such as a status dot.' },
    { name: 'className', type: 'string', description: 'Classes for the avatar box.' },
  ],
  reducedMotion:
    'Under prefers-reduced-motion the SVG animate and animateTransform elements are not rendered at all, so the avatar shows its resting outline with open eyes; shape, colour and face are unchanged.',
  cleanup: 'No timers, listeners or rAF: the morph and blink are SMIL animations owned by the SVG and stop when the element unmounts.',
  acceptance:
    'The same name renders the same shape, colour and face on every load; shape, color and face props override them; data-shape, data-color and data-face reflect the result; with reduced motion no animate element is in the DOM; sizes render at 24, 32, 40, 56, 80 and 128 px.',
  criticalRegion: 'critical',
};

export default meta;
