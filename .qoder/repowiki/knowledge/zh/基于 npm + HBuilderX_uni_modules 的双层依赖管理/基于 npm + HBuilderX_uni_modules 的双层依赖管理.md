---
kind: dependency_management
name: 基于 npm + HBuilderX/uni_modules 的双层依赖管理
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - img-cropper/package.json
    - uni_modules/img-cropper/components/img-cropper/img-cropper.vue
---

## 1. 使用的系统/方案

仓库采用 **npm**（配合 `package-lock.json`）作为包管理器，同时使用 **HBuilderX / DCloud 的 uni_modules 机制**来分发和消费组件。项目由两个 `package.json` 组成：
- 根目录 `package.json`：示例工程（demo），声明运行时与构建依赖。
- `img-cropper/package.json`：被发布到 DCloud 插件市场的独立组件包（`avatar-cropper`），通过 `uni_modules` 字段声明平台兼容性与零外部依赖。

构建工具链为 Vite + `@dcloudio/vite-plugin-uni`，开发脚本通过 `cross-env UNI_INPUT_DIR=.` 调用 `uni` CLI。

## 2. 关键文件

- `package.json`：示例工程的依赖清单与脚本。
- `package-lock.json`：npm 锁文件，锁定所有依赖树版本。
- `img-cropper/package.json`：组件包的元数据、DCloud 扩展配置（`dcloudext`）、uni_modules 平台矩阵。
- `uni_modules/img-cropper/components/img-cropper/img-cropper.vue`：本地同步的组件源码副本（供 HBuilderX 直接引用）。
- `.gitignore`：忽略 `node_modules` 等生成物。

## 3. 架构与约定

### 3.1 双包结构

| 位置 | 角色 | 说明 |
|---|---|---|
| 根 `package.json` | demo 应用 | 依赖 `vue ^3.5.44` 及 `@dcloudio/*` 系列 alpha 版本（`3.0.0-alpha-5030120260930001`），用于运行/构建示例页面 |
| `img-cropper/package.json` | 可发布组件包 | 名称 `avatar-cropper`，id `img-avatar-cropper`，入口 `components/img-cropper/img-cropper.vue`；`dependencies` 为空数组，声明“零依赖开箱即用” |

### 3.2 uni_modules 集成

组件以 `uni_modules/img-cropper/...` 形式存在于仓库中，这是 HBuilderX 识别并自动引入 uni-app 组件的标准路径。`img-cropper/package.json` 中的 `uni_modules.platforms.client` 明确列出支持的客户端平台（App/H5/各小程序），其中 App 端仅启用 `app-vue`（`app-nvue: n`），H5 端同时支持 pc/mobile，小程序端标记为 `u`（未知/未验证）。

### 3.3 版本策略

- 运行时依赖 `vue` 使用语义化范围 `^3.5.44`，允许小版本升级。
- `@dcloudio/*` 全家桶（`uni-app`、`uni-components`、`uni-h5`、`vite-plugin-uni`）全部固定到同一 alpha 预发布版本号 `3.0.0-alpha-5030120260930001`，保证框架内部一致性。
- 构建依赖（`vite ^5.2.8`、`sass ^1.77.0`、`cross-env ^7.0.3`）使用 `^` 范围，便于跟随上游修复。
- 组件包自身版本 `1.1.0` 与 demo 应用版本一致，但二者是独立的 npm 包，不存在父子依赖关系。

### 3.4 私有注册表 / 镜像

仓库内未发现 `.npmrc`、`.yarnrc`、`pnpm-workspace.yaml` 或任何 registry 配置；也未见 GOPRIVATE、vendor 目录等非 npm 生态的文件。因此当前依赖来源为默认 npm 公共源（可能受环境变量或全局 `.npmrc` 影响，但不在仓库中声明）。

## 4. 约定与约束

- **依赖声明位置**：示例工程依赖集中在根 `package.json` 的 `dependencies`/`devDependencies`；组件包依赖集中在 `img-cropper/package.json`，且显式保持 `dependencies: []`，体现“组件无运行时依赖”的设计约定。
- **锁文件**：根目录存在 `package-lock.json`，应随依赖变更一并提交以保证安装确定性。
- **uni_modules 平台矩阵**：`img-cropper/package.json` 的 `uni_modules.platforms` 是组件兼容性契约——新增平台需在此处登记，否则 HBuilderX 不会将其纳入目标平台构建。
- **HBuilderX 引擎要求**：`engines.HBuilderX: ^3.0.0` 限定了最低 IDE 版本。
- **脚本约定**：`dev:h5` / `build:h5` 通过 `cross-env UNI_INPUT_DIR=.` 将输入目录指向根，这是 uni-app 多包场景下的标准写法。
- **无 vendoring**：未发现 vendor 目录或手动拷贝第三方源码的做法；所有第三方代码均通过 npm 解析。
- **无工作区/monorepo 工具**：仓库没有 `pnpm-workspace.yaml`、`lerna.json`、`nx.json` 等 monorepo 配置文件，两个 `package.json` 之间没有 workspace 链接，属于松散耦合的双包结构。