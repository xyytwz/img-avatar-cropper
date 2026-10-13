---
kind: build_system
name: uni-app + Vite 构建与 HBuilderX 组件发布流程
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - vite.config.js
    - img-cropper/package.json
---

## 1. 使用的构建系统

本项目采用 **uni-app 3.x（基于 Vue 3）** 作为跨端框架，底层构建工具为 **Vite**，通过官方插件 `@dcloudio/vite-plugin-uni` 接入。开发/构建入口统一由 uni-app CLI (`uni`) 提供，并通过 `cross-env` 设置环境变量以适配 Windows。

项目同时包含两个 npm 包：
- 根目录 `package.json`：演示工程 `img-cropper-demo`，仅用于本地调试与 H5 构建。
- `img-cropper/package.json`：实际的 uni_modules 组件包 `avatar-cropper`，遵循 DCloud 插件市场规范。

## 2. 关键文件

- `package.json`（根）：定义 `dev:h5` / `build:h5` 两个脚本，使用 `UNI_INPUT_DIR=.` 将 uni-app 源码定位到当前目录（而非默认的 `src/`），因为本仓库是 HBuilderX 原生目录结构。
- `vite.config.js`：注册 `@dcloudio/vite-plugin-uni` 插件；若未显式传入 `UNI_INPUT_DIR`，则回退到 `process.cwd()`。
- `img-cropper/package.json`：组件包的元数据，声明 `uni_modules` 平台支持矩阵（App/H5 启用，小程序标记为 `u` 表示“未知/需自行测试”），并指定依赖的 HBuilderX 版本范围 `^3.0.0`。
- `manifest.json`、`pages.json`、`App.vue`、`main.js`：uni-app 标准工程配置，不参与构建逻辑但决定多端产物形态。

## 3. 架构与约定

- **双包结构**：演示工程与组件包分离。组件位于 `img-cropper/components/img-cropper/img-cropper.vue`，同时在 `uni_modules/img-cropper/components/img-cropper/` 下有一份副本，这是 uni_modules 在 HBuilderX 中的典型组织方式。
- **HBuilderX 优先**：组件包通过 `engines.HBuilderX` 约束 IDE 版本，并通过 `dcloudext` 字段声明插件市场的分类、售价与源码信息，表明该组件预期通过 DCloud 插件市场分发。
- **平台能力矩阵**：在 `uni_modules.platforms.client` 中显式声明 App（app-vue: y, app-nvue: n）、H5（pc/mobile: y）与各小程序平台的兼容性，这既是文档也是 uni-app 编译期过滤的依据。
- **输入目录约定**：由于源码不在 `src/` 下，构建脚本强制 `UNI_INPUT_DIR=.`，使 vite 插件从仓库根读取 `pages.json`、`App.vue` 等入口。

## 4. 约定与约束

- **构建命令**：仅暴露 `dev:h5` 与 `build:h5` 两个 npm script，均通过 `cross-env UNI_INPUT_DIR=. uni [dev|build]` 调用 uni-app CLI，未见其他端（如微信小程序、App）的构建脚本。
- **依赖版本锁定**：根 `package.json` 中 `@dcloudio/uni-app`、`@dcloudio/uni-components`、`@dcloudio/uni-h5`、`@dcloudio/vite-plugin-uni` 全部固定到同一 alpha 版本号 `3.0.0-alpha-5030120260930001`，确保 uni-app 生态内部一致性。
- **无 CI/CD**：仓库中不存在 `.github/`、`.gitlab-ci.yml`、`.circleci/`、`Makefile`、`Dockerfile`、`build.sh` 等自动化构建或容器化配置。
- **无发布脚本**：未发现 `publish`、`release`、`version` 等 npm scripts，也未见 `CHANGELOG.md` 或版本自动递增逻辑；组件包版本（`1.1.0`）与演示工程版本保持一致，但无人工校验机制。
- **IDE 约束**：组件包要求 `HBuilderX ^3.0.0`，开发者需通过 HBuilderX 打开工程进行 App/小程序端的开发与打包，CLI 仅覆盖 H5 场景。