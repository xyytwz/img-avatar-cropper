---
kind: configuration_system
name: uni-app 工程配置体系（manifest.json / pages.json / vite.config.js）
category: configuration_system
scope:
    - '**'
source_files:
    - manifest.json
    - pages.json
    - vite.config.js
    - package.json
    - main.js
    - uni.promisify.adaptor.js
---

## 1. 使用的系统与框架

本仓库是一个基于 **uni-app + Vue3** 的示例工程，其“配置系统”并非自研框架，而是由 uni-app 运行时与 Vite 构建链共同提供：
- 应用元信息、多端打包权限与平台开关集中在 `manifest.json`。
- 页面路由、全局样式与 easycom 组件自动扫描在 `pages.json`。
- H5 构建入口与 uni 插件挂载在 `vite.config.js`。
- 应用启动入口在 `main.js`，通过条件编译区分 Vue2/Vue3 初始化路径。

没有 `.env`、`.yaml`、`.toml`、`application.properties` 等通用运行时配置文件；也没有自定义的配置加载器或环境变量解析逻辑。因此该仓库的配置是**声明式 JSON 配置 + 少量构建期脚本**的组合。

## 2. 关键文件

| 文件 | 作用 |
|---|---|
| `manifest.json` | uni-app 主清单：应用名、版本号、app-plus/小程序各平台的模块、权限、SDK 配置 |
| `pages.json` | 页面路由表、`globalStyle` 导航栏样式、`easycom` 自动扫描、`uniIdRouter` |
| `vite.config.js` | Vite 配置，注入 `@dcloudio/vite-plugin-uni`，设置 `UNI_INPUT_DIR` |
| `package.json` | npm 依赖、`dev:h5` / `build:h5` 脚本（通过 `cross-env UNI_INPUT_DIR=.` 驱动） |
| `main.js` | 应用入口，按 `#ifdef VUE3` 条件编译选择创建方式 |
| `App.vue` | 根组件（未展开阅读，但作为 uni-app 约定入口存在） |
| `uni.promisify.adaptor.js` | 为 Vue2 兼容层提供 uni API Promise 化适配 |
| `uni.scss` | 全局 SCSS 变量/样式入口（uni-app 约定） |

## 3. 架构与约定

### 3.1 多端配置分层（manifest.json）

`manifest.json` 采用 uni-app 的标准分层结构：
- 顶层字段：`name`、`appid`、`versionName`、`versionCode`、`transformPx`、`vueVersion: "3"`。
- `app-plus`：HBuilderX 5+ App 专属配置，包含 `usingComponents`、`splashscreen`、`modules`、`distribute.android.permissions`（声明相机、网络、振动、闪光灯等原生权限）、`distribute.ios`、`sdkConfigs`。
- `quickapp`：快应用占位对象。
- `mp-weixin` / `mp-alipay` / `mp-baidu` / `mp-toutiao`：各小程序平台的独立配置块，当前仅开启 `usingComponents: true`，微信小程序额外关闭 `urlCheck`。
- `uniStatistics.enable: false`：统计功能默认关闭。

所有平台相关配置集中于此，业务代码不直接读取这些值。

### 3.2 路由与 UI 风格（pages.json）

- `pages` 数组定义路由页，当前仅注册 `pages/index/index`，并设置 `navigationBarTitleText`。
- `globalStyle` 统一导航栏文本颜色、标题、背景色与页面底色。
- `easycom.autoscan: true` 启用组件自动扫描，无需手动 import。
- `uniIdRouter` 为空对象，保留扩展点。

### 3.3 构建期配置（vite.config.js + package.json）

- `vite.config.js` 仅做最小化配置：导入 `@dcloudio/vite-plugin-uni` 并注册插件。
- 通过 `process.env.UNI_INPUT_DIR = process.env.UNI_INPUT_DIR || process.cwd()` 将源码目录指向项目根目录（注释说明这是 HBuilderX 目录结构，源码不在 `src/` 下）。
- `package.json` 的 scripts 使用 `cross-env UNI_INPUT_DIR=. uni build/dev` 调用 uni CLI。

### 3.4 运行时入口（main.js）

- 使用 uni-app 的条件编译指令 `#ifndef VUE3` / `#ifdef VUE3` 分支处理 Vue2 与 Vue3 两种初始化路径。
- Vue2 路径：引入 `Vue`、`./uni.promisify.adaptor`，设置 `Vue.config.productionTip = false`，设置 `App.mpType = 'app'` 后 `new Vue(...).$mount()`。
- Vue3 路径：使用 `createSSRApp(App)` 暴露 `createApp` 函数供 uni-app 运行时调用。

## 4. 约定与约束

- **清单即配置**：所有平台差异通过 `manifest.json` 中的命名空间键（`app-plus`、`mp-*`）表达，新增平台需在此追加同名配置块——这是 uni-app 框架约定的强制行为。
- **路由即页面**：`pages.json` 中声明的路径必须对应真实存在的 `.vue` 文件，否则 uni-app 编译期报错（由 uni-app 编译器保证）。
- **easycom 自动扫描**：`pages.json` 中 `easycom.autoscan: true` 启用了组件自动发现，组件只需放在可被扫描的目录下即可按需引用，无需显式 `import`。
- **源码位于根目录**：`vite.config.js` 注释明确说明本项目为 HBuilderX 目录结构，源码位于根目录而非 `src/`，并通过 `UNI_INPUT_DIR` 指定输入目录——这是构建期的硬性约定。
- **无运行时配置中心**：仓库内未发现任何自定义配置加载器、环境变量解析、远程配置拉取或 feature flag 机制；运行时行为完全由 uni-app 框架根据上述 JSON 配置与条件编译产物决定。
- **权限声明不可省略**：Android 打包所需的原生权限（如 `CAMERA`、`ACCESS_NETWORK_STATE` 等）必须在 `manifest.json` → `app-plus.distribute.android.permissions` 中声明，否则打包产物缺少相应权限——这是 DCloud 打包流程的强制校验。