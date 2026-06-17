# 头像裁剪插件示例工程

> 基于 uni-app 的头像裁剪组件演示项目，展示如何快速集成和使用 `avatar-cropper` 插件。

## 项目简介

本项目是 [avatar-cropper](https://github.com/xyytwz/img-avatar-cropper) 图片裁剪插件的示例工程，演示如何在 uni-app 项目中集成和使用该组件。

## 功能特性

- ✅ 头像裁剪（圆形/方形）
- ✅ 单指拖拽移动图片
- ✅ 双指缩放调整大小
- ✅ 裁剪预览
- ✅ 零依赖开箱即用
- ✅ 支持 H5 和 APP（含 Android 10）

## 技术栈

- **框架**：uni-app (Vue 3)
- **组件**：avatar-cropper（自定义图片裁剪组件）
- **构建工具**：HBuilderX

## 快速开始

### 环境要求

- HBuilderX 3.0+
- Node.js（HBuilderX 内置）

### 运行步骤

1. **克隆项目**

```bash
git clone https://github.com/xyytwz/img-avatar-cropper.git
cd img-avatar-cropper-demo
```

2. **打开项目**

使用 HBuilderX 打开项目根目录

3. **运行项目**

- 菜单栏 → 运行 → 运行到浏览器 → 选择浏览器
- 或运行到手机/模拟器

## 项目结构

```
img-cropper-demo/
├── pages/
│   └── index/
│       └── index.vue          # 示例页面（头像裁剪演示）
├── uni_modules/
│   └── img-cropper/           # 裁剪组件插件
│       └── components/
│           └── img-cropper/
│               └── img-cropper.vue
├── static/                    # 静态资源
├── App.vue                    # 应用入口
├── main.js                    # 主入口文件
├── pages.json                 # 页面配置
├── manifest.json              # 应用配置
└── package.json               # 插件配置
```

## 核心代码示例

### 1. 页面中使用组件

```vue
<template>
  <view class="demo-page">
    <!-- 头像展示 -->
    <view class="avatar-box">
      <image
        v-if="avatarUrl"
        :src="avatarUrl"
        class="avatar"
        mode="aspectFill"
      />
      <view v-else class="avatar avatar-placeholder">
        <text class="placeholder-text">点击选择图片</text>
      </view>
    </view>

    <!-- 选择图片按钮 -->
    <button class="choose-btn" @click="chooseImage">选择图片并裁剪</button>

    <!-- 图片裁剪组件 -->
    <img-cropper
      ref="cropperRef"
      :output-width="800"
      :output-height="800"
      :frame-size="560"
      output-shape="circle"
      theme-color="#07c160"
      title="裁剪头像"
      @complete="onCropComplete"
      @cancel="onCropCancel"
      @error="onCropError"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue';

const cropperRef = ref(null);
const avatarUrl = ref('');

const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['original'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0];
      cropperRef.value?.open(tempFilePath);
    },
  });
};

const onCropComplete = (tempFilePath) => {
  avatarUrl.value = tempFilePath;
  uni.showToast({ title: '裁剪完成', icon: 'success' });
  // 这里可以调用上传接口
  // uni.uploadFile({ url: '...', filePath: tempFilePath, ... })
};

const onCropCancel = () => {
  console.log('用户取消裁剪');
};

const onCropError = (error) => {
  console.error('裁剪出错:', error);
};
</script>
```

### 2. easycom 自动注册

在 `pages.json` 中配置 easycom：

```json
{
  "easycom": {
    "autoscan": true,
    "custom": {}
  }
}
```

组件目录结构必须为：
```
uni_modules/
└── img-cropper/
    └── components/
        └── img-cropper/
            └── img-cropper.vue
```

## 组件 API

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| outputWidth | Number | 800 | 输出图片宽度（px） |
| outputHeight | Number | 800 | 输出图片高度（px） |
| frameSize | Number | 560 | 裁剪框尺寸（rpx） |
| outputShape | String | 'square' | 预览形状：`square` / `circle` |
| quality | Number | 0.9 | 图片输出质量（0~1） |
| fileType | String | 'jpg' | 输出格式：`jpg` / `png` |
| themeColor | String | '#07c160' | 确认按钮主题色 |
| frameColor | String | '#ffffff' | 裁剪框边框颜色 |
| title | String | '裁剪图片' | 弹窗标题 |

### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| complete | tempFilePath: string | 裁剪完成，返回临时图片路径 |
| cancel | - | 用户取消裁剪 |
| error | { type: string, detail: any } | 裁剪出错 |

### Methods

| 方法 | 参数 | 说明 |
|------|------|------|
| open | src: string | 打开裁剪弹窗 |
| close | - | 关闭裁剪弹窗 |

## 支持平台

| 平台 | 支持状态 |
|------|---------|
| H5 | ✅ 支持 |
| APP（Android） | ✅ 支持（含 Android 10） |
| APP（iOS） | ✅ 支持 |
| 微信小程序 | ⚠️ 待验证 |
| 支付宝小程序 | ⚠️ 待验证 |
| uni-app x | ❌ 不支持（需改用 Canvas 2D API） |

## 常见问题

### 1. 图片不显示

**问题**：打开裁剪弹窗后图片不可见

**原因**：`cropAreaHeight` 在异步回调中赋值，导致 computed 计算出负数偏移

**解决**：已在 `open()` 中立即设置初始值

### 2. TypeScript 报错

**问题**：提示找不到 `uni` 或 `vue` 模块

**原因**：项目未配置 TypeScript 类型声明

**解决**：不影响运行，可忽略。如需类型支持，安装 `@dcloudio/types`

### 3. 裁剪结果与预览不一致

组件使用帧-图交叉区域算法，确保预览与生成图片完全一致。如遇问题，请检查：
- 图片路径是否正确
- 输出尺寸是否合理

## 插件文档

完整插件文档请查看：[img-cropper/readme.md](img-cropper/readme.md)

## 仓库地址

- **GitHub**：https://github.com/xyytwz/img-avatar-cropper.git
- **作者**：xyytwz

## 许可证

MIT

## 更新日志

### v1.0.0 (2026-06-17)

- ✨ 初始版本发布
- ✅ 支持 H5 和 APP 端
- ✅ 帧-图交叉区域算法
- ✅ 单指拖拽 + 双指缩放
- ✅ 圆形/方形裁剪
