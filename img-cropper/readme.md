# img-cropper 图片裁剪组件

> 支持 APP（含 Android 10）和 H5 端的图片裁剪组件，零外部依赖，开箱即用。

## 特性

- **零依赖**：自带弹窗，无需 uView 等 UI 库
- **跨端兼容**：H5 + APP（含 Android 10 WebView）均已验证
- **精准裁剪**：帧-图交叉区域算法，预览/生成图片与裁剪框视觉内容完全一致
- **垂直居中**：任意尺寸图片（横版/竖版/正方形）在裁剪框中始终居中
- **手势交互**：单指拖拽 + 双指缩放（最小宽度 = 裁剪框宽度）
- **图片旋转**：点击旋转按钮每次顺时针旋转 90°，canvas 变换确保导出图片与预览一致
- **可配置**：裁剪框尺寸、输出尺寸、主题色、输出形状、按钮文案等均可自定义

## 安装

将 `img-cropper` 目录复制到项目的 `uni_modules` 目录下即可，easycom 自动注册。

```
uni_modules/
└── img-cropper/
    ├── components/
    │   └── img-cropper/
    │       └── img-cropper.vue
    ├── pages/
    │   └── demo/
    │       └── demo.vue       # 插件自带演示页
    ├── package.json
    └── readme.md
```

## 基本用法

```vue
<template>
  <view>
    <button @click="chooseImage">选择图片</button>

    <img-cropper
      ref="cropperRef"
      @complete="onComplete"
      @cancel="onCancel"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue';

const cropperRef = ref(null);

const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['original'],
    success: (res) => {
      cropperRef.value?.open(res.tempFilePaths[0]);
    },
  });
};

const onComplete = (tempFilePath) => {
  console.log('裁剪完成:', tempFilePath);
  // 调用上传接口...
};

const onCancel = () => {
  console.log('用户取消');
};
</script>
```

## API

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| outputWidth | Number | 800 | 输出图片宽度（px） |
| outputHeight | Number | 800 | 输出图片高度（px） |
| frameSize | Number | 560 | 裁剪框尺寸（rpx） |
| outputShape | String | `'square'` | 裁剪框形状：`square` / `circle` |
| quality | Number | 0.9 | 图片输出质量（0~1） |
| fileType | String | `'jpg'` | 输出格式：`jpg` / `png` |
| themeColor | String | `'#07c160'` | 确认按钮主题色 |
| frameColor | String | `'#ffffff'` | 裁剪框边框颜色 |
| title | String | `'裁剪图片'` | 弹窗标题 |
| cancelText | String | `'取消'` | 取消按钮文案 |
| resetText | String | `'重置'` | 重置按钮文案（同时重置缩放、位移和旋转） |
| reEditText | String | `'重新裁剪'` | 重新裁剪按钮文案 |
| cropText | String | `'确认'` | 确认裁剪按钮文案 |
| confirmText | String | `'确认使用'` | 确认使用按钮文案 |

### Events

| 事件 | 参数 | 说明 |
|------|------|------|
| complete | `tempFilePath: string` | 裁剪完成，返回临时图片路径 |
| cancel | - | 用户取消裁剪 |
| error | `{ type: string, detail: any }` | 裁剪出错（type: `'getImageInfo'` / `'crop'`） |

### Methods

| 方法 | 参数 | 说明 |
|------|------|------|
| open | `src: string` | 打开裁剪弹窗，传入图片路径（本地或临时路径） |
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

## 技术说明

### 帧-图交叉区域算法

组件使用帧-图交叉区域算法确保裁剪输出与裁剪框视觉内容完全一致：

1. 计算裁剪框与图片在屏幕坐标系下的交叉矩形
2. 源矩形：交叉区域映射回原图坐标（drawImage 的 sx/sy/sw/sh）
3. 目标矩形：交叉区域在输出画布中居中放置

居中公式：
```
dx = (framePx - intersectW) * outputScale / 2
dy = (framePx - intersectH) * outputScale / 2
```

### 图片旋转实现

- **预览**：CSS `transform: rotate()` 实时旋转显示
- **导出**：canvas `ctx.rotate()` + `ctx.translate()` 变换，确保 90°/180°/270° 旋转后导出图片与预览完全一致
- **重置**：点击「重置」按钮同时清除旋转角度

### APP 端兼容处理

| 问题 | 解决方案 |
|------|---------|
| `transform: scale()` 布局盒不跟随变化 | CSS 宽高直接设为缩放后像素值 |
| 浮点像素取整方向不一致 | 所有尺寸统一使用 `Math.floor` 取整 |
| `inset: 0` 不支持 | 显式写 `top/right/bottom/left` |
| `margin: auto` 居中失效 | 使用 JS 计算居中偏移 |
| `getCurrentInstance()` 事件处理器中返回 null | setup 阶段提前捕获 |

## 常见问题

### 图片不显示

**原因**：`cropAreaHeight` 在异步回调中赋值，导致 computed 计算出负数偏移

**解决**：已在 `open()` 中立即设置初始值，无需额外处理

### TypeScript 报错

**问题**：提示找不到 `uni` 或 `vue` 模块

**解决**：不影响运行，可忽略。如需类型支持，安装 `@dcloudio/types`

### 裁剪结果与预览不一致

组件使用帧-图交叉区域算法，确保预览与生成图片完全一致。如遇问题，请检查：
- 图片路径是否正确
- 输出尺寸是否合理

## 许可证

MIT

## 更新日志

### v1.1.0 (2026-07-13)

- ✨ 新增图片旋转功能，点击「旋转」按钮每次顺时针旋转 90°
- ✨ 增大裁剪区域上下留白，操作空间更大
- ✅ canvas 旋转变换确保导出图片与预览完全一致

### v1.0.0 (2026-06-17)

- ✨ 初始版本发布
- ✅ 支持 H5 和 APP 端
- ✅ 帧-图交叉区域算法
- ✅ 单指拖拽 + 双指缩放
- ✅ 圆形/方形裁剪
