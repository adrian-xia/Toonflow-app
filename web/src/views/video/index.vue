<template>
  <div class="page-container">
    <div class="page-header">
      <span class="title">视频管理</span>
    </div>

    <el-empty v-if="!projectId" description="请先选择项目">
      <el-button type="primary" @click="goToProject">选择项目</el-button>
    </el-empty>

    <template v-else>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="视频列表" name="list">
          <div class="toolbar">
            <el-select v-model="selectedScriptId" placeholder="选择剧本" @change="handleScriptChange" style="width: 300px; margin-right: 16px">
              <el-option
                v-for="script in scriptList"
                :key="script.id"
                :label="script.name"
                :value="script.id"
              />
            </el-select>
            <el-button type="primary" @click="showGenerateDialog = true" :disabled="!selectedScriptId">
              <el-icon><VideoCamera /></el-icon>
              生成视频
            </el-button>
          </div>

          <div v-if="videoList.length > 0" class="video-grid">
            <el-card v-for="item in videoList" :key="item.id" class="video-card">
              <div class="video-preview">
                <video
                  v-if="item.filePath && item.state === 2"
                  :src="item.filePath"
                  controls
                  class="video-player"
                />
                <div v-else class="no-video">
                  <el-icon :size="40"><VideoCamera /></el-icon>
                  <span>{{ getStateText(item.state) }}</span>
                </div>
              </div>
              <div class="video-info">
                <div class="video-meta">
                  <el-tag :type="getStateTagType(item.state)" size="small">
                    {{ getStateText(item.state) }}
                  </el-tag>
                  <el-tag size="small" type="info">{{ item.resolution }}</el-tag>
                  <el-tag size="small" type="info">{{ item.time }}s</el-tag>
                </div>
                <div class="video-prompt">{{ item.prompt || '暂无提示词' }}</div>
                <div v-if="item.errorReason" class="video-error">
                  <el-text type="danger" size="small">{{ item.errorReason }}</el-text>
                </div>
              </div>
            </el-card>
          </div>

          <el-empty v-else-if="selectedScriptId" description="暂无视频数据" />
        </el-tab-pane>

        <el-tab-pane label="视频配置" name="config">
          <div style="margin-bottom: 20px">
            <el-button type="primary" @click="showConfigDialog = true" :disabled="!selectedScriptId">添加配置</el-button>
          </div>
          <el-table :data="configList" border stripe>
            <el-table-column prop="manufacturer" label="厂商" width="120" />
            <el-table-column prop="model" label="模型" width="200" />
            <el-table-column prop="mode" label="模式" width="100">
              <template #default="{ row }">
                {{ getModeText(row.mode) }}
              </template>
            </el-table-column>
            <el-table-column prop="resolution" label="分辨率" width="120" />
            <el-table-column prop="duration" label="时长(s)" width="100" />
            <el-table-column prop="prompt" label="提示词" show-overflow-tooltip />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="editConfig(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteConfig(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </template>

    <!-- 生成视频对话框 -->
    <el-dialog v-model="showGenerateDialog" title="生成视频" width="700px">
      <el-form :model="generateForm" label-width="100px">
        <el-form-item label="AI 模型">
          <el-select v-model="generateForm.aiConfigId" placeholder="选择 AI 模型" style="width: 100%">
            <el-option
              v-for="model in aiModelList"
              :key="model.id"
              :label="`${model.manufacturer} - ${model.model}`"
              :value="model.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="生成模式">
          <el-select v-model="generateForm.mode" placeholder="选择模式" style="width: 100%">
            <el-option label="首尾帧" value="startEnd" />
            <el-option label="多图" value="multi" />
            <el-option label="单图" value="single" />
            <el-option label="纯文本" value="text" />
          </el-select>
        </el-form-item>
        <el-form-item label="分镜图片" v-if="generateForm.mode !== 'text'">
          <div class="image-selector">
            <el-checkbox-group v-model="generateForm.selectedImages">
              <div class="image-grid">
                <div v-for="sb in storyboardList" :key="sb.id" class="image-item">
                  <el-checkbox :label="sb.id">
                    <el-image :src="sb.filePath" fit="cover" style="width: 80px; height: 80px; border-radius: 4px" />
                    <div class="image-name">{{ sb.name }}</div>
                  </el-checkbox>
                </div>
              </div>
            </el-checkbox-group>
          </div>
        </el-form-item>
        <el-form-item label="分辨率">
          <el-select v-model="generateForm.resolution" placeholder="选择分辨率" style="width: 100%">
            <el-option label="1280x720" value="1280x720" />
            <el-option label="1920x1080" value="1920x1080" />
            <el-option label="720x1280" value="720x1280" />
            <el-option label="1080x1920" value="1080x1920" />
          </el-select>
        </el-form-item>
        <el-form-item label="时长(秒)">
          <el-input-number v-model="generateForm.duration" :min="1" :max="60" />
        </el-form-item>
        <el-form-item label="提示词">
          <el-input v-model="generateForm.prompt" type="textarea" :rows="4" placeholder="输入视频生成提示词" />
        </el-form-item>
        <el-form-item label="启用音频">
          <el-switch v-model="generateForm.audioEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleGenerateVideo" :loading="generating">生成</el-button>
      </template>
    </el-dialog>

    <!-- 配置对话框 -->
    <el-dialog v-model="showConfigDialog" title="视频配置" width="600px">
      <el-form :model="configForm" label-width="100px">
        <el-form-item label="AI 模型">
          <el-select v-model="configForm.aiConfigId" placeholder="选择 AI 模型" style="width: 100%">
            <el-option
              v-for="model in aiModelList"
              :key="model.id"
              :label="`${model.manufacturer} - ${model.model}`"
              :value="model.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="生成模式">
          <el-select v-model="configForm.mode" placeholder="选择模式" style="width: 100%">
            <el-option label="首尾帧" value="startEnd" />
            <el-option label="多图" value="multi" />
            <el-option label="单图" value="single" />
            <el-option label="纯文本" value="text" />
          </el-select>
        </el-form-item>
        <el-form-item label="分辨率">
          <el-select v-model="configForm.resolution" placeholder="选择分辨率" style="width: 100%">
            <el-option label="1280x720" value="1280x720" />
            <el-option label="1920x1080" value="1920x1080" />
            <el-option label="720x1280" value="720x1280" />
            <el-option label="1080x1920" value="1080x1920" />
          </el-select>
        </el-form-item>
        <el-form-item label="时长(秒)">
          <el-input-number v-model="configForm.duration" :min="1" :max="60" />
        </el-form-item>
        <el-form-item label="提示词">
          <el-input v-model="configForm.prompt" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="启用音频">
          <el-switch v-model="configForm.audioEnabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveConfig" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VideoCamera } from '@element-plus/icons-vue'
