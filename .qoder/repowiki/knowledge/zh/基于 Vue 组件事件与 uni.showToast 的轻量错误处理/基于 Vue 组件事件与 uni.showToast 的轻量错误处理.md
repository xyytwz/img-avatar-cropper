---
kind: error_handling
name: 基于 Vue 组件事件与 uni.showToast 的轻量错误处理
category: error_handling
scope:
    - '**'
source_files:
    - img-cropper/components/img-cropper/img-cropper.vue
    - uni_modules/img-cropper/components/img-cropper/img-cropper.vue
    - img-cropper/pages/demo/demo.vue
    - pages/index/index.vue
---

## 1. 采用的方式

该仓库是一个 uni-app + Vue3 的头像裁剪示例工程，没有统一的错误框架、错误码枚举或全局中间件。错误处理集中在 `img-cropper` 组件内部，采用以下三种手段：
- **Vue 自定义事件**：组件通过 `emits: ['complete', 'cancel', 'error']`（见 `img-cropper/components/img-cropper/img-cropper.vue` 第 144 行）向父组件上报错误。
- **try/catch + Promise reject**：异步裁剪流程用 `async/await` 包裹，失败路径 `throw new Error(...)` 或 `reject(err)`，由外层 `catch` 统一处理。
- **uni.showToast**：对最终用户展示简短中文提示（如 `'裁剪失败'`），不抛出到页面层。

## 2. 关键文件

- `img-cropper/components/img-cropper/img-cropper.vue`（以及 `uni_modules/img-cropper/components/img-cropper/img-cropper.vue`，二者为同一组件的两份副本）
- `img-cropper/pages/demo/demo.vue`（演示页，监听 `@error`）
- `pages/index/index.vue`（首页，同样监听 `@error`）

## 3. 架构与约定

### 3.1 组件内错误分类
组件在两个位置发出 `error` 事件，并通过对象 `{ type, detail }` 区分来源：

| 触发点 | `type` 值 | 说明 |
|---|---|---|
| `open()` → `uni.getImageInfo({ fail })` | `'getImageInfo'` | 读取图片信息失败 |
| `confirmCrop()` 中的 `cropImage()` / `exportCanvas()` | `'crop'` | Canvas 裁剪或导出失败 |

调用方按 `error.detail` 拿到原始错误对象，可按需记录日志或做进一步处理。

### 3.2 异步错误传播链
```text
uni.getImageInfo.fail → emit('error', { type:'getImageInfo', detail:err })
uni.canvasToTempFilePath.fail → reject(err) → cropImage().catch → confirmCrop catch → emit('error', { type:'crop', detail:error })
throw new Error('裁剪结果为空') → confirmCrop catch → emit('error', { type:'crop', detail:error })
```

`exportCanvas` 将 `uni.canvasToTempFilePath` 的回调式 API 包装为 Promise，`fail` 分支直接 `reject(err)`；`cropImage` 在 `ctx.draw` 回调中 `.then(resolve).catch(reject)` 把错误继续上抛给 `confirmCrop`。

### 3.3 用户可见反馈
`confirmCrop` 的 `catch` 块会先 `uni.hideLoading()`，再 `uni.showToast({ title: '裁剪失败', icon: 'none' })`，最后才 `emit('error', ...)`。也就是说：**对用户只展示通用提示，具体原因留给上层业务逻辑**。`getImageInfo` 的 `fail` 分支则直接 `emit`，不弹 toast。

### 3.4 调用方约定
Demo 和首页都通过 `@error="onCropError"` 监听并 `console.error('裁剪出错:', error)`，未做额外 UI 处理。这表明调用方的约定是：如需用户可见的错误提示，应在监听器中自行决定。

## 4. 观察到的约定与约束

- 组件对外暴露三个事件：`complete`（成功）、`cancel`（取消）、`error`（异常），这是组件 API 的一部分，由 `emits` 声明。
- 所有错误通过 `emit('error', { type, detail })` 上报，`type` 取值为字符串字面量 `'getImageInfo'` 或 `'crop'`，用于区分错误来源。
- 异步 I/O（`uni.getImageInfo`、`uni.canvasToTempFilePath`）使用回调式 API，内部封装为 Promise；Promise 的 `reject` 与 `throw` 均被捕获后转为 `emit('error', ...)`，不会让未处理的 Promise rejection 泄漏到页面。
- 用户侧错误提示统一使用 `uni.showToast`，文案为中文硬编码（如 `'裁剪失败'`），无国际化或可配置化。
- 未发现全局错误边界（如 Vue `errorCaptured`）、全局 Promise unhandledRejection 处理器、错误码枚举或自定义错误类——错误处理完全局限于组件内部。
- 不存在 panic/recover 机制（非 Go 项目），也未发现类似中间件的统一拦截层。