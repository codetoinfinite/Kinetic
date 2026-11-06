'use client';

import { useState } from 'react';
import { RiMailLine, RiMoonLine, RiShieldCheckLine, RiSmartphoneLine } from '@remixicon/react';

import { SwitchCard } from '@/registry/ui/switch-card';

/* Notification settings: each card is the switch, so a click anywhere on it
   toggles. The last card is locked on by an admin policy. */
export default function Demo() {
  const [prefs, setPrefs] = useState({ email: true, push: false, quiet: true });

  const toggle = (key: keyof typeof prefs) => (value: boolean) =>
    setPrefs((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-2">
      <p className="text-body-medium text-text-primary">Notifications</p>
      <SwitchCard
        icon={RiMailLine}
        title="Email digest"
        description="A summary of mentions and replies every morning."
        isSelected={prefs.email}
        onChange={toggle('email')}
      />
      <SwitchCard
        icon={RiSmartphoneLine}
        title="Push notifications"
        description="Alerts on your phone when someone assigns you."
        isSelected={prefs.push}
        onChange={toggle('push')}
      />
      <SwitchCard
        icon={RiMoonLine}
        title="Quiet hours"
        description="Pause everything from 22:00 to 08:00."
        isSelected={prefs.quiet}
        onChange={toggle('quiet')}
      />
      <SwitchCard
        icon={RiShieldCheckLine}
        title="Security alerts"
        description="Required by your workspace admin."
        isSelected
        isDisabled
      />
    </div>
  );
}
