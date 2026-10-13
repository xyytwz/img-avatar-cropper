import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// 本项目为 HBuilderX 目录结构（源码位于根目录而非 src），指定 uni 插件的输入目录
process.env.UNI_INPUT_DIR = process.env.UNI_INPUT_DIR || process.cwd()

export default defineConfig({
  plugins: [uni()]
})
