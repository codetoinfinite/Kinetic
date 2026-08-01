/* ==========================================================================
   Velocity Afterimage Pass — GLSL as TypeScript template literals.
   --------------------------------------------------------------------------
   A motion trail with no history buffer and no particle list. Two render
   targets take turns: one holds everything that has happened so far, the
   other receives that same accumulation multiplied by a decay factor with
   the current frame composited over it. Next frame they swap.

   Because the trail is a texture rather than a list of past positions, its
   length is a single float. Driving that float from pointer speed is what
   makes fast movement smear and slow movement stay crisp.
   ========================================================================== */

export const velocityAfterimageVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const velocityAfterimageFragmentShader = /* glsl */ `
uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform float uDamp;
uniform float uCutoff;

varying vec2 vUv;

void main() {
  vec4 current = texture2D(uCurrent, vUv);
  vec4 history = texture2D(uHistory, vUv);

  // Decay, with a floor. Multiplying by uDamp alone is a geometric series that
  // never actually reaches zero: at 0.9 a pixel still holds 0.5% of its
  // original value a hundred frames later, so on a half-float target a faint
  // ghost of the very first frame is baked in permanently. The step() zeroes
  // anything already below the cutoff instead of letting it crawl toward it.
  float alive = step(uCutoff, history.a);
  history *= uDamp * alive;

  // max(), not mix() or additive. mix() would dim the current frame in
  // proportion to the trail behind it, so the head of the trail goes dark
  // exactly when it is moving fastest; additive blows out to white wherever
  // the path crosses itself. max() keeps the head at full strength and lets
  // the tail sit underneath.
  gl_FragColor = max(current, history);

  // Deliberately no colorspace conversion here. This pass writes into another
  // render target, which stays in linear working space; converting to sRGB now
  // and again on the final blit would brighten the trail on every single
  // accumulation until the whole frame is white.
}
`;
