<template>
  <div v-if="visible" class="loading-overlay">
    <div class="loading-content">
      <el-icon class="loading-icon" :size="50"><Loading /></el-icon>
      <div class="loading-text">{{ text }}</div>
      <div v-if="tip" class="loading-tip">{{ tip }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'

interface Props {
  visible: boolean
  text?: string
  tip?: string
}

withDefaults(defineProps<Props>(), {
  text: '加载中...',
  tip: ''
})
</script>

<style scoped lang="scss">
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 40px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    .loading-icon {
      color: #409eff;
      animation: rotate 1.5s linear infinite;
    }

    .loading-text {
      font-size: 16px;
      color: #303133;
      font-weight: 500;
    }

    .loading-tip {
      font-size: 14px;
      color: #909399;
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
