'use client';

import { useState, type MouseEvent } from 'react';
import { RiArrowRightSLine, RiDownload2Line, RiExternalLinkLine } from '@remixicon/react';

import { LinkButton } from '@/registry/ui/link-button';

/* The demo stays on the page, so anchors cancel their default action. */
const stay = (event: MouseEvent<HTMLAnchorElement>) => event.preventDefault();

/* BoardUI's pair first (anchor form), then the three sizes, then the button
   form doing real work inside a sentence, and finally the disabled anchor. */
export default function Demo() {
  const [sent, setSent] = useState(0);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <LinkButton href="#" onClick={stay} trailingIcon={RiArrowRightSLine}>
          View documentation
        </LinkButton>
        <LinkButton href="#" onClick={stay} variant="secondary" trailingIcon={RiArrowRightSLine}>
          Browse components
        </LinkButton>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <LinkButton size="medium" leadingIcon={RiDownload2Line}>
          Download CSV
        </LinkButton>
        <LinkButton size="small" leadingIcon={RiDownload2Line}>
          Download CSV
        </LinkButton>
        <LinkButton size="xs" leadingIcon={RiDownload2Line}>
          Download CSV
        </LinkButton>
      </div>

      <p className="text-body-regular text-text-secondary">
        Didn&apos;t get the code?{' '}
        <LinkButton size="small" onClick={() => setSent((n) => n + 1)}>
          Resend code
        </LinkButton>
        <span aria-live="polite" className="ms-2 text-caption-1-medium text-text-tertiary">
          {sent > 0 ? `Sent ${sent}×` : ''}
        </span>
      </p>

      <LinkButton href="#" variant="secondary" trailingIcon={RiExternalLinkLine} disabled>
        Billing portal (admins only)
      </LinkButton>
    </div>
  );
}
