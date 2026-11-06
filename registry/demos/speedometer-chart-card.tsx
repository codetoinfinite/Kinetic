'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Speedometer Chart Card" (boardui.com/).
 * No BoardUI source was used.
 */

import { useState } from 'react';

import { SPEEDOMETER_RANGES, SpeedometerChartCard, type SpeedometerVariant } from '@/registry/ui/speedometer-chart-card';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

const LOOKS: readonly { id: SpeedometerVariant; label: string }[] = [
  { id: 'segments', label: 'Segments' },
  { id: 'needle', label: 'Needle' },
];

const DEVICES = (SPEEDOMETER_RANGES[0]?.items ?? []).map((item, index) => ({ id: String(index), label: item.label }));

/* Visitors by device on a half gauge. Hover a segment or a tile and the
   headline follows; click a segment to put its share in the centre. In the
   Needle look, pick a device and the needle swings to its share. */
export default function Demo() {
  const [variant, setVariant] = useState<SpeedometerVariant>('segments');
  const [primary, setPrimary] = useState(0);

  return (
    <div className="flex w-full max-w-[448px] flex-col gap-3" data-demo>
      <div className="flex flex-wrap gap-2">
        <SegmentedControl
          aria-label="Gauge look"
          selectedKeys={[variant]}
          onSelectionChange={(keys) => {
            const next = LOOKS.find((look) => keys.has(look.id));
            if (next) setVariant(next.id);
          }}
        >
          {LOOKS.map((look) => (
            <SegmentedControlItem key={look.id} id={look.id}>
              {look.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        {variant === 'needle' ? (
          <SegmentedControl
            aria-label="Device"
            selectedKeys={[String(primary)]}
            onSelectionChange={(keys) => {
              const next = DEVICES.find((device) => keys.has(device.id));
              if (next) setPrimary(Number(next.id));
            }}
          >
            {DEVICES.map((device) => (
              <SegmentedControlItem key={device.id} id={device.id}>
                {device.label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        ) : null}
      </div>
      <SpeedometerChartCard variant={variant} primary={primary} onPrimaryChange={setPrimary} />
    </div>
  );
}
