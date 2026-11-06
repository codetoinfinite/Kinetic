/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Progress" (boardui.com/components/agent-progress).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agent-progress',
  title: 'Agent Progress',
  category: 'display',
  kit: 'boardui',
  tags: ['agent', 'progress', 'steps', 'ring', 'ai', 'boardui'],
  blurb:
    'A minimizable step list for multi-step agent work: an overall ring, a timed ring on the running step, check-offs and a completion hand-off.',
  cost: 'dom',
  motif: 'rings',
  files: [{ path: 'registry/ui/agent-progress.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['motion@^12.43.0', '@remixicon/react@^4.9.0'],
  summary:
    'A compact block that runs an ordered list of steps. Each step runs for stepDuration with its own ring filling, then checks off with a strike-through while the next one lights up; the header ring tracks the whole run and counts the steps left. The block can be minimized without losing its place, and after the last check it holds for completionDelay before calling onFinished.',
  mechanism: [
    'useStepClock stamps performance.now() when a step becomes active and samples the elapsed fraction in a requestAnimationFrame loop; at 1 it calls advance(step + 1), which changes the effect key and starts the next clock.',
    'The fraction is stored with the step it belongs to, so a new step reads 0 on its first render without a synchronous reset in the effect.',
    'Rings are a 16-unit SVG circle with stroke-dasharray equal to its circumference; dashoffset = C·(1 − fraction). The header ring uses (done + fraction) / total.',
    'Rows enter with a 60ms stagger (opacity, 6px rise, 2px blur) through motion; finished steps swap their ring for a check that springs in.',
    'Minimizing collapses the list with a grid-template-rows 0fr transition and makes it inert; the clock keeps running, so reopening shows the current step.',
  ],
  constants: [
    { name: 'stepDuration', value: '2400ms', why: 'Long enough to read a step label and watch its ring fill, short enough that five steps finish in about 12s.' },
    { name: 'completionDelay', value: '1000ms', why: 'Lets the last check and "All steps done" register before the caller swaps in the reply.' },
    { name: 'STAGGER_S', value: '0.06', why: 'Rows arrive as a quick cascade; slower reads as lag on a five-step list.' },
    { name: 'REDUCED_TICKS', value: '4', why: 'Under reduced motion the rings step in quarters instead of moving every frame.' },
  ],
  pitfalls: [
    'Restarting at the same step index does not restart the clock; remount with a new key to replay the stagger and the timer from zero.',
    'In controlled mode the clock only advances through onStepChange; if the parent ignores it, the running ring stops full.',
    'onFinished is read through a ref, so an inline callback does not restart the completion timer.',
  ],
  notes: [
    'Pass step + onStepChange to skip ahead or sync with real agent events; steps.length means every step is done.',
    'The running label uses the theme agent-progress-loading-text shimmer, which already falls back to plain text under reduced motion.',
  ],
  apiSignature:
    '<AgentProgress steps={["Analyze the request", "Generate the component"]} stepDuration={2400} completionDelay={1000} onFinished={() => reply()} />',
  props: [
    { name: 'steps', type: 'readonly string[]', description: 'Ordered step labels.' },
    { name: 'step / defaultStep / onStepChange', type: 'number / number / (step: number) => void', default: '0', description: 'Index of the running step, controlled or uncontrolled. steps.length means done.' },
    { name: 'stepDuration', type: 'number', default: '2400', description: 'Milliseconds each step runs.' },
    { name: 'completionDelay', type: 'number', default: '1000', description: 'Milliseconds to hold the done state before onFinished.' },
    { name: 'onFinished', type: '() => void', description: 'Fires once after the final step and the completion delay.' },
    { name: 'minimized / defaultMinimized / onMinimizedChange', type: 'boolean / boolean / (minimized: boolean) => void', default: 'false', description: 'Collapses the list to the header.' },
    { name: 'remainingLabel', type: '(remaining: number) => string', default: '"{n} steps left"', description: 'Header copy while running.' },
    { name: 'doneLabel', type: 'string', default: '"All steps done"', description: 'Header copy once finished.' },
    { name: 'className', type: 'string', description: 'Classes on the block.' },
  ],
  reducedMotion:
    'Rows appear without the stagger, checks appear without the spring, the list opens and closes instantly, the label shimmer stops, and the rings advance in four discrete quarters per step instead of every frame. Steps still advance on time.',
  cleanup:
    'The clock effect cancels its requestAnimationFrame or interval whenever the step, duration or motion preference changes and on unmount; the completion timeout is cleared the same way.',
  acceptance:
    'The header reads "5 steps left" then counts down as each step checks off; Skip step jumps to the next row; minimize hides the list and the count keeps moving; after the last step the header reads "All steps done" and onFinished fires about a second later; Restart replays from the first step.',
  criticalRegion: 'critical',
};

export default meta;
