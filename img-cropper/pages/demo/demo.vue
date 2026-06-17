<template>
  <view class="demo-page">
    <view class="section">
      <text class="section-title">img-cropper 示例</text>

      <!-- 当前头像展示 -->
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
    </view>

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

<script lang="ts" setup>
  import { ref } from 'vue';

  const cropperRef = ref<any>(null);
  const avatarUrl = ref('');

  const chooseImage = () => {
    uni.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 打开裁剪组件
        cropperRef.value?.open(tempFilePath);
      },
    });
  };

  const onCropComplete = (tempFilePath: string) => {
    avatarUrl.value = tempFilePath;
    uni.showToast({ title: '裁剪完成', icon: 'success' });
    // 这里可以调用上传接口
    // uni.uploadFile({ url: '...', filePath: tempFilePath, ... })
  };

  const onCropCancel = () => {
    console.log('用户取消裁剪');
  };

  const onCropError = (error: any) => {
    console.error('裁剪出错:', error);
  };
</script>

<style scoped>
  .demo-page {
    padding: 40rpx;
    min-height: 100vh;
    background: #f7f7f7;
  }

  .section {
    background: #fff;
    border-radius: 20rpx;
    padding: 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .section-title {
    font-size: 36rpx;
    font-weight: 600;
    color: #333;
    margin-bottom: 40rpx;
  }

  .avatar-box {
    margin-bottom: 40rpx;
  }

  .avatar {
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
  }

  .avatar-placeholder {
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .placeholder-text {
    font-size: 24rpx;
    color: #999;
  }

  .choose-btn {
    width: 80%;
    height: 88rpx;
    line-height: 88rpx;
    background: #07c160;
    color: #fff;
    border-radius: 44rpx;
    font-size: 32rpx;
    border: none;
  }

  .choose-btn::after {
    border: none;
  }
</style>
