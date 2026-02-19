import {defineConfig} from "vite";
import wgsl from "vite-plugin-glsl";

export default defineConfig({
    base: "/your-repo-name/",
    plugins: [wgsl({ include: ['**/*.wgsl', '**/*.vert', '**/*.frag'] })],
});