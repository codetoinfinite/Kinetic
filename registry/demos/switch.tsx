'use client';

import { useState } from 'react';

import { Switch, type SwitchShape, type SwitchSize } from '@/registry/ui/switch';

const SIZES: SwitchSize[] = ['sm', 'md', 'lg'];
const SHAPES: SwitchShape[] = ['pill', 'rectangle'];

/* A settings card with labelled switches (one locked on), next to a grid of
   every size in both shapes. Every switch is controlled. */
export default function Demo() {
  const [settings, setSettings] = useState({ email: true, autosave: false, cursors: true });
  const [grid, setGrid] = useState<Record<string, boolean>>({
    'pill-sm': false,
    'pill-md': true,
    'pill-lg': true,
    'rectangle-sm': true,
    'rectangle-md': false,
    'rectangle-lg': true,
  });

  const toggleSetting = (key: keyof typeof settings) => (value: boolean) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-x-14 gap-y-8">
      <div className="flex w-full max-w-[300px] flex-col gap-4 rounded-2lg border border-border-button-default bg-background-primary-default p-5 shadow-xs">
        <p className="text-caption-1-medium text-text-tertiary">Workspace</p>
        <Switch isSelected={settings.email} onChange={toggleSetting('email')}>
          Email notifications
        </Switch>
        <Switch isSelected={settings.autosave} onChange={toggleSetting('autosave')}>
          Auto-save drafts
        </Switch>
        <Switch isSelected={settings.cursors} onChange={toggleSetting('cursors')}>
          Show teammates&apos; cursors
        </Switch>
        <Switch isSelected isDisabled>
          Two-factor sign-in (required)
        </Switch>
      </div>

      <div className="flex flex-col gap-5">
        {SHAPES.map((shape) => (
          <div key={shape} className="flex items-center gap-6">
            <span className="w-20 text-caption-1-medium text-text-tertiary capitalize">{shape}</span>
            {SIZES.map((size) => {
              const id = `${shape}-${size}`;
              return (
                <Switch
                  key={id}
                  size={size}
                  shape={shape}
                  aria-label={`${shape} switch, size ${size}`}
                  isSelected={grid[id] ?? false}
                  onChange={(value) => setGrid((prev) => ({ ...prev, [id]: value }))}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
