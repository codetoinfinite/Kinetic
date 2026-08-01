import { CopyButton } from '@/components/ui/copy-button';
import { highlight } from '@/lib/highlight';

/**
 * A single highlighted block for prose. Async server component: the grammar
 * and both themes stay on the server, the browser gets HTML.
 */
export async function CodeBlock({
  code,
  lang = 'bash',
  copy = true,
}: {
  code: string;
  lang?: string;
  copy?: boolean;
}) {
  const html = await highlight(code, lang);

  return (
    // Rendered as a sibling of `.prose`, never inside it — `.prose pre` would
    // otherwise add a second border and a second set of padding.
    <div className="relative border border-line bg-bg-subtle">
      {copy ? (
        <div className="absolute right-2 top-2 z-10">
          <CopyButton value={code} label="Copy" />
        </div>
      ) : null}
      <div
        className="scrollbar-none overflow-x-auto p-4 text-[0.8125rem] leading-[1.7] [&_pre]:bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
