---
kind: external_dependency
name: uni-app (Vue 3) 跨端框架
slug: uni-app
category: external_dependency
category_hints:
    - framework_behavior
scope:
    - '**'
source_files:
    - package.json
    - vite.config.js
    - manifest.json
    - pages.json
---

### 身份与角色
- 本项目是 `avatar-cropper`（img-avatar-cropper）图片裁剪插件的示例工程，基于 uni-app + Vue 3 构建，目标平台为 H5、APP（Android/iOS），小程序端标记为「待验证」。

### 集成要点
- `manifest.json` 声明了 app-plus（含 Android 权限）、mp-weixin/mp-alipay/mp-baidu/mp-toutiao 等小程序通道，以及 `vueVersion: 3`。
- 组件通过 `uni_modules/img-cropper` 目录配合 `pages.json` 中的 `easycom.autoscan: true` 自动注册，同时 `img-cropper/` 子目录作为可独立发布到 dcloud 插件市场的发布副本存在。

### 已知约束