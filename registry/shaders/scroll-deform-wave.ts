/* ==========================================================================
   Scroll Deformation Wave — GLSL as TypeScript template literals.
   --------------------------------------------------------------------------
   Signed scroll velocity, turned into a travelling ripple across an image.
   The whole effect is two sine terms in the vertex shader, and the detail
   that makes it work is which coordinate they are sampled from.

   Sampling the ORIGINAL flat attribute means the ripple is fixed to the
   picture: the same pixel always sits on the same part of the wave, so it
   reads as the photograph itself flexing. Sampling the already-displaced
   position instead makes the wave travel through the surface, which reads as
   a rendering fault.
   ========================================================================== */

export const scrollDeformWaveVertexShader = /* glsl */ `
uniform float uDeform;
uniform float uFrequency;
uniform float uPhase;
uniform float uAmplitude;
uniform float uShear;

varying vec2  vUv;
varying float vBend;

void main() {
  vec3 pos = position;

  // Depth ripple. Runs along y, so the crests are horizontal bands that sweep
  // the image the way scrolling sweeps the page. uPhase offsets the sine so
  // the wave is not symmetric about the plane's centre — without it the top
  // and bottom halves mirror each other and the ripple looks like a fold.
  pos.z += sin(position.y * uFrequency + uPhase) * uDeform * uAmplitude;

  // Shear. A much smaller vertical push driven by x, which breaks the
  // horizontal bands just enough that the surface reads as cloth rather than
  // as a corrugated sheet.
  pos.y += sin(position.x * uFrequency) * uDeform * uShear;

  // Local slope, for shading. The derivative of the depth term with respect to
  // y is cos of the same argument, so how steeply this patch tilts is one
  // cosine and needs no recomputed normals.
  vBend = cos(position.y * uFrequency + uPhase) * uDeform;

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const scrollDeformWaveFragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform float uTextureAspect;
uniform float uPlaneAspect;
uniform float uOverscan;
uniform float uShade;

varying vec2  vUv;
varying float vBend;

void main() {
  // Cover fit, so the source keeps its own proportions inside a plane whose
  // aspect is set by the container. Overscan matters more here than usual:
  // the vertex shader has already moved these vertices, and without crop in
  // reserve the clamped border smears along the edge at every crest.
  vec2 scale = vec2(1.0);
  if (uTextureAspect > uPlaneAspect) {
    scale.x = uPlaneAspect / uTextureAspect;
  } else {
    scale.y = uTextureAspect / uPlaneAspect;
  }
  scale /= max(uOverscan, 0.0001);
  vec2 offset = (1.0 - scale) * 0.5;

  vec4 texel = texture2D(uTexture, vUv * scale + offset);

  // Crests brighten, troughs darken, by the slope rather than the height. A
  // flat-lit ripple is nearly invisible on a busy image; slope shading is what
  // makes the wave legible without touching the geometry.
  float shade = 1.0 + vBend * uShade;
  gl_FragColor = vec4(texel.rgb * shade, texel.a);

  // ShaderMaterial gets no automatic output conversion — three only injects
  // this chunk into its own materials. Without it every colour ships raw
  // linear values into an sRGB framebuffer and the whole scene looks washed.
  #include <colorspace_fragment>
}
`;
