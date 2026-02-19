/**
 * Utility to initialize WebGPU with proper error handling and type safety.
 */
export async function initWebGPU(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported in this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("No appropriate GPU adapter found.");
  }

  const device = await adapter.requestDevice();
  if (!device) {
    throw new Error("Failed to create WebGPU device.");
  }

  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("WebGPU context could not be initialized on the canvas.");
  }

  // Sharp rendering on high-density display
  const devicePixelRatio = window.devicePixelRatio;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format,
  });

  return { device, context, format };
}
