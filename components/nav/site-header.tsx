import { MANIFEST } from '@/__generated__/manifest';
import { HeaderBar } from '@/components/nav/header-bar';

/**
 * A server component whose only job is to keep MANIFEST out of the client
 * bundle. The bar needs scroll and disclosure state, so the interactive part
 * lives in `header-bar.tsx`; the boundary sits here, at the single number that
 * has to cross it, instead of one import higher where the whole generated
 * catalogue would come with it.
 */
export function SiteHeader() {
  return <HeaderBar componentCount={MANIFEST.length} />;
}
