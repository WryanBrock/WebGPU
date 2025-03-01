 async function initWebGPU() {
    console.log("Initializing WebGPU...");

    const canvas = document.getElementById("gpuCanvas");
    if (!canvas) {
        console.error("Canvas not found!");
        return;
    }

    // Explicitly set canvas dimensions
    canvas.width = 600;
    canvas.height = 600;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        console.error("WebGPU not supported!");
        return;
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ device, format, alphaMode: "opaque" });

    // Initial cell position
    let cellPositions = new Float32Array([0.0, 0.0]);
    let velocities = [[Math.random() * 0.02 - 0.01, Math.random() * 0.02 - 0.01]];

    // Create GPU buffer for positions
    let positionBuffer = device.createBuffer({
        size: cellPositions.byteLength * 2, // Allow for growth
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(positionBuffer, 0, cellPositions);

    // Vertex Shader
    const vertexShaderCode = `
        struct CellData {
            position: vec2<f32>
        };

        @group(0) @binding(0) var<storage, read> cells: array<CellData>;

        @vertex
        fn main(@builtin(vertex_index) id: u32, @builtin(instance_index) instance: u32) -> @builtin(position) vec4<f32> {
            let vertices = array<vec2<f32>, 6>(
                vec2<f32>(-0.05, -0.05),
                vec2<f32>( 0.05, -0.05),
                vec2<f32>(-0.05,  0.05),
                vec2<f32>(-0.05,  0.05),
                vec2<f32>( 0.05, -0.05),
                vec2<f32>( 0.05,  0.05)
            );
            return vec4<f32>(vertices[id] + cells[instance].position, 0.0, 1.0);
        }
    `;

    // Fragment Shader
    const fragmentShaderCode = `
        @fragment
        fn main(@builtin(position) fragCoord: vec4<f32>) -> @location(0) vec4<f32> {
            return vec4<f32>(0.2, 0.8, 0.2, 1.0);
        }
    `;

    const vertexShaderModule = device.createShaderModule({ code: vertexShaderCode });
    const fragmentShaderModule = device.createShaderModule({ code: fragmentShaderCode });

    // Create Bind Group Layout
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } }]
    });

    // Create Pipeline Layout
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

    // Create Render Pipeline
    const pipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module: vertexShaderModule, entryPoint: "main" },
        fragment: { module: fragmentShaderModule, entryPoint: "main", targets: [{ format }] },
        primitive: { topology: "triangle-list" }
    });

    // Create Bind Group
    let bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: positionBuffer } }]
    });

    function updatePositions() {
        for (let i = 0; i < cellPositions.length; i += 2) {
            cellPositions[i] += velocities[i / 2][0];
            cellPositions[i + 1] += velocities[i / 2][1];

            // Bounce logic
            if (cellPositions[i] > 1 || cellPositions[i] < -1) velocities[i / 2][0] *= -1;
            if (cellPositions[i + 1] > 1 || cellPositions[i + 1] < -1) velocities[i / 2][1] *= -1;
        }

        device.queue.writeBuffer(positionBuffer, 0, cellPositions);
    }

    // Cell Division Logic
    window.addEventListener("keydown", (event) => {
        if (event.key === " ") {
            let newPositions = [];
            let newVelocities = [];

            for (let i = 0; i < cellPositions.length; i += 2) {
                const x = cellPositions[i];
                const y = cellPositions[i + 1];

                newPositions.push(
                    x + (Math.random() * 0.1 - 0.05), 
                    y + (Math.random() * 0.1 - 0.05)
                );
                newPositions.push(
                    x + (Math.random() * 0.1 - 0.05), 
                    y + (Math.random() * 0.1 - 0.05)
                );

                newVelocities.push(
                    [Math.random() * 0.02 - 0.01, Math.random() * 0.02 - 0.01], 
                    [Math.random() * 0.02 - 0.01, Math.random() * 0.02 - 0.01]
                );
            }

            cellPositions = new Float32Array(newPositions);
            velocities = [...newVelocities];

            positionBuffer = device.createBuffer({
                size: cellPositions.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            device.queue.writeBuffer(positionBuffer, 0, cellPositions);

            bindGroup = device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{ binding: 0, resource: { buffer: positionBuffer } }]
            });
        }
    });

    function renderFrame() {
        updatePositions();

        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: "store"
            }]
        });

        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.draw(6, Math.floor(cellPositions.length / 2), 0, 0);
        passEncoder.end();

        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(renderFrame);
    }

    renderFrame();
}

initWebGPU();