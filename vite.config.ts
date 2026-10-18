import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    // 忽略 cargo 构建产物目录，避免 watcher 因文件被编译进程锁定而报 EBUSY 警告
    watch: {
      ignored: ['**/src-tauri/target/**'],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'build'),
    emptyOutDir: true,
  },
})