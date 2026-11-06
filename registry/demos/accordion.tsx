'use client';

import { RiBankCardLine, RiNotification3Line, RiShieldKeyholeLine } from '@remixicon/react';
import { Accordion, AccordionItem } from '@/registry/ui/accordion';

/* BoardUI shows the accordion as its landing FAQ: the contained tray with a
   plus indicator and the first answer open. Beside it, the separated variant
   as a settings page uses it, with icons, descriptions and several open at once. */
const FAQ = [
  {
    id: 'billing',
    title: 'How does billing work?',
    body: 'Plans are billed monthly for every active seat. Invited members are free until they accept, and you can switch to annual billing from Settings at any time.',
  },
  {
    id: 'plans',
    title: 'Can I change plans later?',
    body: 'Upgrades apply right away and are prorated for the rest of the month. Downgrades take effect at the start of your next billing cycle.',
  },
  {
    id: 'data',
    title: 'What happens to my data if I cancel?',
    body: 'Your workspace stays readable for 30 days, so you can export boards and reports. After that it is deleted for good.',
  },
  {
    id: 'security',
    title: 'Is my data encrypted?',
    body: 'Yes. Data is encrypted in transit with TLS 1.3 and at rest with AES-256, and backups are kept in a separate region.',
  },
];

export default function Demo() {
  return (
    <div className="flex w-full items-start justify-center p-4 sm:p-8">
      <div className="grid w-full max-w-[1040px] grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1 px-1">
            <p className="text-caption-1-medium text-text-tertiary">FAQ</p>
            <h3 className="text-title-3-semibold text-text-primary">Questions, answered</h3>
          </div>
          <Accordion variant="contained" indicator="plus" defaultExpandedKeys={['billing']}>
            {FAQ.map((item) => (
              <AccordionItem key={item.id} id={item.id} title={item.title}>
                <p>{item.body}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1 px-1">
            <p className="text-caption-1-medium text-text-tertiary">Settings</p>
            <h3 className="text-title-3-semibold text-text-primary">Workspace preferences</h3>
          </div>
          <Accordion variant="separated" allowsMultipleExpanded defaultExpandedKeys={['alerts']}>
            <AccordionItem
              id="alerts"
              icon={RiNotification3Line}
              title="Notifications"
              description="Email digests, mentions and deadline reminders"
              headingLevel={4}
            >
              <ul className="flex flex-col gap-2">
                <li className="flex items-center justify-between gap-3">
                  <span>Daily digest</span>
                  <span className="text-text-primary">8:00 AM</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Mentions</span>
                  <span className="text-text-primary">Instantly</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Deadline reminders</span>
                  <span className="text-text-primary">1 day before</span>
                </li>
              </ul>
            </AccordionItem>
            <AccordionItem
              id="security"
              icon={RiShieldKeyholeLine}
              title="Security"
              description="Two-factor sign-in and active sessions"
              headingLevel={4}
            >
              <p>Two-factor sign-in is on for all 12 members. 3 sessions are active, the most recent from Chrome on macOS.</p>
            </AccordionItem>
            <AccordionItem
              id="payment"
              icon={RiBankCardLine}
              title="Billing"
              description="Pro plan, renews on the 1st"
              headingLevel={4}
            >
              <p>Visa ending in 4242 is charged $96.00 a month for 8 seats. Invoices go to finance@boardly.co.</p>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
