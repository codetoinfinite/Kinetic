/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Limits Card" (boardui.com/components/agent-limits-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agent-limits-card',
  title: 'Agent Limits Card',
  category: 'display',
  kit: 'boardui',
  tags: ['agent', 'usage', 'meter', 'tokens', 'ai', 'boardui'],
  blurb:
    'An agent budget card: a context window bar split by token bucket, an expandable breakdown, and plan limits with reset times.',
  cost: 'css',
  motif: 'stack',
  files: [{ path: 'registry/ui/agent-limits-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],
  summary:
    'A usage card for an agent session. The top row reads used / capacity with a percent, over a thin bar split into one coloured segment per token bucket. Opening the row grows the card to list each bucket with its tokens and share, free space, deferred buckets that do not count, and collapsible member lists. Below it, each plan limit shows its reset time, percent used and a progress bar, and the plan heading links to plan settings.',
  mechanism: [
    'summarizeContext sums only non-deferred buckets, so deferred tools are listed with a dash but never move the bar, the total or free space; segment widths divide by max(capacity, used) so an overflowing window still ends at the bar edge.',
    'Bucket colours come from the chart tokens in a fixed order (blue, purple, pink, yellow, green, sky, teal, lime, indigo); the counter skips deferred buckets, which take the neutral chart colour, and a bucket can pass its own colour.',
    'The breakdown and every group list open with a grid-template-rows 0fr → 1fr transition on a wrapper with min-h-0 overflow-hidden, so the card grows to its natural height without measuring; closed content is inert and turns visibility-hidden once the close transition ends.',
    'Hovering a bar segment or a breakdown row fades every other segment and row, linking the two views.',
    'Each limit is a role="meter" with aria-valuetext carrying the reset copy; its bar switches to the warning tone at 75% and the error tone at 90%.',
  ],
  constants: [
    { name: 'WARN_AT', value: '0.75', why: 'A limit three-quarters used is worth a glance; the bar turns the warning colour.' },
    { name: 'DANGER_AT', value: '0.9', why: 'Past 90% the bar and the percent switch to the error colour.' },
    { name: 'BUCKET_PALETTE', value: 'chart-6, 5, 3, 8, 7, 4, 1, 2, 9', why: 'Neighbouring buckets get colours far apart on the wheel, so thin segments stay distinguishable.' },
  ],
  pitfalls: [
    'Deferred buckets are excluded from the used total; pass them for the listing only, not as part of the capacity maths.',
    'With maxBreakdownHeight the breakdown scrolls, so focus rings inside it are inset to avoid being clipped.',
    'Share percentages use the capacity even when the window overflows, so they can add up past 100%.',
  ],
  notes: [
    'Pass planHref for a link or onManagePlan for a button; with neither, the plan heading is plain text.',
    'formatTokens and summarizeContext are exported for use in tooltips or server summaries.',
  ],
  apiSignature:
    '<AgentLimitsCard context={{ capacity: 1_000_000, buckets, groups }} plan="Max (5x)" limits={[{ label: "5-hour limit", used: 0.38, resets: "Resets in 2 hr 46 min" }]} planHref="/settings/plan" />',
  props: [
    { name: 'context', type: '{ capacity: number; buckets: ContextBucket[]; groups?: ContextGroup[] }', description: 'Window size, token buckets ({ label, tokens, color?, deferred? }) and collapsible member groups.' },
    { name: 'plan', type: 'string', description: 'Plan name shown after the limits title.' },
    { name: 'limits', type: 'PlanLimit[]', default: '[]', description: 'Rows of { label, used (0–1), resets }.' },
    { name: 'planHref', type: 'string', description: 'Makes the plan heading a link.' },
    { name: 'onManagePlan', type: '() => void', description: 'Makes the plan heading a button when there is no planHref.' },
    { name: 'expanded / defaultExpanded / onExpandedChange', type: 'boolean / boolean / (open: boolean) => void', default: 'false', description: 'Controlled or uncontrolled breakdown.' },
    { name: 'maxBreakdownHeight', type: 'number', description: 'Caps the breakdown height in px; longer lists scroll inside the card.' },
    { name: 'contextTitle / limitsTitle', type: 'string', default: '"Context window" / "Plan usage limits"', description: 'Section headings.' },
    { name: 'className', type: 'string', description: 'Classes on the card.' },
  ],
  reducedMotion:
    'The breakdown and group lists open and close instantly, chevrons snap, and bar segments and limit fills jump to their new widths without transitions.',
  cleanup: 'No timers, listeners or observers; all motion is CSS transitions on state changes.',
  acceptance:
    'The header reads 820k / 1M (82%); clicking it reveals Messages 520k 52.0%, the deferred rows with a dash and Free space 180k 18.0%; opening MCP tools lists its four members; the plan heading calls onManagePlan; sending a message widens the Messages segment and raises the 5-hour limit.',
  criticalRegion: 'critical',
};

export default meta;
