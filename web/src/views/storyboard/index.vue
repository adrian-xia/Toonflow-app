<template>
  <div class="page-container">
    <div class="page-header">
      <span class="title">分镜管理</span>
    </div>

    <el-empty v-if="!projectId" description="请先选择项目">
      <el-button type="primary" @click="goToProject">选择项目</el-button>
    </el-empty>

    <template v-else>
      <div class="toolbar">
        <el-select v-model="selectedScriptId" placeholder="选择剧本" @change="fetchStoryboardList" style="width: 300px; margin-right: 16px">
          <el-option
            v-for="script in scriptList"
            :key="script.id"
            :label="script.name"
            :value="script.id"
          />
        </el-select>
        <el-button type="primary" @click="generateStoryboard" :loading="generating" :disabled="!selectedScriptId">
          <el-icon><MagicStick /></el-icon>
          生成分镜
        </el-button>
      </div>

      <div v-if="storyboardList.length > 0" class="storyboard-grid">
        <el-card v-for="item in storyboardList" :key="item.id" class="storyboard-card">
          <div class="shot-image">
            <el-image
              v-if="item.filePath"
              :src="item.filePath"
              fit="cover"
              :preview-src-list="[item.filePath]"
            />
            <div v-else class="no-image">
              <el-icon :size="40"><Picture /></el-icon>
              <span>暂无图像</span>
            </div>
          </div>
          <div class="shot-info">
            <div class="shot-name">{{ item.name }}</div>
            <div class="shot-intro">{{ item.intro }}</div>
            <div class="shot-meta">
              <el-tag size="small">段{{ item.segmentId }}-镜{{ item.shotIndex }}</el-tag>
              <el-tag size="small" type="info">{{ item.duration }}s</el-tag>
            </div>
            <div class="shot-actions">
              <el-button type="primary" link size="small" @click="editStoryboard(item)">编辑</el-button>
              <el-button type="danger" link size="small" @click="handleDelete(item.id)">删除</el-button>
            </div>
          </div>
        </el-card>
      </div>

      <el-empty v-else-if="selectedScriptId" description="暂无分镜数据" />
    </template>

    <!-- 编辑分镜对话框 -->
    <el-dialog v-model="editVisible" title="编辑分镜" width="600px">
      <el-form v-if="currentStoryboard" label-width="80px">
        <el-form-item label="分镜名称">
          <el-input v-model="currentStoryboard.name" />
        </el-form-item>
        <el-form-item label="分镜描述">
          <el-input v-model="currentStoryboard.intro" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="图像提示词">
          <el-input v-model="currentStoryboard.prompt" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="视频提示词">
          <el-input v-model="currentStoryboard.videoPrompt" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="时长">
          <el-input-number v-model="currentStoryboard.duration" :min="1" :max="60" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveStoryboard">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, Picture } from '@element-plus/icons-vue'
import { getScriptList } from '@/api/script'
import { getStoryboardList, generateStoryboard as generateStoryboardApi, deleteStoryboard, saveStoryboard as saveStoryboardApi } from '@/api/storyboard'
import type { Script } from '@/types/outline'
import type { Storyboard } from '@/types/storyboard'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const generating = ref(false)
const saving = ref(false)
const projectId = ref<number>(0)
const scriptList = ref<Script[]>([])
const selectedScriptId = ref<number | null>(null)
const storyboardList = ref<Storyboard[]>([])
const editVisible = ref(false)
const currentStoryboard = ref<Storyboard | null>(null)

const fetchScriptList = async () => {
  if (!projectId.value) return
  try {
    const { data } = await getScriptList(projectId.value)
    scriptList.value = data
    if (data.length > 0 && !selectedScriptId.value) {
      selectedScriptId.value = data[0].id
      fetchStoryboardList()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取剧本列表失败')
  }
}

const fetchStoryboardList = async () => {
  if (!selectedScriptId.value || !projectId.value) return
  loading.value = true
  try {
    const { data } = await getStoryboardList({
      scriptId: selectedScriptId.value,
      projectId: projectId.value
    })
    storyboardList.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '获取分镜列表失败')
  } finally {
    loading.value = false
  }
}

const generateStoryboard = async () => {
  if (!selectedScriptId.value || !projectId.value) return
  generating.value = true
  try {
    await generateStoryboardApi({
      scriptId: selectedScriptId.value,
      projectId: projectId.value
    })
    ElMessage.success('分镜生成成功')
    fetchStoryboardList()
  } catch (error: any) {
    ElMessage.error(error.message || '生成分镜失败')
  } finally {
    generating.value = false
  }
}

const editStoryboard = (item: Storyboard) => {
  currentStoryboard.value = { ...item }
  editVisible.value = true
}

const saveStoryboard = async () => {
  if (!currentStoryboard.value) return
  saving.value = true
  try {
    await saveStoryboardApi(currentStoryboard.value)
    ElMessage.success('保存成功')
    editVisible.value = false
    fetchStoryboardList()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此分镜吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteStoryboard(id)
    ElMessage.success('删除成功')
    fetchStoryboardList()
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
    fetchScriptList()
  }
}, { immediate: true })

onMounted(() => {
  if (route.query.projectId) {
    projectId.value = Number(route.query.projectId)
    fetchScriptList()
  }
})
</script>

<style scoped lang="scss">
.toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.storyboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.storyboard-card {
  .shot-image {
    width: 100%;
    height: 180px;
    background: #f5f7fa;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    .el-image {
      width: 100%;
      height: 100%;
    }

    .no-image {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #909399;
    }
  }

  .shot-info {
    padding-top: 12px;

    .shot-name {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
      margin-bottom: 4px;
    }

    .shot-intro {
      font-size: 12px;
      color: #606266;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .shot-meta {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .shot-actions {
      display: flex;
      gap: 8px;
    }
  }
}
</style>