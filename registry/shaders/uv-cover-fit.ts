/* ==========================================================================
   Cover-Fit UV Maths — GLSL as TypeScript template literals.
   --------------------------------------------------------------------------
   `object-fit: cover`, done in UV space. CSS solves this by cropping the box;
   a shader has no box to crop, so the crop has to happen on the coordinates
   before the sample. Two lines of ratio arithmetic and one offset, and a
   texture of any aspect fills a quad of any aspect with no stretching and no
   letterbox.

   The result is a pure function of two numbers — the texture's aspect and the
   quad's aspect — which means the quad can be resized every frame and the fit
   simply follows. No re-upload, no second texture, no CPU work at all.
   ========================================================================== */

export const uvCoverFitVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const uvCoverFitFragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform float uTextureAspect;
uniform float uPlaneAspect;
uniform float uOverscan;
uniform vec2  uFocal;

varying vec2 vUv;

void main() {
  // Only ever shrink the sampled window, never grow it. Whichever axis has
  // surplus texture gets narrowed by the ratio of the two aspects; the other
  // axis stays at 1.0 and reaches the full edge of the image. Scaling the
  // short axis UP instead would sample outside [0,1] and repeat or clamp.
  vec2 scale = vec2(1.0);
  if (uTextureAspect > uPlaneAspect) {
    scale.x = uPlaneAspect / uTextureAspect;   // texture is wider: crop the sides
  } else {
    scale.y = uTextureAspect / uPlaneAspect;   // texture is taller: crop top and bottom
  }

  // Optional zoom-in. Dividing shrinks the window further, which leaves crop
  // margin on every side — the reserve a vertex displacement can eat into
  // before the texture's own clamped border smears along an edge.
  scale /= max(uOverscan, 0.0001);

  // (1 - scale) is exactly the slack left over. Multiplying it by the focal
  // point places that slack: 0.5 centres the crop, 0.0 pins it to the left or
  // top edge, 1.0 to the right or bottom.
  vec2 offset = (1.0 - scale) * uFocal;

  gl_FragColor = texture2D(uTexture, vUv * scale + offset);

  // ShaderMaterial gets no automatic output conversion — three only injects
  // this chunk into its own materials. Without it every colour ships raw
  // linear values into an sRGB framebuffer and the whole scene looks washed.
  #include <colorspace_fragment>
}
`;
