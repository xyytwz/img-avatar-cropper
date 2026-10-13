---
kind: frontend_style
name: uni-app 前端样式体系：SCSS 变量 + rpx 响应式 + BEM 风格组件样式
category: frontend_style
scope:
    - '**'
source_files:
    - uni.scss
    - App.vue
    - pages/index/index.vue
    - img-cropper/components/img-cropper/img-cropper.vue
---

## 1. 使用的系统与工具

- **框架**：基于 uni-app（Vue3 + `<script setup>`）构建 H5/小程序/APP 多端应用。
- **样式预处理**：使用 SCSS，通过 uni-app 内置的 `uni.scss` 提供全局设计变量。
- **单位策略**：统一使用 `rpx`（responsive pixel），由 uni-app 在运行时按屏幕宽度换算为 px，实现跨设备自适应；组件内部计算时通过 `uni.upx2px()` 将 rpx 转为 px 用于 Canvas 与触摸坐标。
- **CSS 作用域**：所有页面与组件均使用 `<style scoped>` 隔离样式，避免全局污染。
- **无外部 UI 库**：未引入 Vant、TDesign 等第三方组件库，也未配置 Tailwind 或 CSS-in-JS，样式全部手写原生 CSS。

## 2. 关键文件

- `uni.scss` — uni-app 全局 SCSS 变量入口，定义颜色、字号、间距、圆角等设计令牌。
- `App.vue` — 应用根组件，其 `<style>` 注释标明“每个页面公共css”，当前为空占位。
- `pages/index/index.vue` — 首页示例，展示头像裁剪入口的页面级样式。
- `img-cropper/components/img-cropper/img-cropper.vue` — 核心裁剪组件，包含完整的弹窗、遮罩、工具栏、按钮等样式。
- `vite.config.js` / `manifest.json` / `pages.json` — 构建与平台配置，不直接承载样式逻辑。

## 3. 架构与约定

### 3.1 设计令牌（Design Tokens）集中在 `uni.scss`

`uni.scss` 是唯一的主题变量源，按语义分组声明：

| 类别 | 变量前缀 | 示例 |
|---|---|---|
| 行为色 | `$uni-color-*` | `$uni-color-primary: #007aff`、`$uni-color-success/warning/error` |
| 文字色 | `$uni-text-color*` | `$uni-text-color: #333`、`$uni-text-color-grey/inverse/disable` |
| 背景色 | `$uni-bg-color*` | `$uni-bg-color: #ffffff`、`$uni-bg-color-mask: rgba(0,0,0,0.4)` |
| 边框色 | `$uni-border-color` | `$uni-border-color: #c8c7cc` |
| 字号 | `$uni-font-size-*` | `sm: 12px`、`base: 14px`、`lg: 16px` |
| 图片尺寸 | `$uni-img-size-*` | `sm: 20px`、`base: 26px`、`lg: 40px` |
| 圆角 | `$uni-border-radius-*` | `sm/base/lg/circle` |
| 水平/垂直间距 | `$uni-spacing-row-*` / `$uni-spacing-col-*` | `sm/base/lg` 三级 |
| 透明度 | `$uni-opacity-disabled` | `0.3` |
| 文章场景 | `$uni-color-title/subtitle/paragraph` + 对应字号 | 面向内容页的预设 |

这些变量被 uni-app 自动注入，组件中可直接引用而无需 import。

### 3.2 命名约定：BEM 风格的类名

组件样式采用 `模块前缀 + 双下划线 + 元素/状态` 的 BEM 变体：

- 外层容器：`.imgc-overlay`、`.imgc-popup`
- 子区域：`.imgc-header`、`.imgc-crop-area`、`.imgc-preview-area`、`.imgc-toolbar`、`.imgc-footer`
- 元素：`.imgc-image`、`.imgc-mask`、`.imgc-frame`、`.imgc-title`、`.imgc-cancel`
- 按钮族：`.imgc-btn` + `.imgc-btn-reset` / `.imgc-btn-confirm`
- 工具按钮：`.imgc-tool-btn`、`.imgc-tool-icon`、`.imgc-tool-label`
- 预览变体：`.imgc-preview-circle`（通过动态 class 切换）

页面级样式（`pages/index/index.vue`）则使用更通用的单下划线命名：`.demo-page`、`.section`、`.avatar-box`、`.choose-btn` 等。

### 3.3 响应式策略

- 布局尺寸统一用 `rpx`（如 `padding: 40rpx`、`font-size: 36rpx`、`width: 200rpx`）。
- 需要精确像素参与 Canvas 绘制或触摸计算时，通过 `uni.upx2px(props.frameSize)` 将 rpx 转为 px，并在多处使用 `Math.floor()` 取整以避免 APP 端浮点像素偏移。
- 组件内所有尺寸计算遵循同一取整策略，注释明确说明：“所有尺寸用 Math.floor 取整，避免 APP 端浮点像素取整方向不一致导致偏移”。

### 3.4 主题定制方式

组件支持通过 props 覆盖视觉主题：

- `themeColor`（默认 `#07c160`）— 主按钮背景色，模板中以 `:style="{ backgroundColor: themeColor }"` 绑定。
- `frameColor`（默认 `#ffffff`）— 裁剪框边框色。
- `outputShape`（`square` | `circle`）— 控制输出形状，同时通过动态 class `imgc-preview-circle` 切换预览图圆角。
- 标题、取消/确认文案均可通过 `title`、`cancelText`、`cropText`、`confirmText` 等 prop 定制。

## 4. 观察到的约定与约束

- **样式文件组织**：每个 Vue SFC 的样式写在独立的 `<style scoped>` 块中，页面与组件互不共享样式，全局公共样式仅保留在 `App.vue` 的占位 `<style>` 中。
- **单位规范**：UI 尺寸一律使用 `rpx`，仅在 Canvas/触摸数学计算处切换到 px，并通过 `uni.upx2px` 转换。
- **颜色来源**：设计系统变量集中在 `uni.scss`，但组件内部仍大量直接使用硬编码色值（如 `#f5f5f5`、`#999`、`#333`、`rgba(0,0,0,0.5)`），并未全部替换为 `$uni-*` 变量——这是现有代码的实际状态，而非强制规则。
- **组件样式隔离**：组件样式全部 scoped，且类名前缀 `imgc-` 避免与宿主页面冲突。
- **APP 端兼容性约束**（来自组件内注释，属于实现层面的硬性约定）：禁用 `transform: scale()`、禁用 CSS `inset:0`、禁用 `margin:auto` 居中，因为 APP 端不支持或不稳定；Canvas 隐藏方式改为 `left: -9999px; top: -9999px; opacity: 0` 而非绝对定位居中。
- **z-index 层级**：弹窗遮罩固定 `z-index: 9999`，确保覆盖整个页面。
- **无构建期样式工具链**：仓库未发现 Tailwind、PostCSS 插件、CSS Modules、Styled Components 等配置，样式编译走 uni-app 默认的 SCSS → CSS 流程。