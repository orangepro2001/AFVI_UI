import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { designAssets } from './tools/vite-plugin-design-assets.ts'
import { tailwindCli } from './tools/vite-plugin-tailwind-cli.ts'

export default defineConfig({
  plugins: [
    vue(),
    designAssets(),
    tailwindCli({ input: 'src/styles/index.css', output: 'src/styles/generated.css' }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // `wails dev` reads the URL from Vite's output; a fixed port keeps browser bookmarks valid.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
