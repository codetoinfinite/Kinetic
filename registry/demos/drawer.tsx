'use client';

import { useId, useState } from 'react';
import { RiFilter3Line, RiLayoutBottomLine, RiLinkM } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { Checkbox } from '@/registry/ui/checkbox';
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerTrigger } from '@/registry/ui/drawer';

/* The two common drawers: an end-edge filter panel (it follows the reading
   direction) and a bottom sheet. Both share Modal's header, body and footer,
   so the panels differ only in edge and size. Nothing opens on its own. */

const STATUSES = ['Active', 'Trialing', 'Past due', 'Canceled'] as const;
const DEFAULT_STATUSES: readonly string[] = ['Active', 'Trialing'];
const SHARE_URL = 'https://acme.co/reports/q3-revenue';

export default function Demo() {
  const [selected, setSelected] = useState<readonly string[]>(DEFAULT_STATUSES);
  const [applied, setApplied] = useState<readonly string[]>(DEFAULT_STATUSES);
  const [copied, setCopied] = useState(false);
  const statusLabelId = useId();

  const toggle = (status: string, on: boolean) =>
    setSelected((current) => (on ? [...current, status] : current.filter((item) => item !== status)));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <DrawerTrigger onOpenChange={(open) => open && setSelected(applied)}>
          <Button variant="secondary" leadingIcon={RiFilter3Line}>
            Filters
          </Button>
          <Drawer placement="end" size="sm">
            {({ close }) => (
              <>
                <DrawerHeader title="Filters" description="Narrow the customer list." />
                <DrawerBody>
                  <div role="group" aria-labelledby={statusLabelId} className="flex flex-col gap-3">
                    <span id={statusLabelId} className="text-body-medium text-text-primary">
                      Status
                    </span>
                    {STATUSES.map((status) => (
                      <Checkbox
                        key={status}
                        isSelected={selected.includes(status)}
                        onChange={(on) => toggle(status, on)}
                      >
                        {status}
                      </Checkbox>
                    ))}
                  </div>
                </DrawerBody>
                <DrawerFooter>
                  <Button variant="secondary" onClick={() => setSelected(DEFAULT_STATUSES)}>
                    Reset
                  </Button>
                  <Button
                    onClick={() => {
                      setApplied(selected);
                      close();
                    }}
                  >
                    Apply
                  </Button>
                </DrawerFooter>
              </>
            )}
          </Drawer>
        </DrawerTrigger>

        <DrawerTrigger onOpenChange={(open) => open && setCopied(false)}>
          <Button variant="secondary" leadingIcon={RiLayoutBottomLine}>
            Bottom sheet
          </Button>
          <Drawer placement="bottom">
            {({ close }) => (
              <>
                <DrawerHeader title="Share report" description="Anyone with the link can view Q3 revenue." />
                <DrawerBody>
                  <div className="flex items-center gap-2 rounded-xl border border-border-button-default bg-background-secondary-default px-3 py-2">
                    <RiLinkM aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />
                    <span className="min-w-0 flex-1 truncate text-body-regular text-text-secondary">
                      acme.co/reports/q3-revenue
                    </span>
                  </div>
                </DrawerBody>
                <DrawerFooter>
                  <Button variant="secondary" onClick={close}>
                    Done
                  </Button>
                  <Button
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
                </DrawerFooter>
              </>
            )}
          </Drawer>
        </DrawerTrigger>
      </div>

      <p aria-live="polite" className="text-body-2-regular text-text-tertiary">
        Showing {applied.length ? applied.join(', ') : 'all'} customers
      </p>
    </div>
  );
}
