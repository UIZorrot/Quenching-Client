// Local development harness. Uses the exact adapter shipped by ModelPreview.
import { createPreview } from '../../src/Renderer/model-preview/create-preview';
let canvas = document.querySelector('canvas')!;
const status = document.querySelector('pre')!;
let preview: Awaited<ReturnType<typeof createPreview>>;
let frame = 0;
const read = async (path: string, basePath?: string) => {
  const response = await fetch('/resource?' + new URLSearchParams({ path, basePath: basePath || '' }));
  if (!response.ok) throw new Error(await response.text());
  return { bytes: new Uint8Array(await response.arrayBuffer()), resolvedPath: decodeURIComponent(response.headers.get('X-Resource-Path')!) };
};
const inspect = () => {
  const gl = preview.viewer.gl, pixels = new Uint8Array(canvas.width * canvas.height * 4);
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let changed = 0, hash = 2166136261;
  for (let i = 0; i < pixels.length; i += 4) {
    if (Math.abs(pixels[i] - pixels[0]) + Math.abs(pixels[i + 1] - pixels[1]) + Math.abs(pixels[i + 2] - pixels[2]) > 15) changed++;
    hash = Math.imul(hash ^ pixels[i], 16777619);
  }
  return { changedPixels: changed, hash: hash >>> 0, glError: gl.getError() };
};
async function load(path: string) {
  cancelAnimationFrame(frame); preview?.dispose();
  // A context explicitly lost on disposal cannot be reused immediately.
  const next = canvas.cloneNode() as HTMLCanvasElement; canvas.replaceWith(next); canvas = next;
  // Preserve the harness's single canvas reference for repeated loads.
  Object.defineProperty(window, 'deCanvas', { value: next, configurable: true });
  const source = await read(path);
  preview = await createPreview(next, source, read);
  (window as any).dePreview = preview;
  const result = { path, geosets: preview.model.geosets.length, bones: preview.parser.bones.length,
    missing: preview.missing, omitted: preview.omitted, glError: preview.viewer.gl.getError() };
  status.textContent = JSON.stringify(result, null, 2);
  const loop = () => { preview.draw(16); frame = requestAnimationFrame(loop); }; loop();
  return result;
}
(window as any).loadDE = load;
(window as any).inspectDE = inspect;
document.querySelector('button')!.onclick = () => load((document.querySelector('input') as HTMLInputElement).value).catch(e => { status.textContent = e.stack; });
load('war3.w3mod:_de.w3mod:units/human/footman/footman.mdx').catch(e => { status.textContent = e.stack; });
