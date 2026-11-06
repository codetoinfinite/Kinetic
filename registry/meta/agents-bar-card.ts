/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agents Bar Card" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agents-bar-card',
  title: 'Agents Bar Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'bars', 'agents', 'usage', 'month', 'boardui'],
  blurb:
    'One purple bar per agent for a month, grey stubs for idle ones; hover or arrow keys highlight a bar and show its avatar, name and value.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/agents-bar-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The agents card of an AI profile. A grey card shows "Agents", the number of agents that ran this month and a bordered month switcher, then a row of thin purple bars, one per agent. Agents that did not run sit on the baseline as short grey stubs. A readout row above the bars shows an avatar, name and value: the busiest agent by default, the hovered or focused one while you explore.',

  mechanism: [
    'The bars are plain flex columns, no chart library. Each column fills the 160px chart height as its hit area, and the bar inside is sized as a percentage of the month\'s maximum with a 6px floor, so small values stay visible. Idle agents render a fixed 3px stub in `chart-neutral`; busy ones use `chart-agents-bar`, and the active one switches to `chart-agents-bar-active`.',
    'Height changes are a 300ms CSS transition, so paging months makes the bars grow and shrink in place; the highlight colour follows the pointer in 120ms. `motion-reduce:transition-none` turns both off.',
    'The bar row is a single `role="slider"` over the agent index: one tab stop instead of thirty. ArrowLeft and ArrowRight step, Home and End jump, Escape clears; `aria-valuetext` reads "Nova: 1,250 runs". Pointer enter on a column sets the same active index, and leaving the row or blurring it clears it, so mouse and keyboard highlight identically.',
    'The readout uses the kit Avatar (24px, tinted by the agent\'s colour), the name, the value and a rank caption ("#3 of 30"); with nothing active it shows the busiest agent labelled "Most active". It is `aria-hidden` because the slider already announces the same text.',
    'The month switcher is a bordered pill of two ghost icon Buttons around the month name, disabled at either end; the name is `aria-live` so a screen reader hears the new month. The card works controlled (`month`) or uncontrolled (`defaultMonth`, the last month by default).',
  ],

  constants: [
    {
      name: 'chart height',
      value: '160px (h-40), bars from a 6px floor to 100% of the month max',
      why: 'Tall enough to rank thirty agents by eye; the floor keeps a 1% agent from vanishing into the baseline.',
    },
    {
      name: 'gaps',
      value: '3px below sm, 6px from sm, 3px top radius',
      why: 'Thirty bars still fit a 360px phone at about 7px each, and open up into the reference rhythm on wider cards.',
    },
    {
      name: 'idle stub',
      value: '3px chart-neutral',
      why: 'Shows the agent exists but did nothing, rather than leaving a gap that reads as missing data.',
    },
    {
      name: 'transition',
      value: '300ms ease-out on height, 120ms on colour',
      why: 'Long enough to follow which agents rose or fell between months; the highlight is quicker so it keeps up with a sweeping pointer.',
    },
  ],

  pitfalls: [
    'Making every bar a button. Thirty tab stops to cross one chart is hostile to keyboard users; one slider with arrow keys is the same information in one stop.',
    'Highlighting on hover only. Keyboard users then never see the readout; the active index is shared by pointer and keys.',
    'Scaling bars to a fixed maximum across months. A quiet month then looks empty; each month scales to its own busiest agent, and the readout gives the absolute numbers.',
    'Dropping idle agents from the row. Bars then shift position between months and the same agent lands in a different place; keep every agent and stub the idle ones.',
  ],

  notes: [
    'Order agents by creation date (as the demo does, with "Oldest" and "Newest" captions) so a bar keeps its place month to month.',
    'Use `unit` and `formatValue` for tokens or minutes instead of runs.',
  ],

  apiSignature:
    'function AgentsBarCard(props: AgentsBarCardProps): JSX.Element\ninterface AgentsBarCardProps extends Omit<HTMLAttributes<HTMLElement>, "children"> { title?: string; months: AgentMonth[]; month?: string; defaultMonth?: string; onMonthChange?: (id: string) => void; unit?: string; formatValue?: (value: number) => string; startLabel?: string; endLabel?: string; ref?: Ref<HTMLElement> }\ninterface AgentMonth { id: string; label: string; agents: AgentUsage[] }\ninterface AgentUsage { id: string; name: string; initials?: string; color?: "neutral" | "blue" | "lime" | "pink"; value: number }',

  props: [
    { name: 'title', type: 'string', default: '"Agents"', description: 'Caption above the headline and part of the chart label.' },
    { name: 'months', type: 'AgentMonth[]', description: 'Months in order, each with its label and per-agent values.' },
    { name: 'month', type: 'string', description: 'Controlled month id.' },
    { name: 'defaultMonth', type: 'string', default: 'last month', description: 'Initial month when uncontrolled.' },
    { name: 'onMonthChange', type: '(id: string) => void', description: 'Called when the switcher pages to another month.' },
    { name: 'unit', type: 'string', default: '"runs"', description: 'Word after values.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'en-US grouping', description: 'Formats values in the readout and label.' },
    { name: 'startLabel', type: 'string', description: 'Caption under the first bar.' },
    { name: 'endLabel', type: 'string', description: 'Caption under the last bar.' },
  ],

  reducedMotion:
    'With prefers-reduced-motion the bars jump to their new heights and colours without the 300ms and 120ms transitions. Nothing else moves.',

  cleanup:
    'No timers, observers or global listeners. Pointer and keyboard handlers live on the chart element and go away with it.',

  acceptance:
    'The card shows "Agents", "22 agents", a "December" switcher and thirty bars with eight grey stubs; the readout shows Cipher, 1,400 runs, "Most active". Hovering a bar turns it the darker purple and the readout shows that agent and its rank. Focusing the chart and pressing Home selects Atlas (620 runs). The previous button goes to November and October and is disabled there. At 360px all thirty bars still fit.',

  criticalRegion: 'critical',
};

export default meta;
