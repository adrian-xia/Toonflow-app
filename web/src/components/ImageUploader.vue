<template>
  <div class="image-uploader">
    <el-upload
      :action="uploadUrl"
      :headers="uploadHeaders"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
      :disabled="disabled"
      accept="image/*"
    >
      <div class="upload-trigger">
        <div v-if="imageUrl" class="image-preview">
          <el-image :src="imageUrl" fit="cover" />
          <div class="image-actions">
            <el-icon @click.stop="handlePreview"><ZoomIn /></el-icon>
            <el-icon @click.stop="handleRemove"><Delete /></el-icon>
          </div>
        </div>
        <div v-else class="upload-placeholder">
          <el-icon :size="40"><Plus /></el-icon>
          <div class="upload-text">{{ placeholder }}</div>
        </div>
      </div>
    </el-upload>

    <el-dialog v-model="previewVisible" title="图片预览" width="800px">
      <el-image :src="imageUrl" fit="contain" style="width: 100%" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, ZoomIn, Delete } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  maxSize?: number // MB
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '上传图片',
  disabled: false,
  maxSize: 5
})

const emit = defineEmits<Emits>()

const userStore = useUserStore()
const previewVisible = ref(false)

const imageUrl = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val || '')
    emit('change', val || '')
  }
})

const uploadUrl = computed(() => {
  return '/api/storyboard/uploadImage'
})

const uploadHeaders = computed(() => {
  return {
    Authorization: `Bearer ${userStore.token}`
  }
})

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }

  const isLtMaxSize = file.size / 1024 / 1024 < props.maxSize
  if (!isLtMaxSize) {
    ElMessage.error(`图片大小不能超过 ${props.maxSize}MB`)
    return false
  }

  return true
}

const handleSuccess = (response: any) => {
  if (response.code === 200) {
    imageUrl.value = response.data.filePath
    ElMessage.success('上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleError = () => {
  ElMessage.error('上传失败')
}

const handlePreview = () => {
  previewVisible.value = true
}

const handleRemove = () => {
  imageUrl.value = ''
}
</script>

<style scoped lang="scss">
.image-uploader {
  .upload-trigger {
    width: 100%;
    height: 100%;
    cursor: pointer;

    .image-preview {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 4px;
      overflow: hidden;

      .el-image {
        width: 100%;
        height: 100%;
      }

      .image-actions {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        opacity: 0;
        transition: opacity 0.3s;

        .el-icon {
          font-size: 24px;
          color: #fff;
          cursor: pointer;
          transition: transform 0.3s;

          &:hover {
            transform: scale(1.2);
          }
        }
      }

      &:hover .image-actions {
        opacity: 1;
      }
    }

    .upload-placeholder {
      width: 100%;
      height: 100%;
      border: 2px dashed #dcdfe6;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #909399;
      transition: all 0.3s;

      &:hover {
        border-color: #409eff;
        color: #409eff;
      }

      .upload-text {
        font-size: 14px;
      }
    }
  }
}
</style>
