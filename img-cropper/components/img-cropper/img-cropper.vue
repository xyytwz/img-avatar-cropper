<template>
  <!-- 全屏遮罩弹窗 -->
  <view v-if="visible" class="imgc-overlay" @touchmove.stop.prevent>
    <view class="imgc-popup">
      <!-- 标题栏 -->
      <view class="imgc-header">
        <text class="imgc-title">{{ title }}</text>
        <text class="imgc-cancel" @click="handleCancel">{{ cancelText }}</text>
      </view>

      <!-- 裁剪区域 -->
      <view
        v-show="!isPreview"
        class="imgc-crop-area"
        :style="{ height: `${cropAreaHeight}px` }"
        @touchstart.stop.prevent="touchStart"
        @touchmove.stop.prevent="touchMove"
        @touchend.stop.prevent="touchEnd"
      >
        <image
          :src="imageSrc"
          class="imgc-image"
          :style="{
            left: `${centerOffsetX + translateX}px`,
            top: `${centerOffsetY + translateY}px`,
            width: `${Math.floor(imageWidth * scale)}px`,
            height: `${displayedH}px`,
          }"
        />
        <!-- 裁剪框遮罩：用 4 块半透明区域代替挖空，兼容性更好 -->
        <view class="imgc-mask" :style="maskStyle"></view>
        <!-- 裁剪框 -->
        <view
          class="imgc-frame"
          :style="{
            width: `${framePx}px`,
            height: `${framePx}px`,
            left: `${centerOffsetX}px`,
            top: `${frameTopPx}px`,
            borderColor: frameColor,
          }"
        ></view>
      </view>

      <!-- 预览区域 -->
      <view
        v-show="isPreview"
        class="imgc-preview-area"
        :style="{ height: `${cropAreaHeight}px` }"
      >
        <image
          :src="previewSrc"
          class="imgc-preview-image"
          :class="{ 'imgc-preview-circle': outputShape === 'circle' }"
          mode="aspectFit"
        />
      </view>

      <!-- 操作按钮 -->
      <view class="imgc-footer">
        <view
          class="imgc-btn imgc-btn-reset"
          @click="isPreview ? reEditCrop() : resetCrop()"
        >
          <text>{{ isPreview ? reEditText : resetText }}</text>
        </view>
        <view
          class="imgc-btn imgc-btn-confirm"
          :style="{ backgroundColor: themeColor }"
          @click="isPreview ? handleConfirm() : confirmCrop()"
        >
          <text style="color: #fff">{{ isPreview ? confirmText : cropText }}</text>
        </view>
      </view>

      <!-- 隐藏 Canvas -->
      <canvas
        :canvas-id="canvasId"
        class="imgc-canvas"
        :style="{ width: `${outputWidth}px`, height: `${outputHeight}px` }"
      ></canvas>
    </view>
  </view>
</template>

<script lang="ts">
/**
 * img-cropper - 图片裁剪组件
 *
 * 支持平台：H5、APP（含 Android 10）
 *
 * 【核心设计】
 * - CSS 宽高直接设为缩放后像素值（不用 transform:scale），确保 APP 端布局盒 = 视觉尺寸
 * - 所有尺寸用 Math.floor 取整，避免 APP 端浮点像素取整方向不一致导致偏移
 * - 帧-图交叉区域算法计算裁剪输出，确保预览/生成图片与裁剪框视觉内容一致
 * - canvas 输出使用真正居中公式：dy = (framePx - intersectH) * outputScale / 2
 *
 * 【APP 端兼容要点】
 * - 禁用 transform: scale()：Android 10 APP 端不可靠
 * - 禁用 CSS inset:0：APP 端不支持
 * - 禁用 margin:auto 居中：APP 端 absolute 元素无效
 * - setup 阶段捕获 instance：事件处理器中 getCurrentInstance() 可能返回 null
 */
import { computed, defineComponent, getCurrentInstance, nextTick, ref } from 'vue';

