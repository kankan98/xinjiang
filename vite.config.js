import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { simpleRoadbookPlugin } from './tools/simple-roadbook.mjs'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  server: {
    watch: {
      // 排除浏览器 profile 目录，避免 Edge 锁定 Cookies 等文件引发 EBUSY
      ignored: ['**/.claude/xiaohongshu-browser-profile/**'],
    },
  },
  plugins: [
    vue(),
    simpleRoadbookPlugin(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
})