import { getScriptList } from '@/api/script'
import { getVideoList, generateVideo, getVideoConfigs, addVideoConfig, deleteVideoConfig } from '@/api/video'
import { getStoryboardList } from '@/api/storyboard'
import { getSetting } from '@/api/setting'
import type { Script } from '@/types/outline'
import type { Video } from '@/types/video'
import type { Storyboard } from '@/types/storyboard'

const route = useRoute()
const router = useRouter()

const activeTab = ref('list')
const loading = ref(false)
const generating = ref(false)
const saving = ref(false)
const projectId = ref<number>(0)
const scriptList = ref<Script[]>([])
const selectedScriptId = ref<number | null>(null)
const videoList = ref<Video[]>([])
const configList = ref<any[]>([])
const storyboardList = ref<Storyboard[]>([])
const aiModelList = ref<any[]>([])
const showGenerateDialog = ref(false)
const showConfigDialog = ref(false)

const generateForm = ref({
  aiConfigId: null as number | null,
  mode: 'multi' as 'startEnd' | 'multi' | 'single' | 'text',
  selectedImages: [] as number[],
  resolution: '1280x720',
  duration: 5,
  prompt: '',
  audioEnabled: false
})

const configForm = ref({
  aiConfigId: null as number | null,
  mode: 'multi' as 'startEnd' | 'multi' | 'single' | 'text',
  resolution: '1280x720',
  duration: 5,
  prompt: '',
  audioEnabled: false
})

const getStateText = (state: number) => {
  const stateMap: Record<number, string> = {
    0: '待生成',
    1: '生成中',
    2: '已完成',
    3: '失败'
  }
  return stateMap[state] || '未知'
}

const getStateTagType = (state: number): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  const typeMap: Record<number, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    0: 'warning',
    1: 'primary',
    2: 'success',
    3: 'danger'
  }
  return typeMap[state] || 'info'
}

const getModeText = (mode: string) => {
  const modeMap: Record<string, string> = {
    startEnd: '首尾帧',
    multi: '多图',
    single: '单图',
    text: '纯文本'
  }
  return modeMap[mode] || mode
}

const fetchScriptList = async () => {
  if (!projectId.value) return
  try {
    const { data } = await getScriptList(projectId.value)
    scriptList.value = data
    if (data.length > 0 && !selectedScriptId.value) {
      selectedScriptId.value = data[0].id
      handleScriptChange()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取剧本列表失败')
  }
}

const handleScriptChange = () => {
  fetchVideoList()
  fetchConfigList()
  fetchStoryboardList()
}

const fetchVideoList = async () => {
  if (!selectedScriptId.value) return
  loading.value = true
  try {
    const { data } = await getVideoList({ scriptId: selectedScriptId.value })
    videoList.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '获取视频列表失败')
  } finally {
    loading.value = false
  }
}