export default defineComponent({
  name: 'ImgCropper'
  props: {
    /** 输出图片宽度，单位 px */
    outputWidth: { type: Number, default: 800 },
    /** 输出图片高度，单位 px */
    outputHeight: { type: Number, default: 800 },
    /** 裁剪框尺寸，单位 rpx */
    frameSize: { type: Number, default: 560 },
    /** 裁剪框形状：square | circle */
    outputShape: { type: String, default: 'square' },
    /** 图片输出质量 0~1 */
    quality: { type: Number, default: 0.9 },
    /** 图片输出格式 jpg | png */
    fileType: { type: String, default: 'jpg' },
    /** 主题色 */
    themeColor: { type: String, default: '#07c160' },
    /** 裁剪框边框颜色 */
    frameColor: { type: String, default: '#ffffff' },
    /** 弹窗标题 */
    title: { type: String, default: '裁剪图片' },
    /** 按钮文案 */
    cancelText: { type: String, default: '取消' },
    resetText: { type: String, default: '重置' },
    reEditText: { type: String, default: '重新裁剪' },
    cropText: { type: String, default: '确认' },
    confirmText: { type: String, default: '确认使用' },
  },
  emits: ['complete', 'cancel', 'error'],
  setup(props, { emit, expose }) {
    const instance = getCurrentInstance()!;
    const canvasId = `imgc-${Date.now()}`; // 唯一 canvas-id 避免多实例冲突

    // ─── 状态 ───
    const visible = ref(false);
    const imageSrc = ref('');
    const previewSrc = ref('');
    const isPreview = ref(false);
    const originWidth = ref(0);
    const originHeight = ref(0);
    const imageWidth = ref(0);
    const imageHeight = ref(0);
    const translateX = ref(0);
    const translateY = ref(0);
    const scale = ref(1);

    // ─── 触摸状态 ───
    const touchStartX = ref(0);
    const touchStartY = ref(0);
    const touchStartTranslateX = ref(0);
    const touchStartTranslateY = ref(0);
    const touchStartScale = ref(1);
    const touchStartDistance = ref(0);
    const isMultiTouch = ref(false);

    // ─── 布局计算 ───
    const framePx = computed(() => Math.floor(uni.upx2px(props.frameSize)));
    const sysInfo = uni.getSystemInfoSync();
    const paddingH = Math.floor(uni.upx2px(80)); // 水平 padding 40rpx * 2
    const cropAreaWidth = Math.floor(sysInfo.windowWidth - paddingH);
    const centerOffsetX = computed(() => Math.floor((cropAreaWidth - framePx.value) / 2));
    const cropAreaHeight = ref(0);

    /** 裁剪框顶部位置 */
    const frameTopPx = computed(() => Math.floor((cropAreaHeight.value - framePx.value) / 2));

    /** 缩放后的显示高度（Math.floor 取整，三处统一使用） */
    const displayedH = computed(() => Math.floor(imageHeight.value * scale.value));

    /** 垂直居中偏移 */
    const centerOffsetY = computed(() => {
      return Math.floor(frameTopPx.value + (framePx.value - displayedH.value) / 2);
    });

    /** 遮罩样式（4 块半透明区域围住裁剪框） */
    const maskStyle = computed(() => ({
      position: 'absolute' as const,
      top: '0',
      right: '0',
      bottom: '0',
      left: '0',
      backgroundColor: 'rgba(0,0,0,0.5)',
    }));

    // ─── 公共方法 ───
    const open = (src: string) => {
      imageSrc.value = src;
      isPreview.value = false;
      previewSrc.value = '';
      resetCrop();
      visible.value = true;

      nextTick(() => {
        uni.getImageInfo({
          src,
          success: (info) => {
            originWidth.value = info.width;
            originHeight.value = info.height;
            const ratio = info.width / info.height;
            imageWidth.value = framePx.value;
            imageHeight.value = framePx.value / ratio;
            cropAreaHeight.value = framePx.value + uni.upx2px(80);
            translateX.value = 0;
            translateY.value = 0;
          },
          fail: (err) => {
            emit('error', { type: 'getImageInfo', detail: err });
          },
        });
      });
    };

    const close = () => {
      visible.value = false;
      isPreview.value = false;
      previewSrc.value = '';
    };

    const handleCancel = () => {
      emit('cancel');
      close();
    };

    const resetCrop = () => {
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
    };

    const reEditCrop = () => {
      isPreview.value = false;
      previewSrc.value = '';
    };

    const handleConfirm = () => {
      if (!previewSrc.value) return;
      emit('complete', previewSrc.value);
      close();
    };

    // ─── 触摸交互 ───
    const touchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isMultiTouch.value = false;
        touchStartX.value = e.touches[0].clientX;
        touchStartY.value = e.touches[0].clientY;
        touchStartTranslateX.value = translateX.value;
        touchStartTranslateY.value = translateY.value;
      } else if (e.touches.length === 2) {
        isMultiTouch.value = true;
        touchStartScale.value = scale.value;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistance.value = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const touchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && !isMultiTouch.value) {
        translateX.value = touchStartTranslateX.value + e.touches[0].clientX - touchStartX.value;
        translateY.value = touchStartTranslateY.value + e.touches[0].clientY - touchStartY.value;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newScale =
          touchStartScale.value * (Math.sqrt(dx * dx + dy * dy) / touchStartDistance.value);
        if (newScale >= 1 && newScale <= 3) {
          scale.value = newScale;
        }
      }
    };

    const touchEnd = () => {
      isMultiTouch.value = false;
    };

    // ─── 裁剪逻辑 ───
    const confirmCrop = async () => {
      uni.showLoading({ title: '裁剪中...' });
      try {
        const tempFilePath = await cropImage();
        if (!tempFilePath) throw new Error('裁剪结果为空');
        uni.hideLoading();
        previewSrc.value = tempFilePath;
        isPreview.value = true;
      } catch (error) {
        uni.hideLoading();
        uni.showToast({ title: '裁剪失败', icon: 'none' });
        emit('error', { type: 'crop', detail: error });
      }
    };

    /** 将 canvas 内容导出为临时图片 */
    const exportCanvas = (cid: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          uni.canvasToTempFilePath(
            {
              canvasId: cid,
              x: 0,
              y: 0,
              width: props.outputWidth,
              height: props.outputHeight,
              destWidth: props.outputWidth,
              destHeight: props.outputHeight,
              fileType: props.fileType as 'jpg' | 'png',
              quality: props.quality,
              success: (res) => resolve(res.tempFilePath),
              fail: (err) => reject(err),
            },
            instance
          );
        }, 200);
      });
    };

    /**
     * 帧-图交叉区域算法
     *
     * 计算裁剪框与图片在屏幕坐标系下的交叉矩形：
     * - 源矩形：交叉区域映射回原图坐标
     * - 目标矩形：交叉区域在输出画布中居中放置
     *
     * 居中公式：
     *   dx = (framePx - intersectW) * outputScale / 2
     *   dy = (framePx - intersectH) * outputScale / 2
     */
    const cropImage = (): Promise<string> => {
      return new Promise((resolve, reject) => {
        const imgLeft = centerOffsetX.value + translateX.value;
        const imgTop = centerOffsetY.value + translateY.value;
        const dW = Math.floor(imageWidth.value * scale.value);
        const dH = displayedH.value;

        const fLeft = centerOffsetX.value;
        const fTop = frameTopPx.value;
        const fp = framePx.value;

        const iL = Math.max(fLeft, imgLeft);
        const iT = Math.max(fTop, imgTop);
        const iR = Math.min(fLeft + fp, imgLeft + dW);
        const iB = Math.min(fTop + fp, imgTop + dH);

        const ctx = uni.createCanvasContext(canvasId, instance);
        ctx.clearRect(0, 0, props.outputWidth, props.outputHeight);

        const ratio = originWidth.value / dW;

        if (iR > iL && iB > iT) {
          const sx = (iL - imgLeft) * ratio;
          const sy = (iT - imgTop) * ratio;
          const sw = (iR - iL) * ratio;
          const sh = (iB - iT) * ratio;
          const outputScale = props.outputWidth / fp;
          const iw = iR - iL;
          const ih = iB - iT;
          const dx = ((fp - iw) * outputScale) / 2;
          const dy = ((fp - ih) * outputScale) / 2;
          ctx.drawImage(imageSrc.value, sx, sy, sw, sh, dx, dy, iw * outputScale, ih * outputScale);
        }

        ctx.draw(false, () => {
          exportCanvas(canvasId).then(resolve).catch(reject);
        });
      });
    };

    expose({ open, close });

    return {
      visible, imageSrc, previewSrc, isPreview,
      imageWidth, scale, translateX, translateY,
      centerOffsetX, centerOffsetY, displayedH,
      framePx, frameTopPx, cropAreaHeight,
      canvasId, maskStyle,
      touchStart, touchMove, touchEnd,
      resetCrop, reEditCrop, confirmCrop,
      handleCancel, handleConfirm,
    };
  },
});
</script>

<style scoped>
.imgc-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.imgc-popup {
  width: 100%;
  padding: 32rpx 40rpx 60rpx;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
}

.imgc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.imgc-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.imgc-cancel {
  font-size: 30rpx;
  color: #999;
  padding: 8rpx 16rpx;
}

.imgc-crop-area {
  position: relative;
  width: 100%;
  background: #f5f5f5;
  border-radius: 16rpx;
  overflow: hidden;
}

.imgc-image {
  position: absolute;
}

.imgc-mask {
  pointer-events: none;
}

.imgc-frame {
  position: absolute;
  border: 2px solid #fff;
  box-sizing: border-box;
  pointer-events: none;
}

.imgc-preview-area {
  width: 100%;
  background: #f5f5f5;
  border-radius: 16rpx;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.imgc-preview-image {
  width: 400rpx;
  height: 400rpx;
}

.imgc-preview-circle {
  border-radius: 50%;
}

.imgc-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 40rpx;
}

.imgc-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 12rpx;
}

.imgc-btn-reset {
  background: #f5f5f5;
  color: #666;
}

.imgc-btn-confirm {
  color: #fff;
}

.imgc-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  pointer-events: none;
}
</style>
