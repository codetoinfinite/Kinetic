/* ==========================================================================
   In-Shader Mouse Bulge — GLSL as TypeScript template literals.
   --------------------------------------------------------------------------
   The pointer is a screen-space thing and the mesh is a world-space thing, so
   somebody has to convert. The usual answer is a raycast on the CPU, which
   gives you one hit point and costs a matrix inversion per frame.

   This does the opposite and cheaper thing: it projects each VERTEX into
   screen space and compares it against the pointer there. Every vertex gets
   its own distance, so the falloff is exact even on a surface the CPU thinks
   is flat, and the only cost is one extra matrix multiply per vertex.
   ========================================================================== */

export const ndcMouseBulgeVertexShader = /* glsl */ `
uniform vec2  uMouseNdc;
uniform float uAspect;
uniform float uStrength;
uniform float uFalloff;
uniform float uLift;

varying vec2  vUv;
varying float vBulge;

void main() {
  vec3 pos = position;

  // Projection one, the probe. This answers 'where does this vertex land on
  // screen right now', which is the only way to measure a screen-space
  // pointer against a mesh without leaving the GPU.
  vec4 probe = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vec2 ndc = probe.xy / probe.w;

  // NDC is -1..1 on both axes regardless of the viewport, so a raw distance
  // is stretched by the aspect ratio: on a 16:9 canvas an unweighted circle
  // is an ellipse 1.78 times too wide. Weighting x by the aspect makes the
  // falloff round on screen.
  vec2 delta = vec2((ndc.x - uMouseNdc.x) * uAspect, ndc.y - uMouseNdc.y);

  // Gaussian, not a linear or smoothstep falloff. It never reaches zero, so
  // there is no ring where the deformation visibly stops, and its own
  // derivative is smooth, so the highlight has no hard edge either.
  float bulge = exp(-dot(delta, delta) * uFalloff) * uStrength;

  pos.z += bulge * uLift;
  vBulge = bulge;

  vUv = uv;
  // Projection two, the one that actually ships the vertex, after the
  // displacement the first projection made possible.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const ndcMouseBulgeFragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform float uMagnify;
uniform float uSheen;

varying vec2  vUv;
varying float vBulge;

void main() {
  // Push the centred UV outward by the same weight that lifted the vertex.
  // Displacement alone is a bump; displacement plus magnification is a lens,
  // and the difference is what makes it read as glass over the surface rather
  // than a dent in it.
  vec2 centered = vUv - 0.5;
  vec2 lensed = vUv + centered * vBulge * uMagnify;

  vec4 texel = texture2D(uTexture, clamp(lensed, 0.0, 1.0));

  // A little extra light at the crown of the bulge. Cheap, and it is what
  // sells the surface as curved rather than merely offset.
  gl_FragColor = vec4(texel.rgb * (1.0 + vBulge * uSheen), texel.a);

  // ShaderMaterial gets no automatic output conversion — three only injects
  // this chunk into its own materials. Without it every colour ships raw
  // linear values into an sRGB framebuffer and the whole scene looks washed.
  #include <colorspace_fragment>
}
`;
