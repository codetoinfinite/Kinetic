import type * as THREE from 'three';

/* ==========================================================================
   WebGL context lifecycle.
   --------------------------------------------------------------------------
   Chromium allows roughly 16 live WebGL contexts per RENDERER PROCESS (8 on
   low-end devices). Creating the 17th does not fail — it fires
   `webglcontextlost` on the OLDEST one, so an unrelated component elsewhere
   on the page goes black. Same-origin iframes share the renderer process, so
   isolating previews in iframes does not raise the ceiling.

   The only real fix is to release contexts on unmount, and `renderer.dispose()`
   ALONE DOES NOT DO THAT. It frees GPU objects but leaves the context itself
   alive until GC decides otherwise, which may be never. `forceContextLoss()`
   is the call that actually hands it back.
   ========================================================================== */

/**
 * Fully release a three.js renderer. Call this in the `useEffect` cleanup of
 * any component that constructs a `WebGLRenderer` — the preview host drives
 * unmount via `<Activity mode="hidden">`, so ordinary cleanup IS the disposal
 * path and nothing component-specific is required.
 */
export function disposeRenderer(renderer: THREE.WebGLRenderer | null | undefined): void {
  if (!renderer) return;

  // Stop the loop first: a queued frame that renders into a lost context
  // throws, and the throw escapes the cleanup function.
  renderer.setAnimationLoop(null);
  renderer.dispose();
  renderer.forceContextLoss();

  const canvas = renderer.domElement;
  if (canvas) {
    // Zeroing the backing store releases the drawing buffer immediately
    // instead of holding width×height×4 bytes until the node is collected.
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Release a raw WebGL context (ogl, or hand-written GL). The extension is the
 * only portable way to do it; it is absent in some headless configurations,
 * hence the optional call.
 */
export function loseContext(gl: WebGLRenderingContext | WebGL2RenderingContext | null | undefined): void {
  if (!gl) return;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
}

/** Recursively dispose geometries, materials and textures under a root. */
export function disposeObject(root: THREE.Object3D | null | undefined): void {
  if (!root) return;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose?.();
    const material = mesh.material;
    if (!material) return;
    const materials = Array.isArray(material) ? material : [material];
    for (const m of materials) {
      for (const value of Object.values(m as unknown as Record<string, unknown>)) {
        if (value && typeof value === 'object' && 'isTexture' in value) {
          (value as THREE.Texture).dispose();
        }
      }
      m.dispose?.();
    }
  });
}

/**
 * Device pixel ratio capped for fill-rate. Above 2 the visual gain is nil and
 * the cost is quadratic; on a 3x phone an uncapped full-screen shader is the
 * single most common cause of a janky first paint.
 */
export function pixelRatio(max = 2): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, max);
}

/**
 * Whether WebGL 2 is actually available. Some browsers expose the constructor
 * but fail to create a context (blocklisted GPU, no hardware acceleration);
 * a component that assumes success renders a permanently blank box.
 *
 * WebGL 2 specifically, not "any WebGL". three r150+ asks for `'webgl2'` and
 * nothing else, and *throws* when it cannot get one — so on a WebGL1-only
 * device (iOS Safari ≤ 14, older Android WebViews, a GPU on the WebGL2
 * blocklist) a check that accepted WebGL1 waved the component straight into a
 * constructor that threw out of its mount effect. The raw-GL components in this
 * catalogue are `#version 300 es`, which is WebGL 2 only as well.
 */
export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
