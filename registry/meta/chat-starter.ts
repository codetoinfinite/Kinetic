import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'chat-starter',
  title: 'Chat Starter',
  category: 'block',
  kit: 'boardui',
  tags: ['chat', 'ai', 'empty-state', 'composer', 'suggestions', 'boardui'],
  blurb:
    'Empty AI chat screen with a greeting, suggestion chips that fill the pill composer, and an "Add an API key to start" setup card.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/chat-starter.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A full chat page: the kit dashboard sidebar on the left and a rounded chat card holding the first screen of a conversation. With no messages the card centres a greeting, a pill composer and a row of suggestion chips; a chip fills the composer instead of sending, so the visitor can edit first. Set `apiKeyMissing` and the card shows a setup checklist for adding a provider key, with a button that skips straight to the demo. Sending posts the message and answers with a scripted reply after a short thinking state, so the screen works with no backend.',

  mechanism: [
    'State is local: `draft` (the composer text), `messages` (an array of `{ id, role, text }` with ids from a counter ref, never `Math.random`), `thinking`, the chosen `model`, and `skipped`. The setup card renders while `apiKeyMissing && !skipped`; "Skip, show me the demo" sets `skipped` and calls `onSkip`.',
    'The composer zone is one element in both layouts. With no messages it gets `my-auto` inside a flex column, which centres the greeting, composer and chips vertically. Once a message exists, a scrolling list is inserted before it as a sibling, so the composer drops to the bottom without remounting and keeps focus.',
    'A suggestion chip calls `setDraft(prompt ?? label)`, focuses the textarea and raises a `caretToEnd` ref. The layout effect that sizes the field runs after the new value is in the DOM, so it is the place that parks the caret at the end and clears the flag.',
    'The textarea auto-grows: the layout effect sets `height: auto`, reads `scrollHeight` and writes it back capped at 6 lines × 20px + 16px of vertical padding. Past the cap the field scrolls.',
    'Enter sends and Shift+Enter inserts a newline. The keydown handler skips Enter while `nativeEvent.isComposing` is true, so confirming an IME candidate never sends a half-typed message. The send button is a real `type="submit"` in a `<form>`, disabled while the trimmed draft is empty or a reply is pending.',
    'Send appends the user message, clears the draft and starts one timeout (`replyDelay`, 900ms). When it fires it appends the reply of the suggestion whose prompt matches the sent text exactly, else `fallbackReply`. The timer id lives in a ref and is cleared on reset, before a new send, and on unmount.',
    'The model chip is the kit `Dropdown`, controlled through `isOpen` so picking a row can close it. The selected row shows a check. The header "Start a new chat" button clears messages, draft and any pending reply.',
  ],

  constants: [
    {
      name: 'composer radius',
      value: '26px',
      why: 'Half of the 52px single-line height (36px controls + 8px padding top and bottom), so a one-line composer is a true pill. When the field grows to several lines the same radius reads as a soft card instead of a stretched capsule.',
    },
    {
      name: 'MAX_LINES',
      value: '6',
      why: 'Enough to see a pasted paragraph without the composer covering the conversation on an 800px-tall screen. Past six lines the field scrolls inside itself.',
    },
    {
      name: 'replyDelay',
      value: '900ms',
      why: 'Long enough for the thinking indicator to register as a state, not a flicker. Much longer and the scripted demo feels broken.',
    },
    {
      name: 'content column',
      value: 'max-w-[720px]',
      why: 'Keeps line length near 90 characters at 14px, which stays readable on a wide screen while the card itself stretches.',
    },
  ],

  pitfalls: [
    'Sending on a suggestion click. The chip only fills the composer. Prompts usually need a word changed, and sending on click also makes it impossible to read the chips before committing.',
    'Moving the caret with `setSelectionRange` straight after `setDraft`. The DOM still holds the old value at that point, so the caret lands at the old length. Do it in the layout effect after the value commits.',
    'Sending on Enter during IME composition. Japanese, Chinese and Korean input confirm candidates with Enter, so check `nativeEvent.isComposing` first.',
    'Rendering the composer twice, once centred and once docked. The swap remounts the textarea and drops focus and the caret on the first send. Keep one element and change the layout around it.',
    'Leaving the reply timeout running on unmount or reset. A late `setMessages` writes an answer into a fresh chat.',
  ],

  notes: [
    'The setup copy names Vercel and `AI_API_KEY` because that is the deploy path of the starter. Change the card copy to match your own host and variable name.',
    'Pass `navItems={null}` to drop the sidebar and use the chat card alone inside another layout. The sidebar is also hidden below the `lg` breakpoint.',
  ],

  apiSignature:
    'function ChatStarter(props: { apiKeyMissing?: boolean; onSkip?: () => void; greeting?: string; subtitle?: string; suggestions?: ChatStarterSuggestion[]; placeholder?: string; models?: string[]; onSubmit?: (text: string) => void; fallbackReply?: string; replyDelay?: number; navItems?: DashboardNavItem[] | null; className?: string }): JSX.Element\ninterface ChatStarterSuggestion { label: string; prompt?: string; icon?: RemixiconComponentType; reply?: string }',

  props: [
    { name: 'apiKeyMissing', type: 'boolean', default: 'false', description: 'Show the "Add an API key to start" setup card instead of the greeting and composer, until the visitor skips it.' },
    { name: 'onSkip', type: '() => void', description: 'Called when "Skip, show me the demo" is pressed. The card hides either way.' },
    { name: 'greeting', type: 'string', default: '"What can I help with?"', description: 'Heading of the empty state.' },
    { name: 'subtitle', type: 'string', default: '"Ask anything, or start from one of these."', description: 'Line under the greeting. Pass an empty string to hide it.' },
    { name: 'suggestions', type: 'ChatStarterSuggestion[]', default: '[]', description: 'Chips under the composer. A click fills the composer with `prompt ?? label`; `reply` is the scripted answer for that exact prompt.' },
    { name: 'placeholder', type: 'string', default: '"Ask me anything"', description: 'Composer placeholder.' },
    { name: 'models', type: 'string[]', default: '["Swift 2", "Swift 2 Mini", "Deep 1"]', description: 'Names listed in the model chip. The first is selected.' },
    { name: 'onSubmit', type: '(text: string) => void', description: 'Called with the trimmed text on every send.' },
    { name: 'fallbackReply', type: 'string', description: 'Scripted answer for prompts that match no suggestion.' },
    { name: 'replyDelay', type: 'number', default: '900', description: 'Milliseconds of thinking state before the scripted answer lands.' },
    { name: 'navItems', type: 'DashboardNavItem[] | null', default: 'CHAT_STARTER_NAV', description: 'Sidebar rows (Chat, Dashboard, Components and Blocks, Sign in, Sign up). `null` hides the sidebar.' },
    { name: 'className', type: 'string', description: 'Merged onto the root.' },
  ],

  reducedMotion:
    'Composer, chip and button transitions carry `motion-reduce:transition-none`, the send button no longer scales on press, and new replies appear without the fade-in because that animation is behind `motion-safe:`. The kit thinking indicator falls back to its static frame. The scripted delay stays, since it is a state, not motion.',

  cleanup:
    'One `setTimeout` for the scripted reply, held in a ref and cleared on unmount, on "Start a new chat" and before every new send. The model dropdown and the sidebar clean up after themselves.',

  acceptance:
    'With `apiKeyMissing` the setup card shows; "Skip, show me the demo" reveals the greeting, composer and chips. Clicking a chip fills the composer with its prompt without sending. Enter sends, Shift+Enter adds a line, and the send button is disabled while the field is empty. A sent message appears on the right, "Thinking" shows, then a reply appears on the left.',

  criticalRegion: 'critical',
};

export default meta;
