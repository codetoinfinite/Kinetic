import { Rich } from '@/components/detail/rich-text';
import { cn } from '@/lib/cn';
import type { ComponentMeta } from '@/scripts/schema';

/* ==========================================================================
   Parameters and constants, as tables.
   --------------------------------------------------------------------------
   Both data sets have been structured since the schema was written — `props`
   is {name, type, default?, description} and `constants` is {name, value, why}.
   The old page had the descriptions in a cramped four-column prose table and
   the signature dumped into the rail as one unbroken monospace run, which read
   as if the data were unstructured. It never was.

   One DOM for both layouts rather than a mobile copy of the markup: the rows
   are real table rows from `md` up, and below it the display switches to
   block/inline so a row stacks as name / type = default / description. A table
   that duplicates itself for narrow screens duplicates its content to screen
   readers too, and drifts the moment one copy is edited.
   ========================================================================== */

type Prop = ComponentMeta['props'][number];
type Constant = ComponentMeta['constants'][number];

const HEAD = 'meta border-b border-line-strong pb-2.5 pr-6 text-left font-normal';
const ROW = 'block border-b border-line py-4 last:border-0 md:table-row md:py-0';
const CELL = 'md:table-cell md:py-4 md:pr-6 md:align-top';
const MONO = 'font-mono text-[0.8125rem] leading-relaxed';
const PROSE = 'block pt-2 text-[0.875rem] leading-relaxed text-muted md:pt-4';

export function ParamTable({ props, className }: { props: readonly Prop[]; className?: string }) {
  return (
    <table className={cn('w-full border-collapse text-left', className)}>
      <caption className="sr-only">Parameters</caption>
      <thead className="hidden md:table-header-group">
        <tr>
          <th scope="col" className={HEAD}>
            Parameter
          </th>
          <th scope="col" className={HEAD}>
            Type
          </th>
          <th scope="col" className={HEAD}>
            Default
          </th>
          <th scope="col" className={cn(HEAD, 'pr-0')}>
            Description
          </th>
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {props.map((prop) => (
          <tr key={prop.name} className={ROW}>
            <th scope="row" className={cn('block font-normal', CELL, MONO, 'text-fg md:whitespace-nowrap')}>
              {prop.name}
            </th>
            <td className={cn('inline', CELL, MONO, 'break-words text-muted')}>{prop.type}</td>
            <td className={cn('inline', CELL, MONO, 'text-faint')}>
              {prop.default === undefined ? (
                <span className="hidden md:inline">—</span>
              ) : (
                <>
                  <span className="text-faint md:hidden"> = </span>
                  {prop.default}
                </>
              )}
            </td>
            <td className={cn(CELL, PROSE, 'md:pr-0')}>
              <Rich>{prop.description}</Rich>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ConstantTable({
  constants,
  className,
}: {
  constants: readonly Constant[];
  className?: string;
}) {
  return (
    <table className={cn('w-full border-collapse text-left', className)}>
      <caption className="sr-only">Load-bearing constants</caption>
      <thead className="hidden md:table-header-group">
        <tr>
          <th scope="col" className={HEAD}>
            Constant
          </th>
          <th scope="col" className={HEAD}>
            Value
          </th>
          <th scope="col" className={cn(HEAD, 'pr-0')}>
            Why this number
          </th>
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {constants.map((constant) => (
          <tr key={constant.name} className={ROW}>
            <th scope="row" className={cn('block font-normal', CELL, MONO, 'text-fg md:whitespace-nowrap')}>
              {constant.name}
            </th>
            <td className={cn('inline', CELL, MONO, 'text-accent')}>
              <span className="text-faint md:hidden"> = </span>
              {constant.value}
            </td>
            <td className={cn(CELL, PROSE, 'md:pr-0')}>
              <Rich>{constant.why}</Rich>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
