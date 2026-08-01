import { CopyButton } from '@/components/ui/copy-button';

/* ==========================================================================
   The one-line install. Uses the absolute item URL because a bare name in
   `shadcn add` resolves against shadcn's own registry, not this one.

   Sunk rather than raised: a shell command is something you take out of the
   page, so it reads as a well cut into the surface — inset shadow, recessed
   background — where every other block on the page sits on top of it. That
   contrast is doing the work a fourth identical bordered box could not.
   ========================================================================== */
export function InstallBlock({
  slug,
  siteUrl,
  dependencies = [],
}: {
  slug: string;
  siteUrl: string;
  dependencies?: readonly string[];
}) {
  const command = `npx shadcn@latest add ${siteUrl}/r/${slug}.json`;

  return (
    <div>
      <div
        data-install
        className="flex items-center gap-3 rounded-sm border border-line bg-bg-subtle px-4 py-3 shadow-[inset_0_1px_3px_var(--k-shadow)]"
      >
        <span className="shrink-0 select-none font-mono text-[0.8125rem] text-accent">$</span>
        <code className="scrollbar-none min-w-0 flex-1 overflow-x-auto font-mono text-[0.8125rem] whitespace-nowrap text-fg">
          {command}
        </code>
        <CopyButton
          value={command}
          label="Copy"
          className="shrink-0 border-0 text-muted hover:text-fg"
        />
      </div>

      {dependencies.length === 0 ? (
        <p className="mt-3 text-[0.8125rem] text-faint">No runtime dependencies.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="meta text-faint">pulls in</span>
          {dependencies.map((dependency) => (
            <span
              key={dependency}
              className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[0.75rem] text-muted"
            >
              {dependency}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
