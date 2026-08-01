/* ==========================================================================
   Layout Lerp Scalar — GLSL, as TypeScript template literals.
   --------------------------------------------------------------------------
   Shipped as .ts and not .glsl on purpose: a .glsl import forces every
   consumer to install and configure a bundler plugin before the component
   will compile, while a template literal is a plain module every bundler
   already understands.

   The notable thing about this pair is how little it knows. The layout — row,
   column, drum, fan and every blend between them — happens entirely on the
   CPU, as scalars written into mesh.position, mesh.rotation and mesh.scale.
   The vertex shader is the default transform and nothing else, which is what
   keeps frustum culling and three's transparency sort telling the truth: both
   read the CPU-side matrix, and here the CPU-side matrix is where the card
   actually is.

   So the fragment shader is free to be the whole picture. It draws a card —
   rounded rectangle, gradient, hairlines, rim — from six uniforms and no
   texture, so the component ships no image and fetches nothing.
   ========================================================================== */

export const layoutLerpScalarVertexShader = /* glsl */ `
varying vec2  vUv;
varying float vFacing;

void main() {
  vUv = uv;

  // How square-on this card is to the camera, straight from the transformed
  // normal. Cards turning edge-on around the drum darken with no light in the
  // scene and no second pass -- one dot product standing in for shading.
  // abs() because the material is double-sided and the back face's normal
  // points away.
  vec3 n = normalize(normalMatrix * normal);
  vFacing = abs(n.z);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const layoutLerpScalarFragmentShader = /* glsl */ `
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uAspect;
uniform float uCorner;
uniform float uFocus;
uniform float uOpacity;

varying vec2  vUv;
varying float vFacing;

/* Signed distance to a rounded rectangle, in units of card height: negative
   inside, zero on the edge. Cheaper and sharper than a corner-radius texture,
   and it stays crisp at any scale because the card is drawn, not sampled. */
float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  // Local space where y spans 1.0 and x spans the aspect, so one corner
  // radius is the same number of world units on both axes.
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  vec2 ext = vec2(uAspect, 1.0) * 0.5;
  float d = sdRoundedBox(p, ext, uCorner);

  // One pixel, measured in the same units as d. fwidth is core in WebGL2, and
  // the max() keeps smoothstep well-formed if a driver ever hands back 0.
  float aa = max(fwidth(d), 1e-4);
  float mask = 1.0 - smoothstep(-aa, aa, d);
  if (mask < 0.002) discard;

  float ramp = clamp(vUv.y * 0.92 + (vUv.x - 0.5) * 0.22 + 0.04, 0.0, 1.0);
  vec3 color = mix(uColorB, uColorA, ramp);

  // Hairlines. A smooth gradient hides rotation completely -- there has to be
  // structure on the card for the eye to read the turn of the drum.
  float ticks = vUv.y * 9.0;
  float toLine = 0.5 - abs(fract(ticks) - 0.5);
  float lineWidth = fwidth(ticks) * 1.1;
  color += (1.0 - smoothstep(0.0, lineWidth, toLine)) * 0.055;

  // Inset rim, one pixel wide, at 0.5% of card height in from the edge.
  float rim = 1.0 - smoothstep(0.0, aa * 2.0, abs(d + 0.005));
  color = mix(color, vec3(1.0), rim * 0.16);

  // Out-of-focus cards lose light and colour rather than blurring: a real
  // blur needs a render target, and desaturating toward luminance reads the
  // same at this size for one dot product.
  float grey = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(grey), color, mix(0.25, 1.0, uFocus));
  color *= mix(0.36, 1.0, uFocus);
  color *= mix(0.52, 1.0, vFacing);

  gl_FragColor = vec4(color, mask * uOpacity * mix(0.24, 1.0, uFocus));

  // ShaderMaterial gets no automatic output conversion -- three only injects
  // this chunk into its own materials. Without it every colour ships raw
  // linear values into an sRGB framebuffer and the scene looks washed out.
  #include <colorspace_fragment>
}
`;
