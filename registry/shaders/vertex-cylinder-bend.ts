/* ==========================================================================
   Vertex Shader Cylinder Bend — GLSL as TypeScript template literals.
   --------------------------------------------------------------------------
   The bend on its own, with nothing else attached: no gallery, no scroll, no
   textures to fit. A flat `PlaneGeometry` goes in and a section of cylinder
   comes out, entirely on the GPU, so the curvature is a uniform you can
   animate rather than a mesh you have to rebuild.

   The trick is that the vertex's own x coordinate is the arc parameter. Feed
   it through `sin`/`cos` scaled by a radius and the plane rolls; scale x by a
   curl factor first and the SAME plane rolls tighter or looser without its
   arc length changing, so the banner never appears to shrink as it bends.
   ========================================================================== */

export const vertexCylinderBendVertexShader = /* glsl */ `
uniform float uCurl;
uniform float uSpin;
uniform float uBarrel;

varying vec2  vUv;
varying float vFacing;

void main() {
  // radius = 1 / curl is the whole relationship. curl is radians per world
  // unit of plane width, so a 3-unit plane at curl 0.9 wraps 2.7 rad of a
  // circle of radius 1.11 — and its arc length is still exactly 3 units.
  // Guarded because curl 0 means an infinite radius: the flat case has to be
  // approached, never divided by.
  float curl = max(uCurl, 0.0001);
  float radius = 1.0 / curl;
  float angle = uSpin + position.x * curl;

  vec3 pos;
  pos.x = radius * sin(angle);
  // The - radius pins the arc's centre at z = 0. Without it the whole banner
  // sits a full radius in front of the origin and appears to lunge at the
  // camera every time the curl tightens.
  pos.z = radius * cos(angle) - radius;

  // Barrel, normalised. sin(k*y)/k tends to y as k tends to 0, so at uBarrel 0
  // the height is untouched and at uBarrel 1 it is a full sine bow — the plane
  // keeps its size either way instead of shrinking as the bow deepens.
  float k = max(uBarrel, 0.0001);
  pos.y = sin(position.y * k) / k;

  // Surface normal, analytically. d(pos)/dx is (cos a, 0, -sin a) and d/dy is
  // (0, 1, 0); their cross product is (sin a, 0, cos a), so the z component of
  // the normal — how squarely this patch faces the camera — is just cos(angle).
  // No normalMatrix, no recomputed vertex normals, one cosine.
  vFacing = cos(angle);

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const vertexCylinderBendFragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform float uShade;

varying vec2  vUv;
varying float vFacing;

void main() {
  vec4 texel = texture2D(uTexture, vUv);

  // Shading is the only cue that the plane is curved rather than trapezoidal.
  // A flat-lit bend reads as a perspective mistake; darkening by the facing
  // term makes the same geometry read as a surface turning away from a light.
  float shade = mix(1.0, clamp(vFacing, 0.0, 1.0), uShade);
  gl_FragColor = vec4(texel.rgb * shade, texel.a);

  // ShaderMaterial gets no automatic output conversion — three only injects
  // this chunk into its own materials. Without it every colour ships raw
  // linear values into an sRGB framebuffer and the whole scene looks washed.
  #include <colorspace_fragment>
}
`;
