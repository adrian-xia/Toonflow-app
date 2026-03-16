<template>
  <div class="assets-page">
    <el-empty v-if="!projectId" description="请先选择项目">
      <el-button type="primary" @click="goToProject">选择项目</el-button>
    </el-empty>

    <div v-else class="assets-container">
      <div class="toolbar">
        <el-radio-group v-model="assetType" @change="fetchAssetsList">
          <el-radio-button value="角色">角色</el-radio-button>
          <el-radio-button value="道具">道具</el-radio-button>
          <el-radio-button value="场景">场景</el-radio-button>
        </el-radio-group>
        <el-button type="primary" @click="showAddDialog" style="margin-left: 16px">
          <el-icon><Plus /></el-icon>
          添加素材
        </el-button>
      </div>

      <div v-if="assetsList.length > 0" class="assets-grid" v-loading="loading">
        <el-card v-for="item in assetsList" :key="item.id" class="asset-card">
          <div class="asset-image">
            <el-image
              v-if="item.filePath"
              :src="item.filePath"
              fit="cover"
              :preview-src-list="[item.filePath]"
            />
            <div v-else class="no-image">
              <el-icon :size="40"><Picture /></el-icon>
              <p>暂无图片</p>
            </div>
          </div>
          <div class="asset-info">
            <div class="asset-name">{{ item.name }}</div>
            <div class="asset-intro">{{ item.intro || '暂无描述' }}</div>
            <div class="asset-actions">
              <el-button
                type="primary"
                size="small"
                @click="generateImage(item)"
                :loading="generatingId === item.id"
                :disabled="!!generatingId"
              >
                <el-icon><MagicStick /></el-icon>
                生成图片
              </el-button>
              <el-button
                type="success"
                size="small"
                link
                @click="uploadImage(item)"
              >
                上传
              </el-button>
              <el-button type="primary" link size="small" @click="showEditDialog(item)">
                编辑
              </el-button>
              <el-button type="danger" link size="small" @click="handleDelete(item.id)">
                删除
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <el-empty v-else description="暂无素材" v-loading="loading">
        <el-button type="primary" @click="showAddDialog">添加素材</el-button>
      </el-empty>
    </div>

    <!-- 添加/编辑素材对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑素材' : '添加素材'"
      width="600px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="素材名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入素材名称" />
        </el-form-item>
        <el-form-item label="素材描述">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
            placeholder="请输入素材描述"
          />
        </el-form-item>
        <el-form-item label="图像提示词">
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="4"
            placeholder="请输入图像生成提示词"
          />
          <div class="form-tip">
            提示：详细的提示词可以生成更准确的图像
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 上传图片对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传图片" width="500px">
      <el-upload
        class="upload-demo"
        drag
        :action="uploadAction"
        :headers="uploadHeaders"
        :data="uploadData"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
        :before-upload="beforeUpload"
        accept="image/*"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 jpg/png 格式，文件大小不超过 10MB
          </div>
        </template>
      </el-upload>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, UploadProps } from 'element-plus'
import { Plus, Picture, MagicStick, UploadFilled } from '@element-plus/icons-vue'
import {
  getAssetsList,
  addAssets,
  updateAssets,
  deleteAssets,
  generateAssets
} from '@/api/assets'
import type { Asset } from '@/types/assets'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const uploadDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const projectId = ref<number>(0)
const assetType = ref<string>('角色')
const assetsList = ref<Asset[]>([])
const generatingId = ref<number | null>(null)
const currentUploadAsset = ref<Asset | null>(null)

const form = reactive({
  name: '',
  intro: '',
  prompt: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入素材名称', trigger: 'blur' }
  ]
}

// 上传配置
const uploadAction = computed(() => '/api/assets/uploadImage')
const uploadHeaders = computed(() => ({
  Authorization: localStorage.getItem('token') || ''
}))
const uploadData = computed(() => ({
  id: currentUploadAsset.value?.id,
  projectId: projectId.value,
  type: getAssetTypeCode(assetType.value)
}))

// 获取素材类型代码
const getAssetTypeCode = (type: string): string => {
  const typeMap: Record<string, string> = {
    '角色': 'role',
    '道具': 'props',
    '场景': 'scene'
  }
  return typeMap[type] || 'role'
}

const fetchAssetsList = async () => {
  if (!projectId.value) return
  loading.value = true
  try {
    const { data } = await getAssetsList({
      projectId: projectId.value,
      type: assetType.value
    })
    assetsList.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '获取素材列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  editId.value = null
  Object.assign(form, {
    name: '',
    intro: '',
    prompt: ''
  })
  dialogVisible.value = true
}

const showEditDialog = (asset: Asset) => {
  isEdit.value = true
  editId.value = asset.id
  Object.assign(form, {
    name: asset.name,
    intro: asset.intro || '',
    prompt: asset.prompt || ''
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value && editId.value) {
      await updateAssets({ id: editId.value, ...form })
      ElMessage.success('更新成功')
    } else {
      await addAssets({
        ...form,
        type: assetType.value,
        projectId: projectId.value
      })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchAssetsList()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// 生成图片
const generateImage = async (asset: Asset) => {
  if (!asset.prompt) {
    ElMessage.warning('请先设置图像提示词')
    showEditDialog(asset)
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要生成图片吗？这可能需要一些时间。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    generatingId.value = asset.id
    await generateAssets({
      id: asset.id,
      type: getAssetTypeCode(assetType.value) as any,
      projectId: projectId.value,
      name: asset.name,
      prompt: asset.prompt,
      base64: null
    })

    ElMessage.success('图片生成成功')
    await fetchAssetsList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '生成图片失败')
    }
  } finally {
    generatingId.value = null
  }
}

// 上传图片
const uploadImage = (asset: Asset) => {
  currentUploadAsset.value = asset
  uploadDialogVisible.value = true
}

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB')
    return false
  }
  return true
}

const handleUploadSuccess = (response: any) => {
  if (response.code === 200) {
    ElMessage.success('上传成功')
    uploadDialogVisible.value = false
    fetchAssetsList()
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleUploadError = () => {
  ElMessage.error('上传失败')
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此素材吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteAssets(id)
    ElMessage.success('删除成功')
    fetchAssetsList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const goToProject = () => {
  router.push('/project')
}

watch(() => route.query.projectId, (val) => {
  if (val) {
    projectId.value = Number(val)
    fetchAssetsList()
  }
}, { immediate: true })

onMounted(() => {
  if (route.query.projectId) {
    projectId.value = Number(route.query.projectId)
    fetchAssetsList()
  }
})
</script>

<style scoped lang="scss">
.assets-page {
  height: calc(100vh - 120px);
}

.assets-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  flex: 1;
  overflow-y: auto;
}

.asset-card {
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  .asset-image {
    width: 100%;
    height: 180px;
    background: #f5f7fa;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;

    .el-image {
      width: 100%;
      height: 100%;
    }

    .no-image {
      color: #c0c4cc;
      text-align: center;

      p {
        margin-top: 8px;
        font-size: 12px;
      }
    }
  }

  .asset-info {
    .asset-name {
      font-size: 15px;
      font-weight: 500;
      color: #303133;
      margin-bottom: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .asset-intro {
      font-size: 12px;
      color: #909399;
      margin-bottom: 12px;
      line-height: 1.5;
      height: 36px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .asset-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.upload-demo {
  :deep(.el-upload) {
    width: 100%;
  }

  :deep(.el-upload-dragger) {
    width: 100%;
  }
}
</style>
