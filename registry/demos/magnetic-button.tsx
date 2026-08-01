'use client';

import { MagneticButton } from '@/registry/ui/magnetic-button';

export default function Demo() {
  return (
    <div className="flex h-full w-full items-center justify-center gap-6">
      <MagneticButton>Get in touch</MagneticButton>
      <MagneticButton strength={0.5} labelStrength={2.2} className="border-accent text-accent">
        Stronger
      </MagneticButton>
    </div>
  );
}
