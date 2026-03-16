<template>
  <div class="page-container">
    <div class="page-header">
      <span class="title">系统设置</span>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="AI 模型配置" name="model">
        <div style="margin-bottom: 20px">
          <el-button type="primary" @click="showAddDialog = true">添加模型配置</el-button>
        </div>
        <el-table :data="modelList" v-loading="loading" border stripe>
          <el-table-column prop="name" label="功能模块" width="200" />
          <el-table-column prop="model" label="已配置模型" width="200">
            <template #default="{ row }">
              <el-tag v-if="row.model" type="success">{{ row.model }}</el-tag>
              <el-tag v-else type="info">未配置</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="manufacturer" label="厂商" width="150" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="configureModel(row)">配置</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-divider />

        <h3>已添加的模型配置</h3>
        <el-table :data="configList" border stripe style="margin-top: 20px">
          <el-table-column prop="manufacturer" label="厂商" width="150" />
          <el-table-column prop="model" label="模型" width="200" />
          <el-table-column prop="baseUrl" label="API URL" show-overflow-tooltip />
          <el-table-column prop="apiKey" label="API Key" width="200">
            <template #default="{ row }">
              <span>{{ row.apiKey ? '••••••••' : '未设置' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="editConfig(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="项目配置" name="project">
        <el-empty description="请先选择项目">
          <el-button type="primary" @click="goToProject">选择项目</el-button>
        </el-empty>
      </el-tab-pane>

      <el-tab-pane label="系统日志" name="log">
        <el-table :data="logList" v-loading="logLoading" border stripe>
          <el-table-column prop="type" label="类型" width="120" />
          <el-table-column prop="content" label="内容" show-overflow-tooltip />
          <el-table-column prop="createTime" label="时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.createTime) }}
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加模型配置对话框 -->
    <el-dialog v-model="showAddDialog" title="添加模型配置" width="600px">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="模型类型">
          <el-select v-model="formData.type" placeholder="选择类型">
            <el-option label="文本模型" value="text" />
            <el-option label="图像模型" value="image" />
            <el-option label="视频模型" value="video" />
          </el-select>
        </el-form-item>
        <el-form-item label="厂商">
          <el-input v-model="formData.manufacturer" placeholder="如: openai, deepSeek" />
        </el-form-item>
        <el-form-item label="模型名称">
          <el-input v-model="formData.model" placeholder="如: gpt-4, deepseek-chat" />
        </el-form-item>
        <el-form-item label="API URL">
          <el-input v-model="formData.baseUrl" placeholder="如: https://api.openai.com/v1" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="formData.apiKey" type="password" placeholder="输入 API Key" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddModel">确定</el-button>
      </template>
    </el-dialog>

    <!-- 配置模型对话框 -->
    <el-dialog v-model="showConfigDialog" title="选择模型配置" width="500px">
      <el-form label-width="100px">
        <el-form-item label="功能模块">
          <el-input :value="currentModel?.name" disabled />
        </el-form-item>
        <el-form-item label="选择模型">
          <el-select v-model="selectedModelId" placeholder="请选择模型配置" style="width: 100%">
            <el-option
              v-for="config in configList"
              :key="config.id"
              :label="`${config.manufacturer} - ${config.model}`"
              :value="config.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="handleConfigureModel">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getAiModelMap, getSetting, addModel, configurationModel } from '@/api/setting'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const projectStore = useProjectStore()

const activeTab = ref('model')
const loading = ref(false)
const logLoading = ref(false)
const modelList = ref<any[]>([])
const configList = ref<any[]>([])
const logList = ref<any[]>([])
const showAddDialog = ref(false)
const showConfigDialog = ref(false)
const currentModel = ref<any>(null)
const selectedModelId = ref<number | null>(null)
const formData = ref({
  type: 'text',
  manufacturer: '',
  model: '',
  baseUrl: '',
  apiKey: '',
  modelType: 'chat'
})

const formatDate = (timestamp: string) => {
  return new Date(Number(timestamp)).toLocaleString('zh-CN')
}

const fetchModelList = async () => {
  loading.value = true
  try {
    // 获取模型映射（功能模块）
    const mapRes = await getAiModelMap()
    const mapData = mapRes.data || {}
    modelList.value = Object.values(mapData)

    // 获取已配置的模型
    const configRes = await getSetting()
    const configData = configRes.data || {}
    configList.value = Array.isArray(configData) ? configData : Object.values(configData)
  } catch (error: any) {
    ElMessage.error(error.message || '获取模型列表失败')
  } finally {
    loading.value = false
  }
}

const handleAddModel = async () => {
  try {
    await addModel(formData.value)
    ElMessage.success('添加成功')
    showAddDialog.value = false
    fetchModelList()
    // 重置表单
    formData.value = {
      type: 'text',
      manufacturer: '',
      model: '',
      baseUrl: '',
      apiKey: '',
      modelType: 'chat'
    }
  } catch (error: any) {
    ElMessage.error(error.message || '添加失败')
  }
}

const configureModel = (row: any) => {
  if (!projectStore.currentProjectId) {
    ElMessage.warning('请先选择项目')
    return
  }
  currentModel.value = row
  selectedModelId.value = null
  showConfigDialog.value = true
}

const handleConfigureModel = async () => {
  if (!selectedModelId.value) {
    ElMessage.warning('请选择模型配置')
    return
  }
  if (!projectStore.currentProjectId || !currentModel.value) {
    ElMessage.error('缺少必要参数')
    return
  }

  try {
    await configurationModel({
      projectId: projectStore.currentProjectId,
      type: currentModel.value.type,
      modelId: selectedModelId.value
    })
    ElMessage.success('配置成功')
    showConfigDialog.value = false
    fetchModelList()
  } catch (error: any) {
    ElMessage.error(error.message || '配置失败')
  }
}

const editConfig = (config: any) => {
  formData.value = { ...config }
  showAddDialog.value = true
}

const goToProject = () => {
  router.push('/project')
}

onMounted(() => {
  fetchModelList()
})
</script>

<style scoped lang="scss">
:deep(.el-tabs__content) {
  padding: 20px 0;
}
</style>