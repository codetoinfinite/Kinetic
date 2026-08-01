/* ==========================================================================
   Cylinder Gallery — GLSL, as TypeScript template literals.
   --------------------------------------------------------------------------
   Shipped as `.ts` and not `.glsl` on purpose. A `.glsl` import forces every
   consumer to install and configure a bundler plugin before the component
   will compile; a template literal is a plain module that every bundler
   already understands.

   Everything visible in this component happens in the vertex shader. The
   camera never moves and the CPU never touches a vertex — the geometry stays
   a flat `PlaneGeometry` at the origin and the GPU wraps it around a drum
   every frame, which is what makes the radius, the intro morph and the
   velocity wave all free to animate.
   ========================================================================== */

export const cylinderGalleryVertexShader = /* glsl */ `
uniform float uSpiralAngle;
uniform float uRadius;
uniform float uIntro;
uniform float uDeform;
uniform vec2  uMouseNdc;
uniform float uMouseStrength;
uniform float uTextureAspect;
uniform float uPlaneAspect;
uniform float uOverscan;

varying vec2  vCoverUv;
varying float vBulge;

void main() {
  // Barrel. sin() over y draws the top and bottom edges in slightly, so the
  // plane reads as a piece of a sphere rather than a rolled sheet of paper.
  // For a 1.95-tall plane y is in [-0.975, 0.975], where sin() is still
  // monotonic — push the plane taller than 2 units and the edges fold back.
  float barrelY = sin(position.y);

  // The drum, in two lines. The vertex's own x IS the arc offset, so one unit
  // of plane width maps to exactly one radian: a wider plane wraps further
  // round. No CylinderGeometry, no pre-bent UVs, no baked mesh.
  float angle = uSpiralAngle + position.x;
  vec3 ringPos = vec3(uRadius * sin(angle), barrelY, uRadius * cos(angle));

  // The other layout: a flat row, planes side by side, facing the camera.
  vec3 rowPos = vec3(position.x, barrelY, 0.0);

  // One scalar decides which of the two you are looking at, and every value
  // in between is a valid frame. Note this is a mix of positions, NOT
  // "uRadius scaled to zero": at radius 0 every vertex collapses onto the
  // origin and the row is nineteen invisible slivers.
  vec3 pos = mix(rowPos, ringPos, uIntro);

  // Travelling wave, driven by signed scroll velocity. Sampled from
  // 'position' — the ORIGINAL flat coordinates — and not from 'pos', so the
  // ripple is locked to the picture rather than to the drum. It reads as the
  // photograph itself flexing, which is the intended illusion. The + 100.0
  // is a phase offset so the wave is not symmetric about the plane's centre.
  pos.z += sin(position.y * 3.0 + 100.0) * uDeform * 0.07;
  pos.y += sin(position.x * 3.0) * uDeform * 0.04;

  // Two projections per vertex, deliberately. This first one is a
  // measurement — where does this vertex land on screen right now? — which is
  // what lets the pointer be compared against a bent mesh with no CPU work
  // and no picking buffer at all.
  vec4 probe = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vec2 ndc = probe.xy / probe.w;
  float mouseDist = length(ndc - uMouseNdc);
  float bulge = exp(-mouseDist * mouseDist * 5.0) * uMouseStrength;
  pos.z += bulge * 0.5;
  vBulge = bulge;

  // object-fit: cover, in UV space, evaluated once per vertex instead of once
  // per fragment. Work outward from the centre so the crop stays centred.
  vec2 centered = uv - 0.5;
  if (uTextureAspect > uPlaneAspect) {
    centered.x *= uPlaneAspect / uTextureAspect;   // texture wider: crop the sides
  } else {
    centered.y *= uTextureAspect / uPlaneAspect;   // texture taller: crop top and bottom
  }
  // Overscan. An exactly-fitted texture shows its own border the moment the
  // wave or the bulge moves a vertex; zooming in leaves the crop margin to
  // give back.
  centered /= uOverscan;
  vCoverUv = centered + 0.5;

  // ...and the second projection, which is the one that actually ships the
  // vertex, after every displacement above has been applied.
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const cylinderGalleryFragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform float uFocus;
uniform float uOpacity;

varying vec2  vCoverUv;
varying float vBulge;

void main() {
  // The bulge does not only lift the surface toward the camera, it magnifies
  // it: pushing the centred UV outward by the same scalar turns a bump into
  // a lens, which is the difference between "warped" and "under glass".
  vec2 centered = vCoverUv - 0.5;
  vec4 texel = texture2D(uTexture, vCoverUv + centered * vBulge * 0.12);

  // Out-of-focus planes lose colour and light rather than blurring. A real
  // blur needs a second pass and a render target; desaturating toward
  // luminance costs one dot product and reads the same at this scale.
  float grey = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 color = mix(vec3(grey), texel.rgb, mix(0.18, 1.0, uFocus));
  color *= mix(0.38, 1.0, uFocus);

  gl_FragColor = vec4(color, texel.a * uOpacity * mix(0.22, 1.0, uFocus));

  // ShaderMaterial gets no automatic output conversion — three only injects
  // this chunk into its own materials. Without it every colour ships raw
  // linear values into an sRGB framebuffer and the whole scene looks washed.
  #include <colorspace_fragment>
}
`;
