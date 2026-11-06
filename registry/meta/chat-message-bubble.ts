import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'chat-message-bubble',
  title: 'Chat Message Bubble',
  category: 'display',
  kit: 'boardui',
  tags: ['chat', 'message', 'ai', 'clipboard', 'feedback', 'boardui'],
  blurb:
    'User and assistant chat rows with avatar, bubble, time and inline code. Hovering shows copy, regenerate and like/dislike actions.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/chat-message-bubble.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'One row of an AI chat transcript. User messages sit on the right in a filled bubble with an initials avatar, and assistant messages sit on the left in an outlined bubble with a sparkle avatar. Each row shows its time and an action row that appears on hover or focus. Copy writes to the real clipboard; assistant rows also get regenerate and a like/dislike pair. Single-backtick spans render as inline code.',

  mechanism: [
    'The row is an `<article>` with the avatar and a bubble column. `from="user"` adds `flex-row-reverse` and `items-end`, so the same markup mirrors to the right. The bubble column is capped at `min(85%, 36rem)`, and the corner nearest the avatar is cut to `rounded-*-md` so the bubble points at its sender.',
    '`renderMessageText` splits the text on blank lines into `<p>` elements, then splits each paragraph with the capturing regex ``/(`[^`\\n]+`)/``. Because the group is captured, every code span lands at an odd index and becomes a `<code>` in mono at 0.875em on the opposite surface colour. Anything else, including a lone backtick, stays plain text.',
    'The action row starts at `opacity-0` and is revealed by `group-hover/message`, `group-focus-within/message` and `data-[pinned]`, which is set while the copy result is showing. On `@media (hover: none)` it is always visible. It uses opacity rather than `hidden`, so the buttons stay in the tab order and tabbing onto one reveals the row.',
    'Copy calls `navigator.clipboard.writeText`. If that rejects (an insecure origin or a refused permission), it copies from a hidden, selected `<textarea>` with `document.execCommand("copy")`, removes it and puts focus back. A success swaps the icon to a check in lime and the label to "Copied", and a failure shows a rose warning and "Copy failed". A visually hidden `role="status"` announces the result, and a 1600ms timer resets it.',
    'Like and dislike are React Aria `ToggleButton`s that both read one `rating` value, so pressing one clears the other and pressing it again clears the rating. They work controlled (`feedback`) or uncontrolled (`defaultFeedback`), and the selected one swaps to the filled thumb icon. Regenerate is a plain React Aria `Button` that only renders on assistant rows when `onRegenerate` is passed.',
    'Every action is wrapped in the kit `TooltipTrigger` with a 300ms delay, and its tooltip text matches its `aria-label`.',
  ],

  constants: [
    {
      name: 'COPY_RESET_MS',
      value: '1600ms',
      why: 'Long enough to read "Copied" after moving the pointer away, short enough that a second copy a moment later starts from the normal icon.',
    },
    {
      name: 'tooltip delay',
      value: '300ms',
      why: 'Four small icon buttons sit side by side. Without a delay, moving the pointer along the row flashes a tooltip for each one.',
    },
    {
      name: 'bubble max width',
      value: 'min(85%, 36rem)',
      why: 'About 70 characters per line on a wide screen. On a phone, 85% leaves room for the avatar and keeps user and assistant sides apart.',
    },
    {
      name: 'action button',
      value: '28px, 16px icon',
      why: 'Fits under the bubble next to the time without making the row taller than the caption needs.',
    },
  ],

  pitfalls: [
    'Hiding the actions with `hidden` or `display: none` until hover. That removes them from the tab order, so keyboard users can never reach them. Opacity plus `group-focus-within` keeps them focusable.',
    'Giving like and dislike their own `isSelected` state. Both can end up pressed. Derive both from one value.',
    'Splitting on backticks with a non-capturing regex. The code spans are dropped from the result. With a capturing group they come back at odd indices.',
    'Setting state when the clipboard promise settles after the row has unmounted. The hook checks a mounted ref first and clears its timer on unmount.',
  ],

  notes: [
    '`text` is a plain string, not Markdown. Only blank-line paragraphs and single-backtick code are handled; fenced blocks, links and lists are not.',
    'In the dark theme the primary and tertiary backgrounds are the same grey, so the user bubble, the code chips in assistant bubbles and the user avatar step up to the quaternary background with `dark:`.',
    'A user avatar uses the kit `Avatar` with initials from `name` ("Ada Park" becomes AP). Pass `avatar` to replace either avatar.',
    'The demo is a four-message thread. Regenerate cycles each reply through canned alternatives and clears its rating, both replies use controlled `feedback`, and a status line at the bottom reports each copy, rating and regenerate.',
  ],

  apiSignature:
    'function ChatMessageBubble(props: { from: "user" | "assistant"; text: string; time?: string; dateTime?: string; name?: string; avatar?: ReactNode; feedback?: "like" | "dislike" | null; defaultFeedback?: "like" | "dislike" | null; onFeedbackChange?: (value: "like" | "dislike" | null) => void; onRegenerate?: () => void; onCopy?: (text: string) => void; className?: string }): JSX.Element\nfunction renderMessageText(text: string, codeClassName?: string): ReactNode',

  props: [
    { name: 'from', type: '"user" | "assistant"', description: 'Which side the row sits on, which bubble style it uses and which actions it gets.' },
    { name: 'text', type: 'string', description: 'Message text. Single backticks make inline code; a blank line starts a paragraph. This is also what Copy writes.' },
    { name: 'time', type: 'string', description: 'Time shown under the bubble, already formatted.' },
    { name: 'dateTime', type: 'string', description: 'Machine-readable value for the `<time>` element.' },
    { name: 'name', type: 'string', default: '"You" / "Assistant"', description: 'Sender name for the initials avatar and the row\'s accessible label.' },
    { name: 'avatar', type: 'ReactNode', description: 'Replaces the default avatar.' },
    { name: 'feedback', type: '"like" | "dislike" | null', description: 'Controlled rating for an assistant row.' },
    { name: 'defaultFeedback', type: '"like" | "dislike" | null', default: 'null', description: 'Starting rating when uncontrolled.' },
    { name: 'onFeedbackChange', type: '(value: "like" | "dislike" | null) => void', description: 'Called with the new rating, or null when it is cleared.' },
    { name: 'onRegenerate', type: '() => void', description: 'Shows the regenerate button on an assistant row.' },
    { name: 'onCopy', type: '(text: string) => void', description: 'Called after the text reaches the clipboard.' },
    { name: 'className', type: 'string', description: 'Classes for the row.' },
  ],

  reducedMotion:
    'The action row fade and the button colour and press-scale transitions use `motion-reduce:transition-none`, and the press scale is held at 100%. The row still appears on hover and focus, just without fading. Tooltips follow the kit\'s own reduced-motion rule.',

  cleanup:
    'The copy reset timer is cleared when copy runs again and on unmount. A mounted ref stops a late clipboard promise from setting state, and the fallback textarea is removed straight after copying.',

  acceptance:
    'Hover or Tab onto a message and its actions fade in under the bubble. Copy puts the exact text on the clipboard and shows a check and "Copied" for about 1.6s. Like and dislike are exclusive and pressing one again clears it. Regenerate appears only on assistant rows. Backtick spans show as inline code.',

  criticalRegion: 'critical',
};

export default meta;
