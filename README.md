# WebGPU
# WebGPU Cell Simulation  

This project is a WebGPU-based particle simulation where cells move around and divide upon user input. It leverages WebGPU for efficient rendering and computation, allowing cells to interact dynamically within a canvas.  

## Features  

- **WebGPU Rendering**: Uses WebGPU for high-performance graphics and computations.  
- **Cell Motion**: Cells move with randomized velocities and bounce off canvas edges.  
- **Cell Division**: Pressing the spacebar triggers cell division, replacing existing cells with two new ones at slightly offset positions.  
- **GPU-Accelerated Shaders**: Utilizes vertex and fragment shaders for efficient rendering.  

## Installation  

1. Clone the repository:  
   ```sh
   git clone https://github.com/your-username/webgpu-cell-simulation.git  
   cd webgpu-cell-simulation  
   

2.	Open index.html in a browser that supports WebGPU (e.g., latest Chrome or Edge).

File Structure
/webgpu-cell-simulation
│──src/
    │──dividingCells.js
    │──gpuParticles.js
    │──particleSystem.js
    │──style.css
│── index.html          # Main HTML file with canvas
│── script.js           # JavaScript file initializing WebGPU
│── README.md           # Project documentation

Usage
	•	Open the project in a browser.
	•	Watch the initial cell move around randomly.
	•	Press the spacebar to divide all cells into new positions with randomized velocities.

Requirements
	•	A WebGPU-supported browser (e.g., Chrome Canary with --enable-unsafe-webgpu).

Future Enhancements
	•	Improve physics simulation for cell interactions.
	•	Add color-based changes based on cell age or speed.
	•	Implement a UI to adjust simulation parameters dynamically.

License

MIT License
This gives a structured and informative overview of your WebGPU project for GitHub. Let me know if you'd like any adjustments! 🚀