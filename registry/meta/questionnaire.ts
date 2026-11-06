/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Questionnaire" (boardui.com/components/questionnaire).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'questionnaire',
  title: 'Questionnaire',
  category: 'form',
  kit: 'boardui',
  tags: ['agent', 'form', 'stepper', 'survey', 'checkbox', 'radio', 'ai', 'boardui'],
  blurb:
    'The questions an agent asks before it plans: one per step, checkbox or numbered rows, a free-text Other and step pills.',
  cost: 'dom',
  motif: 'stack',
  files: [{ path: 'registry/ui/questionnaire.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['motion@^12.43.0'],
  summary:
    'A chat-thread card that walks through a few questions, one at a time. Multiple-select questions are checkbox rows; single-select questions number their rows, and a click or the digit key picks and moves on after a short beat so the choice is seen landing. An optional Other row takes free text. The footer has a pill per question for jumping around plus Previous and Next, which reads Done on the last step. Questions slide in the direction of travel while the card eases to the new height.',
  mechanism: [
    'Answers are keyed by question id as { values, other? }: values keep option order, and other exists only while the Other row is selected. Typed text is kept in a separate drafts map so unticking Other and ticking it again restores it.',
    'answers and step are each controllable: the prop wins when given, otherwise internal state holds it, and the change callback fires either way.',
    'A single-select pick writes { values: [value] } and schedules goTo(step + 1) after advanceDelay; the timeout is cleared by any other navigation and on unmount. When the pick moves the card on, focus lands on the next question\'s first row.',
    'goTo records the direction (+1 or -1, mirrored in RTL); AnimatePresence in popLayout mode hands it to both the entering and the exiting panel so they slide opposite ways at once.',
    'The exiting panel is popped out of flow, so a shared ResizeObserver on the panel wrapper reports the new question\'s height right away, and an outer motion.div animates its height to it with overflow hidden.',
    'One keydown handler on the card maps 1-9 to rows (the last digit focuses the Other input) and ArrowUp/ArrowDown to moving focus between rows; it ignores typing inside the input, where Enter sends the free text.',
  ],
  constants: [
    { name: 'advanceDelay', value: '180ms', why: 'Long enough to see the row and its key turn selected, short enough that picking feels like one action.' },
    { name: 'slide', value: '28px, 320ms, cubic-bezier(0.22, 1, 0.36, 1), 2px blur', why: 'A short travel distance keeps the two overlapping panels readable while they cross.' },
    { name: 'height', value: '300ms on the same curve', why: 'Finishes with the slide so the footer settles once.' },
  ],
  pitfalls: [
    'Give every question a stable, unique id: answers and drafts are stored by it.',
    'A pick on the last single-select question does not complete on its own; Done fires onComplete, so a stray click cannot send the answers.',
    'When you control step, keep it inside 0..questions.length - 1; out-of-range values are clamped for display only.',
    'Digit keys only work while focus is inside the card, so they never steal keys from the rest of the page.',
  ],
  notes: [
    'select on a question overrides the card-level select, so one card can mix checkbox and numbered questions.',
    'labels rewords Previous, Next, Done, the Other row, the dismiss button and the steps group.',
    'onComplete receives the answers as they stand; questions left unanswered are absent or have empty values.',
  ],
  apiSignature:
    '<Questionnaire questions={[{ id: "permission", select: "single", question: "How should the permission pill behave?", options: [{ value: "lock", label: "Lock it" }], other: true }]} onComplete={(answers) => plan(answers)} onDismiss={() => setOpen(false)} />',
  props: [
    { name: 'questions', type: 'readonly QuestionnaireQuestion[]', description: 'Each has id, question, options ({ value, label, description? }), optional other (true or { label, placeholder }), select and stepLabel.' },
    { name: 'select', type: '"single" | "multiple"', default: '"multiple"', description: 'Default mode for questions that do not set their own.' },
    { name: 'advanceDelay', type: 'number', default: '180', description: 'Milliseconds before a single-select pick moves to the next question.' },
    { name: 'answers', type: 'QuestionnaireAnswers', description: 'Controlled answers keyed by question id.' },
    { name: 'defaultAnswers', type: 'QuestionnaireAnswers', default: '{}', description: 'Initial answers when uncontrolled.' },
    { name: 'onAnswersChange', type: '(answers: QuestionnaireAnswers) => void', description: 'Fires on every pick, untick or keystroke in Other.' },
    { name: 'step', type: 'number', description: 'Controlled index of the visible question.' },
    { name: 'defaultStep', type: 'number', default: '0', description: 'Initial question when uncontrolled.' },
    { name: 'onStepChange', type: '(step: number) => void', description: 'Fires when Previous, Next, a pill or an auto-advance changes the question.' },
    { name: 'onComplete', type: '(answers: QuestionnaireAnswers) => void', description: 'Fires when Done is pressed on the last question, or Enter is pressed in its Other field.' },
    { name: 'onDismiss', type: '() => void', description: 'Shows the corner dismiss button when set.' },
    { name: 'labels', type: 'QuestionnaireLabels', description: 'previous, next, complete, other, otherPlaceholder, dismiss and steps.' },
    { name: 'aria-label', type: 'string', default: '"Questions"', description: 'Accessible name of the card.' },
    { name: 'className', type: 'string', description: 'Classes on the card.' },
  ],
  reducedMotion:
    'Questions swap with a 120ms crossfade instead of the slide and blur, the card height changes instantly, and row colour transitions are off. Single-select picks still wait advanceDelay so the choice is visible.',
  cleanup:
    'The pending auto-advance timeout is cleared on every navigation and on unmount; the height observer is released on unmount. Keyboard handling is a React handler on the card, so no global listeners are attached.',
  acceptance:
    'Ticking two rows on step 1 sets both checkboxes and Next moves to step 2 with the card sliding left; pressing 2 there highlights Queue the change and moves to step 3 on its own; Previous returns with the pick still highlighted; typing in Other ticks it; the pills jump straight to any step; Done on step 4 shows the summary, Edit answers comes back with every answer intact and Start over clears them.',
  criticalRegion: 'critical',
};

export default meta;
