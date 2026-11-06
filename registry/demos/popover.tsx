'use client';

import { useState } from 'react';
import { RiInformationLine, RiLinkM, RiShareForwardLine } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { Popover, PopoverFooter, PopoverHeader, PopoverTrigger } from '@/registry/ui/popover';

/* An info popover with the caret, as on a metric card, and a small share
   form without one, flipped to open above its trigger. Press a trigger to
   open; press it again, press outside, or hit Escape to close. */

const SHARE_URL = 'https://acme.co/dashboards/revenue';

export default function Demo() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[320px] flex-col gap-1 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-medium text-text-secondary">Net revenue retention</span>
          <PopoverTrigger>
            <Button variant="secondary" size="small" leadingIcon={RiInformationLine}>
              Details
            </Button>
            <Popover showArrow placement="bottom">
              <PopoverHeader
                title="Net revenue retention"
                description="Revenue kept from existing customers over 12 months, upgrades included and churn taken out."
              />
            </Popover>
          </PopoverTrigger>
        </div>
        <span className="text-title-3-medium text-text-primary">112%</span>
      </div>

      <PopoverTrigger onOpenChange={(open) => open && setCopied(false)}>
        <Button variant="secondary" leadingIcon={RiShareForwardLine}>
          Share
        </Button>
        <Popover placement="top">
          {({ close }) => (
            <>
              <PopoverHeader title="Share dashboard" description="Anyone in Acme with the link can view it." />
              <div className="flex items-center gap-2 rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2">
                <RiLinkM aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
                <span className="min-w-0 flex-1 truncate text-body-regular text-text-secondary">
                  acme.co/dashboards/revenue
                </span>
              </div>
              <PopoverFooter>
                <Button variant="secondary" size="small" onClick={close}>
                  Done
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    // Clipboard access can be refused (permissions, iframes); never surface that as an error.
                    navigator.clipboard?.writeText(SHARE_URL).then(
                      () => setCopied(true),
                      () => setCopied(false),
                    );
                  }}
                >
                  {copied ? 'Link copied' : 'Copy link'}
                </Button>
              </PopoverFooter>
            </>
          )}
        </Popover>
      </PopoverTrigger>
    </div>
  );
}
