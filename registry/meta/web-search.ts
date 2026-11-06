/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Web Search" (boardui.com/components/web-search).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'web-search',
  title: 'Web Search',
  category: 'display',
  kit: 'boardui',
  tags: ['agent', 'search', 'sources', 'log', 'streaming', 'ai', 'boardui'],
  blurb:
    'The research half of an agent log: each query lands on a curved guide, and a step that found something branches into overlapping site marks.',
  cost: 'dom',
  motif: 'trail',
  files: [{ path: 'registry/ui/web-search.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['motion@^12.43.0', '@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],
  summary:
    'Shows where an agent looked while it researched. Headings open a level and the searches under them land one row at a time on the Agent Log guide; a step with sources branches once more into a Sources row whose site marks overlap like a stack, each with its title and domain on hover. The row expands into a list of titles and domains, past six marks the rest collapse into a count, and per-step dwell makes slow searches hold longer than cached ones.',
  mechanism: [
    'Steps flatten into reveal units: one per step plus one for its Sources row. useRevealTicker from agent-log counts them, paced by a delayFor callback: startDelay first, sourceBeat between a step and its Sources row, then that step\'s dwell (or stepInterval) before the next step.',
    'A memoised tree groups plain steps under the heading before them, with each node\'s unit offset; a node renders once revealed passes its offset, and its Sources row once revealed passes offset + 1.',
    'The step the trail is holding on is the one owning unit revealed - 1, and it shimmers through ShimmerText until the next unit lands.',
    'Top-level rows mount as motion.li with the shared blur-and-height reveal; nested steps and Sources rows are agent-log LogRow items with their own curved branch, and a GuideBridge drops 6px from each 16px glyph to the nested trunk at ms-2.',
    'Site marks reuse the social-button glyph set: the path is drawn in the brand colour, black brands take text-primary so they invert with the theme, and anything else gets a globe. Each mark is a react-aria Focusable trigger for the kit Tooltip, rendered as a link when the source has an href.',
    'The Sources list collapses with a grid-template-rows 1fr to 0fr transition and is inert while closed.',
  ],
  constants: [
    { name: 'startDelay', value: '320ms', why: 'The first row should not land on the same frame as the user turn that started the search.' },
    { name: 'sourceBeat', value: '450ms', why: 'Long enough to read the step before its sources branch off, short enough that the two still read as one find.' },
    { name: 'stepInterval', value: '850ms (demo 800ms)', why: 'Default hold for a step with no dwell; dwell overrides it per step.' },
    { name: 'maxMarks', value: '6', why: 'Six overlapping 20px marks fit beside "Sources" at 360px; the rest become a +N count.' },
    { name: 'mark overlap', value: '20px bordered tiles, -6px overlap', why: 'Each tile carries its own border and fill, so the stack reads as separate sites on any surface in either theme.' },
  ],
  pitfalls: [
    'Key the component on the turn: a new question needs a new key, or the reveal count carries over.',
    'Pass steps as a stable array; the pacing callback depends on it and a new array every render restarts the pending timer.',
    'A step with sources counts as two units when you drive revealed yourself.',
    'The marks sit inside the log\'s clipping edge, so their tooltips portal out through the kit Tooltip rather than rendering inline.',
  ],
  notes: [
    'brand accepts any of the 24 social-button providers; pass href on a source to make its mark and list entry links.',
    'Pass working={false} to hide the tail indicator or a string to relabel it.',
  ],
  apiSignature:
    '<WebSearch key={turnId} steps={[{ label: "Ran 3 searches", icon: RiSearchLine, heading: true }, { label: "Searched Reddit for", query: "design tokens", brand: "reddit", meta: "5 results", dwell: 1400, sources }]} onComplete={() => reply()} />',
  props: [
    { name: 'steps', type: 'readonly WebSearchStep[]', description: 'Steps with label, optional query, icon or brand, heading, meta, dwell and sources ({ title, domain, brand?, href? }).' },
    { name: 'run', type: 'boolean', default: 'true', description: 'Pauses and resumes the internal timer.' },
    { name: 'startDelay', type: 'number', default: '320', description: 'Milliseconds before the first row lands.' },
    { name: 'stepInterval', type: 'number', default: '850', description: 'Hold on a step that has no dwell, in milliseconds.' },
    { name: 'sourceBeat', type: 'number', default: '450', description: 'Milliseconds between a step and its Sources row.' },
    { name: 'revealed', type: 'number', description: 'Rows landed, when driven from real events; disables the timer.' },
    { name: 'maxMarks', type: 'number', default: '6', description: 'Marks drawn before the rest collapse into a count.' },
    { name: 'working', type: 'string | false', default: '"Working"', description: 'Tail indicator label while running; false hides it.' },
    { name: 'onComplete', type: '() => void', description: 'Fires once when the last row lands.' },
    { name: 'aria-label', type: 'string', default: '"Web search"', description: 'Accessible name of the log.' },
    { name: 'className', type: 'string', description: 'Classes on the root.' },
  ],
  reducedMotion:
    'Rows appear without the blur, lift or height animation, the guide is drawn at once, the shimmer and star twinkle stop, marks no longer lift on hover, and the Sources list opens and closes instantly. Rows still arrive on the same schedule.',
  cleanup:
    'The ticker clears its pending timeout whenever the revealed count, run flag or pacing changes and on unmount; the Working row clears its timer on unmount; tooltips are owned by react-aria and close with their trigger.',
  acceptance:
    'After the user turn, "Ran 3 searches" lands, then the first search shimmers and its Sources row branches off with five marks; the Reddit search shows six marks and +2; the X search lands last, the Working row leaves and the answer appears. Clicking Sources sets aria-expanded to true and lists titles with domains; clicking again folds it; sending the message again replays the trail from the top.',
  criticalRegion: 'critical',
};

export default meta;
