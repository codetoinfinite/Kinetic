import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Every route in this site is statically derivable from the registry, so the
  // whole thing prerenders. Nothing here reads a request.
  reactStrictMode: true,

  // three/gsap/ogl ship untranspiled ESM that Turbopack handles natively, but
  // the transitive `three/examples/jsm/*` deep imports need to stay external
  // from the server graph — none of them are used during SSR.
  serverExternalPackages: ['three', 'ogl'],

  typescript: {
    // `pnpm verify` runs `tsc --noEmit` as its own gate; letting the build
    // re-run it doubles a slow step for no extra signal.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
