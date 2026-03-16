<template>
  <div class="page-container">
    <div class="page-header">
      <span class="title">系统设置</span>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 模型管理（新增，主要Tab） -->
      <el-tab-pane label="模型管理" name="modelManage">
        <el-tabs v-model="modelManageTab">
          <!-- 文本模型（唯一子Tab） -->
          <el-tab-pane label="文本模型" name="text">
            <div style="margin-bottom: 20px">
              <el-button type="primary" @click="openAddDialog()">添加模型配置</el-button>
            </div>
            <el-table :data="textConfigList" v-loading="loading" border stripe>
              <el-table-column prop="title" label="配置名称" width="180">
                <template #default="{ row }">
                  <span>{{ row.title || `${row.manufacturer} - ${row.model}` }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="manufacturer" label="厂商" width="160">
                <template #default="{ row }">
                  {{ getManufacturerLabel(row.manufacturer) }}
                </template>
              </el-table-column>
              <el-table-column prop="model" label="模型" width="160" />
              <el-table-column prop="protocol" label="协议" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.protocol === 'claude' ? 'warning' : 'success'" size="small">
                    {{ row.protocol === 'claude' ? 'Claude' : 'OpenAI' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="baseUrl" label="API URL" show-overflow-tooltip />
              <el-table-column prop="apiKey" label="API Key" width="150">
                <template #default="{ row }">
                  <span>{{ row.apiKey ? '••••••••' : '未设置' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
                  <el-button type="danger" link size="small" @click="handleDeleteConfig(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>

      <!-- AI 功能配置（原"AI 模型配置"） -->
      <el-tab-pane label="AI 功能配置" name="function">
        <el-tabs v-model="functionTab">
          <!-- 文本模型功能 -->
          <el-tab-pane label="文本模型功能" name="text">
            <el-table :data="textModelList" v-loading="loading" border stripe>
              <el-table-column prop="name" label="功能模块" width="200" />
              <el-table-column prop="model" label="已配置模型" width="250">
                <template #default="{ row }">
                  <el-tag v-if="row.model" type="success">{{ row.configTitle || row.model }}</el-tag>
                  <el-tag v-else type="info">未配置</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="manufacturer" label="厂商" width="150">
                <template #default="{ row }">
                  {{ row.manufacturer ? getManufacturerLabel(row.manufacturer) : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="configureModel(row)">配置</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <!-- 图像模型功能 -->
          <el-tab-pane label="图像模型功能" name="image">
            <el-table :data="imageModelList" v-loading="loading" border stripe>
              <el-table-column prop="name" label="功能模块" width="200" />
              <el-table-column prop="model" label="已配置模型" width="250">
                <template #default="{ row }">
                  <el-tag v-if="row.model" type="success">{{ row.configTitle || row.model }}</el-tag>
                  <el-tag v-else type="info">未配置</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="manufacturer" label="厂商" width="150">
                <template #default="{ row }">
                  {{ row.manufacturer ? getManufacturerLabel(row.manufacturer) : '-' }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="configureModel(row)">配置</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>

      <!-- 项目配置 -->
      <el-tab-pane label="项目配置" name="project">
        <el-empty description="请先选择项目">
          <el-button type="primary" @click="goToProject">选择项目</el-button>
        </el-empty>
      </el-tab-pane>

      <!-- 系统日志 -->
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

    <!-- 添加/编辑模型配置对话框 -->
    <el-dialog v-model="showAddDialog" :title="isEditMode ? '编辑模型配置' : '添加模型配置'" width="600px">
      <el-form :model="formData" label-width="100px" :rules="formRules" ref="formRef">
        <el-form-item label="配置名称" prop="title">
          <el-input v-model="formData.title" placeholder="如：通义千问-主力模型" />
        </el-form-item>
        <el-form-item label="厂商" prop="manufacturer">
          <el-select
            v-model="formData.manufacturer"
            placeholder="选择厂商"
            style="width: 100%"
            @change="handleManufacturerChange"
          >
            <el-option
              v-for="m in manufacturers"
              :key="m.value"
              :label="m.label"
              :value="m.value"
            >
              <div>
                <span>{{ m.label }}</span>
                <span style="color: var(--el-text-color-secondary); font-size: 12px; margin-left: 8px">
                  {{ m.description }}
                </span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="模型" prop="model">
          <el-select
            v-model="formData.model"
            placeholder="选择模型"
            style="width: 100%"
            :disabled="!formData.manufacturer"
          >
            <el-option
              v-for="model in currentModels"
              :key="model"
              :label="model"
              :value="model"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="API URL" prop="baseUrl">
          <el-input v-model="formData.baseUrl" placeholder="API URL">
            <template #prepend>
              <el-select v-model="formData.protocol" style="width: 110px">
                <el-option label="OpenAI" value="openai" />
                <el-option label="Claude" value="claude" />
              </el-select>
            </template>
          </el-input>
          <div class="form-tip">
            <el-text size="small" type="info">选择厂商后自动填充，可根据需要修改</el-text>
          </div>
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input v-model="formData.apiKey" type="password" placeholder="输入 API Key" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveConfig" :loading="saving">确定</el-button>
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
              v-for="config in availableConfigs"
              :key="config.id"
              :label="config.title || `${getManufacturerLabel(config.manufacturer)} - ${config.model}`"
              :value="config.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center">
                <span>{{ config.title || `${getManufacturerLabel(config.manufacturer)} - ${config.model}` }}</span>
                <el-tag size="small" :type="config.protocol === 'claude' ? 'warning' : 'success'">
                  {{ config.protocol === 'claude' ? 'Claude' : 'OpenAI' }}
                </el-tag>
              </div>
            </el-option>
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { getAiModelMap, getSetting, addModel, updateModel, deleteModel, configurationModel } from '@/api/setting'
import { getManufacturerConfig, getManufacturersByType } from '@/config/manufacturers'
import type { Config } from '@/types/setting'

const router = useRouter()

const activeTab = ref('modelManage')
const modelManageTab = ref('text')
const functionTab = ref('text')
const loading = ref(false)
const logLoading = ref(false)
const saving = ref(false)
const modelList = ref<any[]>([])
const configList = ref<Config[]>([])
const logList = ref<any[]>([])
const showAddDialog = ref(false)
const showConfigDialog = ref(false)
const currentModel = ref<any>(null)
const selectedModelId = ref<number | null>(null)
const isEditMode = ref(false)
const formRef = ref<FormInstance>()

// 厂商列表
const manufacturers = computed(() => getManufacturersByType('text'))

// 当前厂商支持的模型列表
const currentModels = ref<string[]>([])

// 文本模型配置列表
const textConfigList = computed(() => configList.value.filter(c => c.type === 'text'))

// 文本模型功能模块列表
const textModelList = computed(() => modelList.value.filter(m => m.type === 'text'))

// 图像模型功能模块列表
const imageModelList = computed(() => modelList.value.filter(m => m.type === 'image'))

// 根据当前功能类型过滤可用的模型配置
const availableConfigs = computed(() => {
  const type = currentModel.value?.type || 'text'
  return configList.value.filter(c => c.type === type)
})

// 表单数据
const formData = ref<Partial<Config> & { modelType: string }>({
  title: '',
  type: 'text',
  manufacturer: '',
  model: '',
  baseUrl: '',
  apiKey: '',
  protocol: 'openai',
  modelType: 'chat'
})

// 表单验证规则
const formRules: FormRules = {
  title: [{ required: false, message: '请输入配置名称', trigger: 'blur' }],
  manufacturer: [{ required: true, message: '请选择厂商', trigger: 'change' }],
  model: [{ required: true, message: '请选择模型', trigger: 'change' }],
  baseUrl: [{ required: true, message: '请输入 API URL', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }]
}

const formatDate = (timestamp: string) => {
  return new Date(Number(timestamp)).toLocaleString('zh-CN')
}

// 获取厂商显示名称
const getManufacturerLabel = (value: string): string => {
  const config = getManufacturerConfig(value)
  return config?.label || value
}

// 厂商选择变化时自动填充
const handleManufacturerChange = (manufacturer: string) => {
  const config = getManufacturerConfig(manufacturer)
  if (config) {
    formData.value.baseUrl = config.baseUrl
    formData.value.protocol = config.protocol
    currentModels.value = config.models
    // 清空已选模型（如果不在新厂商的模型列表中）
    if (formData.value.model && !config.models.includes(formData.value.model)) {
      formData.value.model = ''
    }
  }
}

// 打开添加对话框
const openAddDialog = () => {
  isEditMode.value = false
  formData.value = {
    title: '',
    type: 'text',
    manufacturer: '',
    model: '',
    baseUrl: '',
    apiKey: '',
    protocol: 'openai',
    modelType: 'chat'
  }
  currentModels.value = []
  showAddDialog.value = true
}

// 打开编辑对话框
const openEditDialog = (config: Config) => {
  isEditMode.value = true
  formData.value = { ...config, modelType: config.modelType || 'chat' }
  // 根据当前厂商设置模型列表
  const manufacturerConfig = getManufacturerConfig(config.manufacturer)
  if (manufacturerConfig) {
    currentModels.value = manufacturerConfig.models
  } else {
    // 如果是自定义厂商，允许手动输入
    currentModels.value = [config.model]
  }
  showAddDialog.value = true
}

// 保存配置（添加或编辑）
const handleSaveConfig = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    if (isEditMode.value && formData.value.id) {
      await updateModel({
        id: formData.value.id,
        title: formData.value.title,
        type: formData.value.type as 'text' | 'image' | 'video',
        model: formData.value.model!,
        baseUrl: formData.value.baseUrl!,
        apiKey: formData.value.apiKey!,
        manufacturer: formData.value.manufacturer!,
        modelType: formData.value.modelType,
        protocol: formData.value.protocol as 'openai' | 'claude'
      })
      ElMessage.success('编辑成功')
    } else {
      await addModel({
        title: formData.value.title,
        type: formData.value.type as 'text' | 'image' | 'video',
        model: formData.value.model!,
        baseUrl: formData.value.baseUrl!,
        apiKey: formData.value.apiKey!,
        manufacturer: formData.value.manufacturer!,
        modelType: formData.value.modelType,
        protocol: formData.value.protocol as 'openai' | 'claude'
      })
      ElMessage.success('添加成功')
    }
    showAddDialog.value = false
    fetchModelList()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    saving.value = false
  }
}

// 删除配置
const handleDeleteConfig = async (config: Config) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除配置「${config.title || config.model}」吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await deleteModel(config.id)
    ElMessage.success('删除成功')
    fetchModelList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 获取模型列表
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

// 配置模型
const configureModel = (row: any) => {
  currentModel.value = row
  selectedModelId.value = null
  showConfigDialog.value = true
}

// 确认配置
const handleConfigureModel = async () => {
  if (!selectedModelId.value) {
    ElMessage.warning('请选择模型配置')
    return
  }
  if (!currentModel.value?.id) {
    ElMessage.error('缺少必要参数')
    return
  }

  try {
    await configurationModel({
      id: currentModel.value.id,
      configId: selectedModelId.value
    })
    ElMessage.success('配置成功')
    showConfigDialog.value = false
    fetchModelList()
  } catch (error: any) {
    ElMessage.error(error.message || '配置失败')
  }
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

.form-tip {
  margin-top: 4px;
}
</style>