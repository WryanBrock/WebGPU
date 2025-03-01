async function initWebGPU() {
  console.log("Initializing WebGPU...");

  // Check WebGPU support
  if (!navigator.gpu) {
    console.error("WebGPU is not supported in this browser.");
    return;
  }

  // Get canvas and WebGPU context
  const canvas = document.getElementById("gpuCanvas");
  if (!canvas) {
    console.error("Canvas element not found!");
    return;
  }
  const context = canvas.getContext("webgpu");

  // Request GPU adapter & device
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error("Failed to get GPU adapter.");
    return;
  }
  const device = await adapter.requestDevice();
  if (!device) {
    console.error("Failed to get GPU device.");
    return;
  }

  // Configure canvas format
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  // Number of particles
  const numParticles = 1000;

  // Create particle storage buffer (for compute shader)
  const particleBuffer = device.createBuffer({
    size: numParticles * 8, // Each particle has 2 floats (x, y)
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
});

  // Create separate vertex buffer (for rendering)
  const vertexBuffer = device.createBuffer({
    size: numParticles * 8,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // Initialize particle data (random positions)
  const particles = new Float32Array(numParticles * 2);
  for (let i = 0; i < numParticles; i++) {
    particles[i * 2] = Math.random() * 2 - 1; // X (-1 to 1)
    particles[i * 2 + 1] = Math.random() * 2 - 1; // Y (-1 to 1)
  }
  device.queue.writeBuffer(particleBuffer, 0, particles);

  // Compute Shader (updates particle positions)
  const computeShaderCode = `
       @group(0) @binding(0) var<storage, read_write> particles: array<vec2<f32>>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;

    // Ensure the index is within bounds
    if (i >= arrayLength(&particles)) { return; }

    var pos = particles[i];
    pos.y -= 0.005; // Simulating gravity effect

    // Wrap-around when particle reaches the bottom
    if (pos.y < -1.0) {
        pos.y = 1.0;
    }

    particles[i] = pos;
}
    `;
  const computeShaderModule = device.createShaderModule({
    code: computeShaderCode,
  });

  // Compute pipeline layout
  const computePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [
      device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
          },
        ],
      }),
    ],
  });

  // Compute pipeline
  const computePipeline = device.createComputePipeline({
    layout: computePipelineLayout,
    compute: { module: computeShaderModule, entryPoint: "main" },
  });

  // Bind group for compute shader
  const computeBindGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: particleBuffer } }],
  });

  // Vertex Shader (renders points)
  const vertexShaderCode = `
        @vertex
        fn main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
            return vec4<f32>(position, 0.0, 1.0);
        }
    `;

  // Fragment Shader (colors particles)
  const fragmentShaderCode = `
        @fragment
        fn main() -> @location(0) vec4<f32> {
            return vec4<f32>(1.0, 0.5, 0.0, 1.0); // Orange color
        }
    `;

  // Render pipeline layout
  const renderPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [],
  });

  // Render pipeline
  const pipeline = device.createRenderPipeline({
    layout: renderPipelineLayout,
    vertex: {
      module: device.createShaderModule({ code: vertexShaderCode }),
      entryPoint: "main",
      buffers: [
        {
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, format: "float32x2", offset: 0 }],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({ code: fragmentShaderCode }),
      entryPoint: "main",
      targets: [{ format }],
    },
    primitive: { topology: "point-list" }, // Render as points
  });

  // Animation loop
  function frame() {
    const commandEncoder = device.createCommandEncoder();

    // Compute pass (updates particles)
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(numParticles / 64));
    computePass.end();

    // Copy data from compute buffer to vertex buffer for rendering
    commandEncoder.copyBufferToBuffer(
      particleBuffer,
      0,
      vertexBuffer,
      0,
      numParticles * 8
    );

    // Render pass (draws particles)
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.draw(numParticles);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Call the function to start WebGPU
initWebGPU();
