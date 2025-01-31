import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import copy from 'rollup-plugin-copy';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        copy({
            targets: [
                {src: 'logo.png', dest: 'dist/'},
                {src: 'preload.js', dest: 'dist/'},
                {src: 'plugin.json', dest: 'dist/'},
                {src: 'src/release_npm/node_modules', dest: 'dist/'},
            ],
            hook: 'writeBundle' // 指定在哪个生命周期钩子上执行复制操作
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    base: './',

    css: {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler"
            }
        }
    }
})
