'use client';

import { VertexCylinderBend } from '@/registry/ui/vertex-cylinder-bend';

export default function Demo() {
  return (
    <div className="relative flex h-full w-full flex-col justify-between bg-bg">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <p className="text-sm tracking-tight text-fg">Curved Marquee</p>
        <p className="meta">01 / Vertex</p>
      </div>
      <div className="min-h-0 flex-1">
        <VertexCylinderBend />
      </div>
      <p className="meta border-t border-line px-4 py-3">
        One plane. Curvature lives in a uniform.
      </p>
    </div>
  );
}
