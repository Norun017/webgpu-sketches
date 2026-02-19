// Automatically finds every main.ts inside the samples folder
const modules = import.meta.glob("./samples/*/main.ts");

const samples: Record<string, () => Promise<any>> = {};

for (const path in modules) {
  // Extract "hello-triangle" from "./samples/hello-triangle/main.ts"
  const name = path.split("/")[2];
  samples[name] = modules[path] as () => Promise<any>;
}

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <h1>WebGPU Samples</h1>
  <ul>
    ${Object.keys(samples)
      .map((name) => `<li><a href="#${name}">${name}</a></li>`)
      .join("")}
  </ul>
  <canvas id="canvas"></canvas>
`;

let currentCleanup: (() => void) | null = null;

async function loadSample(name: string) {
  const loader = samples[name];
  if (!loader) return;

  // 1. Run cleanup for the previous work
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  // 2. Clear the canvas or UI state
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas");
  const ctx = canvas?.getContext("webgpu");

  if (!ctx) {
    app.innerHTML += `<p style="color: red;">WebGPU is not supported in this browser.</p>`;
    return;
  }

  // 3. Import the module
  try {
    const mod = await loader();

    // We expect the sample to return a cleanup function (optional)
    // e.g., export default async function(canvas) { ... return () => stopAnim; }
    const cleanup = await mod.default(canvas!);

    if (typeof cleanup === "function") {
      currentCleanup = cleanup;
    }
    console.log(`Loaded sample: ${name}`);
  } catch (err) {
    console.error(`Failed to load sample "${name}":`, err);
  }
}

// Load sample from URL hash
const hash = location.hash.slice(1);
if (hash && samples[hash]) loadSample(hash);

// Handle clicks
window.addEventListener("hashchange", () => {
  const name = location.hash.slice(1);
  loadSample(name);
});
