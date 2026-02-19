import { mat4 } from "wgpu-matrix";
import { initWebGPU } from "../util.ts";

import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount,
} from "../../meshes/cube";

import basicVertWGSL from "./basic.vert.wgsl";
import vertexPositionColorWGSL from "./vertexPositionColor.frag.wgsl";

export default async function (canvas: HTMLCanvasElement) {
  // 1. Init Web GPU
  const { device, context, format } = await initWebGPU(canvas);

  // ============= Buffer ============
  // Vertex Buffer
  const verticesBuffer = device.createBuffer({
    label: "Cube Buffer",
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray);
  verticesBuffer.unmap();

  // Uniform Buffer
  const uniformBufferSize = 4 * 16; // 4x4 matrix
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // ========== Layouts ===========
  // Define the vertex data structure
  const vertexBufferLayout: GPUVertexBufferLayout = {
    arrayStride: cubeVertexSize,
    attributes: [
      {
        // position
        shaderLocation: 0,
        offset: cubePositionOffset,
        format: "float32x4",
      },
      {
        // uv
        shaderLocation: 1,
        offset: cubeUVOffset,
        format: "float32x2",
      },
    ],
  };

  // ========== Pipelines ===========
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: basicVertWGSL,
      }),
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: device.createShaderModule({
        code: vertexPositionColorWGSL,
      }),
      targets: [
        {
          format: format,
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      // Backface culling since the cube is solid piece of geometry.
      // Faces pointing away from the camera will be occluded by faces
      // pointing toward the camera.
      cullMode: "back",
    },
    // Enable depth testing so that the fragment closest to the camera
    // is rendered in front.
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus",
    },
  });

  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  // =========== Map 3D Perspective =========
  const aspect = canvas.width / canvas.height;
  const projectionMatrix = mat4.perspective(
    (2 * Math.PI) / 5,
    aspect,
    1,
    100.0,
  );
  const modelViewProjectionMatrix = mat4.create();

  function getTransformationMatrix() {
    const viewMatrix = mat4.identity();
    mat4.translate(viewMatrix, [0, 0, -4], viewMatrix);
    const now = Date.now() / 1000;
    mat4.rotate(viewMatrix, [Math.sin(now), Math.cos(now), 0], 1, viewMatrix);
    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
    return modelViewProjectionMatrix;
  }

  // =========== Bind Groups ==========
  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: uniformBuffer }],
  });

  let requestID: number; // For clearing the animationFrame

  function frame() {
    const transformationMatrix = getTransformationMatrix();
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      transformationMatrix.buffer,
      transformationMatrix.byteOffset,
      transformationMatrix.byteLength,
    );
    // ========== Start a render pass ==========
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: [0.0, 0.0, 0.0, 1.0],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.setVertexBuffer(0, verticesBuffer);
    passEncoder.draw(cubeVertexCount);
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