const fetchConfigList = async () => {
  if (!selectedScriptId.value) return
  try {
    const { data } = await getVideoConfigs(selectedScriptId.value)
    configList.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '获取配置列表失败')
  }
}

const fetchStoryboardList = async () => {
  if (!selectedScriptId.value || !projectId.value) return
  try {
    const { data } = await getStoryboardList({
      scriptId: selectedScriptId.value,
      projectId: projectId.value
    })
    storyboardList.value = data.filter(item => item.filePath)
  } catch (error: any) {
    ElMessage.error(error.message || '获取分镜列表失败')
  }
}

const fetchAiModels = async () => {
  try {
    const { data } = await getSetting()
    const models = Array.isArray(data) ? data : Object.values(data)
    aiModelList.value = models.filter((item: any) => item.type === 'video')
  } catch (error: any) {
    ElMessage.error(error.message || '获取 AI 模型失败')
  }
}

const handleGenerateVideo = async () => {
  if (!generateForm.value.aiConfigId) {
    ElMessage.warning('请选择 AI 模型')
    return
  }
  if (generateForm.value.mode !== 'text' && generateForm.value.selectedImages.length === 0) {
    ElMessage.warning('请选择分镜图片')
    return
  }
  if (!generateForm.value.prompt) {
    ElMessage.warning('请输入提示词')
    return
  }

  generating.value = true
  try {
    const filePaths = generateForm.value.mode === 'text'
      ? []
      : generateForm.value.selectedImages.map(id => {
          const sb = storyboardList.value.find(item => item.id === id)
          return sb?.filePath || ''
        }).filter(Boolean)

    await generateVideo({
      projectId: projectId.value,
      scriptId: selectedScriptId.value!,
      aiConfigId: generateForm.value.aiConfigId,
      resolution: generateForm.value.resolution,
      filePath: filePaths,
      duration: generateForm.value.duration,
      prompt: generateForm.value.prompt,
      mode: generateForm.value.mode,
      audioEnabled: generateForm.value.audioEnabled
    })

    ElMessage.success('视频生成任务已提交')
    showGenerateDialog.value = false
    fetchVideoList()

    // 重置表单
    generateForm.value = {
      aiConfigId: null,
      mode: 'multi',
      selectedImages: [],
      resolution: '1280x720',
      duration: 5,
      prompt: '',
      audioEnabled: false
    }
  } catch (error: any) {
    ElMessage.error(error.message || '生成视频失败')
  } finally {
    generating.value = false
  }
}

const handleSaveConfig = async () => {
  if (!configForm.value.aiConfigId) {
    ElMessage.warning('请选择 AI 模型')
    return
  }

  saving.value = true
  try {
    await addVideoConfig({
      scriptId: selectedScriptId.value!,
      projectId: projectId.value,
      configId: configForm.value.aiConfigId,
      mode: configForm.value.mode,
      resolution: configForm.value.resolution,
      duration: configForm.value.duration,
      prompt: configForm.value.prompt,
      audioEnabled: configForm.value.audioEnabled
    } as any)

    ElMessage.success('保存成功')
    showConfigDialog.value = false
    fetchConfigList()

    // 重置表单
    configForm.value = {
      aiConfigId: null,
      mode: 'multi',
      resolution: '1280x720',
      duration: 5,
      prompt: '',
      audioEnabled: false
    }
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const editConfig = (row: any) => {
  configForm.value = {
    aiConfigId: row.aiConfigId,
    mode: row.mode,
    resolution: row.resolution,
    duration: row.duration,
    prompt: row.prompt,
    audioEnabled: row.audioEnabled
  }
  showConfigDialog.value = true
}

const handleDeleteConfig = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此配置吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteVideoConfig(id)
    ElMessage.success('删除成功')
    fetchConfigList()
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
    fetchAiModels()
  }
}, { immediate: true })

onMounted(() => {
  if (route.query.projectId) {
    projectId.value = Number(route.query.projectId)
    fetchScriptList()
    fetchAiModels()
  }
})
</script>

<style scoped lang="scss">
.toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.video-card {
  .video-preview {
    width: 100%;
    height: 180px;
    background: #000;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    .video-player {
      width: 100%;
      height: 100%;
    }

    .no-video {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: #909399;
    }
  }

  .video-info {
    padding-top: 12px;

    .video-meta {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .video-prompt {
      font-size: 12px;
      color: #606266;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .video-error {
      margin-top: 8px;
    }
  }
}

.image-selector {
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;

    .image-item {
      :deep(.el-checkbox) {
        display: flex;
        flex-direction: column;
        align-items: center;
        height: auto;

        .el-checkbox__label {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-left: 0;
        }
      }

      .image-name {
        font-size: 12px;
        color: #606266;
        margin-top: 4px;
        text-align: center;
        word-break: break-all;
      }
    }
  }
}
</style>