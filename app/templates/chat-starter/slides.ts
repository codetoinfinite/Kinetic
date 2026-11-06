import type { AuthMediaSlide } from '@/registry/ui/auth-card';

/* Generated artwork for the sign-up carousel: no photographs ship with the
   starter, so each slide is an SVG of layered gradients, inlined as a data
   URI (percent-encoded, not base64). */
function slide(base: [string, string], glow: [string, string]): AuthMediaSlide {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${base[0]}"/><stop offset="1" stop-color="${base[1]}"/></linearGradient>
<radialGradient id="g1" cx=".25" cy=".3" r=".6"><stop offset="0" stop-color="${glow[0]}" stop-opacity=".9"/><stop offset="1" stop-color="${glow[0]}" stop-opacity="0"/></radialGradient>
<radialGradient id="g2" cx=".8" cy=".75" r=".55"><stop offset="0" stop-color="${glow[1]}" stop-opacity=".85"/><stop offset="1" stop-color="${glow[1]}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="800" height="1000" fill="url(#b)"/><rect width="800" height="1000" fill="url(#g1)"/><rect width="800" height="1000" fill="url(#g2)"/>
</svg>`;
  return { src: `data:image/svg+xml,${encodeURIComponent(svg)}` };
}

export const GRADIENT_SLIDES: AuthMediaSlide[] = [
  slide(['#1e1b4b', '#0f172a'], ['#f472b6', '#38bdf8']),
  slide(['#14532d', '#022c22'], ['#facc15', '#2dd4bf']),
  slide(['#7c2d12', '#1c1917'], ['#fb923c', '#e879f9']),
  slide(['#0c4a6e', '#082f49'], ['#a5b4fc', '#34d399']),
];
