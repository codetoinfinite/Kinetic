/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Creator" (boardui.com/components/agent-creator).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agent-creator',
  title: 'Agent Creator',
  category: 'form',
  kit: 'boardui',
  tags: ['agent', 'form', 'avatar', 'validation', 'ai', 'boardui'],
  blurb:
    'A create-an-agent card: paper avatar with a face ring and shape arc, colour pill, profile, tools and voice fields, then a created summary.',
  cost: 'dom',
  motif: 'orbit',
  files: [
    { path: 'registry/ui/agent-creator.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/agent-creator-avatar.tsx', type: 'registry:ui', role: 'paper avatar art, faces and shapes' },
  ],
  dependencies: ['motion@^12.43.0', '@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],
  summary:
    'An agent setup card. The top half is a paper-cut avatar ringed by sixteen face options, with nine shapes on an arc underneath that rotates to bring the chosen one into its socket, and a colour pill that recolours every piece of paper. Below it, grouped fields collect the name, label, description, model, tools, language, notifications, voice and playback speed. Create validates the draft, awaits onCreate, and swaps to a created summary with Edit details and Create another.',
  mechanism: [
    'Faces sit on a circle of radius 104px around the avatar at 22.5° steps; shapes sit on a 162px arc below it, each tile placed by its wrapped offset k from the selected index (θ = 90° − 24°·k), so picking a shape slides the arc with a CSS transform transition.',
    'Faces, shapes and colours are radiogroups with a roving tabindex: arrow keys and Home/End move the selection and focus together, so a keyboard user can turn the arc without a pointer.',
    'The avatar is SVG paper: the silhouette drawn twice (a 28% darker copy offset 2.5/3.5 units for the cut edge), a feTurbulence speckle filter clipped to the shape alpha for grain, and ink features drawn in a fixed dark tone because they sit on paper, not on the page.',
    'validateAgent(draft) returns per-field errors. They appear only after the first Create, update live while typing, and the first invalid field receives focus; a footer line counts what is left to fix.',
    'Submit sets a submitting state, awaits onCreate, and guards against unmount with a mounted ref; a rejection keeps the form and shows its message, success swaps to the summary and focuses its heading.',
  ],
  constants: [
    { name: 'FACE_R', value: '104', why: 'Clears the 136px avatar with room for 32px face discs without touching the shape arc.' },
    { name: 'SHAPE_R', value: '162', why: 'Hangs the arc under the face ring; five visible tiles span about 270px, inside the 320px stage.' },
    { name: 'SHAPE_STEP_DEG', value: '24', why: 'Spacing between neighbouring shapes on the arc; wider steps push the outer tiles off the card.' },
    { name: 'SHAPE_VISIBLE', value: '2', why: 'Tiles with |k| greater than 2 fade out and stop taking pointer input.' },
  ],
  pitfalls: [
    'Ink stays dark in both themes on purpose; it is drawn on the coloured paper, not on the page background.',
    'Each PaperAvatar builds its grain filter id from useId, stripped of colons, so several avatars on one page never share a filter.',
    'The shape arc wraps: a tile moving from k = −4 to k = 4 crosses the arc while invisible, so only visible tiles take pointer input.',
  ],
  notes: [
    'Pass value + onChange to drive the draft yourself; defaultValue seeds the uncontrolled draft and is what Reset returns to.',
    'Export validateAgent to run the same checks on the server.',
  ],
  apiSignature:
    '<AgentCreator defaultValue={{ name: "Cloud engineer" }} onCreate={async (draft) => save(draft)} onReset={() => {}} />',
  props: [
    { name: 'value', type: 'AgentDraft', description: 'Controlled draft. Pair with onChange.' },
    { name: 'defaultValue', type: 'Partial<AgentDraft>', description: 'Uncontrolled starting draft merged over DEFAULT_AGENT_DRAFT; Reset restores it.' },
    { name: 'onChange', type: '(draft: AgentDraft) => void', description: 'Called on every field, face, shape or colour change.' },
    { name: 'onCreate', type: '(draft: AgentDraft) => void | Promise<void>', description: 'Called with a valid draft. A promise shows the creating state; a rejection shows its message.' },
    { name: 'onReset', type: '() => void', description: 'Called after Reset or Create another.' },
    { name: 'models / tools / languages / voices / speeds', type: 'readonly AgentOption[]', description: 'Option lists for the selects, tool chips and speed control.' },
    { name: 'colors', type: 'readonly AgentColor[]', default: 'AGENT_COLORS', description: 'Preset paper colours; a custom colour input sits at the end.' },
    { name: 'submitLabel', type: 'string', default: '"Create agent"', description: 'Primary button text.' },
    { name: 'className', type: 'string', description: 'Classes on the card, e.g. a fixed height so the body scrolls.' },
  ],
  reducedMotion:
    'The avatar stops floating and blinking, the pop on pick is skipped, the shape arc and face hover snap without transitions, and the created summary appears without its rise.',
  cleanup:
    'The only async work is the awaited onCreate; a mounted ref drops its result after unmount. Motion loops stop with their elements. The demo clears its pending save timers on unmount.',
  acceptance:
    'Clearing the name and pressing Create shows "Give the agent a name." and focuses the field; a valid draft shows Creating… then "<name> is ready"; Create another restores the starting draft; arrow keys on the face ring and shape arc change the avatar.',
  criticalRegion: 'critical',
};

export default meta;
