async function initWebGPU() {
    console.log("Initializing WebGPU...");

    // Check WebGPU support
    if (!navigator.gpu) {
        console.error("WebGPU is not supported in this browser.");
        return;
    }

    // Get the canvas element
    const canvas = document.getElementById("gpuCanvas");
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    // Get WebGPU context
    const context = canvas.getContext("webgpu");
    if (!context) {
        console.error("Failed to get WebGPU context.");
        return;
    }

    // Request GPU adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        console.error("Failed to get GPU adapter.");
        return;
    }

    // Request GPU device
    const device = await adapter.requestDevice();
    if (!device) {
        console.error("Failed to create GPU device.");
        return;
    }

    // Configure the swap chain
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: format,
        alphaMode: "opaque"
    });

    // Vertex Shader
    const vertexShaderCode = `
        @vertex
        fn main(@builtin(vertex_index) VertexIndex: u32)
            -> @builtin(position) vec4<f32> {
            var positions = array<vec2<f32>, 3>(
                vec2<f32>( 0.0,  0.5),
                vec2<f32>(-0.5, -0.5),
                vec2<f32>( 0.5, -0.5)
            );
            return vec4<f32>(positions[VertexIndex], 0.0, 1.0);
        }
    `;

    // Fragment Shader
    const fragmentShaderCode = `
        @fragment
        fn main() -> @location(0) vec4<f32> {
            return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Red color
        }
    `;

    // Create shaders
    const vertexModule = device.createShaderModule({ code: vertexShaderCode });
    const fragmentModule = device.createShaderModule({ code: fragmentShaderCode });

    // Create render pipeline
    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: {
            module: vertexModule,
            entryPoint: "main"
        },
        fragment: {
            module: fragmentModule,
            entryPoint: "main",
            targets: [{ format: format }]
        },
        primitive: {
            topology: "triangle-list"
        }
    });

    // Create command encoder
    function drawFrame() {
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                loadOp: "clear",
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: "store"
            }]
        });

        renderPass.setPipeline(pipeline);
        renderPass.draw(3, 1, 0, 0);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    drawFrame();
}

initWebGPU();