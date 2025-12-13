import { defineConfig } from 'vite'
import htmlInject from 'vite-plugin-html-inject';
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        htmlInject()
    ],
    base: './',
    root: 'ui',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'ui/index.html')
        }
    },
    server: {
        port: 5173,
        strictPort: true
    }
});