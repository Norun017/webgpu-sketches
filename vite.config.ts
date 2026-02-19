import {defineConfig} from "vite";
import wgsl from "vite-plugin-glsl";

export default defineConfig({
    base: "/webgpu-sketches/",
    plugins: [wgsl({ include: ['**/*.wgsl', '**/*.vert', '**/*.frag'] })],
});