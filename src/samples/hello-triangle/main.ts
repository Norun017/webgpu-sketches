import { initWebGPU } from "../util.ts";
import triangleVertWGSL from "./triangle.vert.wgsl";
import redFragWGSL from "./red.frag.wgsl";

export default async function (canvas: HTMLCanvasElement) {
  // 1. Init Web GPU
  const { device, context, format } = await initWebGPU(canvas);

  // ========== Pipelines ===========
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: triangleVertWGSL,
      }),
    },
    fragment: {
      module: device.createShaderModule({
        code: redFragWGSL,
      }),
      targets: [
        {
          format: format,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  let requestID: number; // For clearing the animationFrame

  function frame() {
    // ========== Start a render pass ==========
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: [0, 0, 0, 0], // clear to transperant
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    requestID = requestAnimationFrame(frame);
  }

  requestID = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(requestID);
    device.destroy(); // Release GPU resources immediately
  };
}
