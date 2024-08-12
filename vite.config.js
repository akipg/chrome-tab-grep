import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

import { defineConfig, normalizePath  } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        { src: normalizePath(path.resolve(__dirname, './manifest.json')), dest: '' },
        { src: normalizePath(path.resolve(__dirname, './static')), dest: '' }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
