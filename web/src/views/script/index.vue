<template>
  <div class="script-page">
    <el-empty v-if="!projectId" description="请先选择项目">
      <el-button type="primary" @click="goToProject">选择项目</el-button>
    </el-empty>

    <div v-else class="script-container">
      <!-- 左侧：大纲列表 -->
      <div class="outline-panel">
        <div class="panel-header">
          <span class="title">大纲列表</span>
          <el-button size="small" @click="fetchOutlineList" :loading="loadingOutline">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>

        <div class="outline-list" v-loading="loadingOutline">
          <el-empty v-if="outlineList.length === 0" description="暂无大纲" />

          <div
            v-for="outline in outlineList"
            :key="outline.id"
            class="outline-item"
            :class="{ active: selectedOutline?.id === outline.id }"
            @click="selectOutline(outline)"
          >
            <div class="outline-title">第 {{ outline.episode }} 集</div>
            <div class="outline-subtitle">{{ getOutlineTitle(outline.data) }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧：剧本管理 -->
      <div class="script-panel">
        <div class="panel-header">
          <span class="title">剧本管理</span>
          <div class="header-actions">
            <el-button
              v-if="selectedOutline"
              type="primary"
              size="small"
              @click="showAddDialog"
            >
              <el-icon><Plus /></el-icon>
              添加剧本
            </el-button>
          </div>
        </div>

        <div v-if="!selectedOutline" class="empty-state">
          <el-empty description="请先选择大纲" />
        </div>

        <div v-else class="script-content">
          <div class="script-list" v-loading="loadingScript">
            <el-empty v-if="scriptList.length === 0" description="暂无剧本">
              <el-button type="primary" @click="showAddDialog">添加剧本</el-button>
            </el-empty>

            <div
              v-for="script in scriptList"
              :key="script.id"
              class="script-card"
            >
              <div class="card-header">
                <span class="script-name">{{ script.name }}</span>
                <div class="card-actions">
                  <el-button
                    type="primary"
                    size="small"
                    @click="generateScriptContent(script)"
                    :loading="generatingScriptId === script.id"
                    :disabled="!!generatingScriptId"
                  >
                    <el-icon><MagicStick /></el-icon>
                    生成剧本
                  </el-button>
                  <el-button
                    type="info"
                    size="small"
                    link
                    @click="viewDetail(script)"
                  >
                    查看
                  </el-button>
                  <el-button
                    type="primary"
                    size="small"
                    link
                    @click="editScript(script)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    type="danger"
                    size="small"
                    link
                    @click="handleDelete(script.id)"
                  >
                    删除
                  </el-button>
                </div>
              </div>

              <div class="card-content">
                <div class="content-preview">
                  {{ getContentPreview(script.content) }}
                </div>
                <div v-if="script.element?.length" class="element-tags">
                  <el-tag
                    v-for="(el, index) in script.element.slice(0, 5)"
                    :key="index"
                    size="small"
                    :type="getElementTagType(el.type)"
                  >
                    {{ el.name }}
                  </el-tag>
                  <span v-if="script.element.length > 5" class="more-tag">
                    +{{ script.element.length - 5 }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加剧本对话框 -->
    <el-dialog v-model="addDialogVisible" title="添加剧本" width="500px">
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="剧本名称">
          <el-input v-model="addForm.name" placeholder="请输入剧本名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdd" :loading="adding">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑剧本对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑剧本" width="900px" top="5vh">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="剧本名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="剧本内容">
          <el-input
            v-model="editForm.content"
            type="textarea"
            :rows="20"
            placeholder="请输入剧本内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="updating">保存</el-button>
      </template>
    </el-dialog>

    <!-- 查看剧本详情对话框 -->
    <el-dialog v-model="detailVisible" title="剧本详情" width="900px" top="5vh">
      <div v-if="currentScript" class="script-detail">
        <div class="detail-header">
          <h3>{{ currentScript.name }}</h3>
        </div>

        <el-divider />

        <div class="script-content-detail">
          <h4>剧本内容</h4>
          <div class="content-text">
            <pre>{{ currentScript.content || '暂无内容' }}</pre>
          </div>
        </div>

        <div v-if="currentScript.element?.length" class="script-elements">
          <h4>相关元素</h4>
          <div class="element-list">
            <div
              v-for="(el, index) in currentScript.element"
              :key="index"
              class="element-item"
            >
              <el-tag :type="getElementTagType(el.type)">
                {{ el.type }}
              </el-tag>
              <span class="element-name">{{ el.name }}</span>
              <span v-if="el.intro" class="element-intro">{{ el.intro }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  MagicStick,
  Plus,
  Refresh
} from '@element-plus/icons-vue'
import { getOutlineList } from '@/api/outline'
import {
  getPartScript,
  generateScript,
  addScript,
  updateScript,
  deleteScript
} from '@/api/script'
import type { Outline, Script, OutlineData } from '@/types/outline'

const route = useRoute()
const router = useRouter()

// 基础状态
const projectId = ref<number>(0)
const loadingOutline = ref(false)
const loadingScript = ref(false)
const outlineList = ref<Outline[]>([])
const selectedOutline = ref<Outline | null>(null)
const scriptList = ref<Script[]>([])

// 生成状态
const generatingScriptId = ref<number | null>(null)

// 对话框状态
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const detailVisible = ref(false)
const adding = ref(false)
const updating = ref(false)

// 表单数据
const addForm = ref({
  name: ''
})

const editForm = ref({
  id: 0,
  name: '',
  content: ''
})

const currentScript = ref<Script | null>(null)

// 解析大纲数据
const parseOutlineData = (data: string): OutlineData | null => {
  try {
    return JSON.parse(data) as OutlineData
  } catch {
    return null
  }
}

const getOutlineTitle = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.title || '未命名'
}

const getContentPreview = (content: string) => {
  if (!content) return '暂无内容'
  return content.length > 150 ? content.slice(0, 150) + '...' : content
}

const getElementTagType = (type: string) => {
  const typeMap: Record<string, any> = {
    '角色': '',
    'role': '',
    '道具': 'warning',
    'props': 'warning',
    '场景': 'success',
    'scene': 'success'
  }
  return typeMap[type] || 'info'
}

// 获取大纲列表
const fetchOutlineList = async () => {
  if (!projectId.value) return
  loadingOutline.value = true
  try {
    const { data } = await getOutlineList(projectId.value)
    outlineList.value = data.sort((a, b) => a.episode - b.episode)
  } catch (error: any) {
    ElMessage.error(error.message || '获取大纲列表失败')
  } finally {
    loadingOutline.value = false
  }
}

// 选择大纲
const selectOutline = async (outline: Outline) => {
  selectedOutline.value = outline
  await fetchScriptList()
}

// 获取剧本列表
const fetchScriptList = async () => {
  if (!selectedOutline.value) return
  loadingScript.value = true
  try {
    const { data } = await getPartScript(selectedOutline.value.id)
    scriptList.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '获取剧本列表失败')
  } finally {
    loadingScript.value = false
  }
}

// 生成剧本内容
const generateScriptContent = async (script: Script) => {
  if (!selectedOutline.value) return

  try {
    await ElMessageBox.confirm(
      '确定要生成剧本内容吗？这将覆盖现有内容。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    generatingScriptId.value = script.id
    await generateScript({
      outlineId: selectedOutline.value.id,
      scriptId: script.id
    })
    ElMessage.success('剧本生成成功')
    await fetchScriptList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '生成剧本失败')
    }
  } finally {
    generatingScriptId.value = null
  }
}

// 显示添加对话框
const showAddDialog = () => {
  addForm.value = {
    name: `剧本 - 第${selectedOutline.value?.episode}集`
  }
  addDialogVisible.value = true
}

// 添加剧本
const handleAdd = async () => {
  if (!addForm.value.name.trim()) {
    ElMessage.warning('请输入剧本名称')
    return
  }

  if (!selectedOutline.value) return

  adding.value = true
  try {
    await addScript({
      name: addForm.value.name,
      outlineId: selectedOutline.value.id,
      projectId: projectId.value
    })
    ElMessage.success('添加成功')
    addDialogVisible.value = false
    await fetchScriptList()
  } catch (error: any) {
    ElMessage.error(error.message || '添加失败')
  } finally {
    adding.value = false
  }
}

// 编辑剧本
const editScript = (script: Script) => {
  editForm.value = {
    id: script.id,
    name: script.name,
    content: script.content || ''
  }
  editDialogVisible.value = true
}

// 更新剧本
const handleUpdate = async () => {
  if (!editForm.value.name.trim()) {
    ElMessage.warning('请输入剧本名称')
    return
  }

  updating.value = true
  try {
    await updateScript({
      id: editForm.value.id,
      name: editForm.value.name,
      content: editForm.value.content
    })
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    await fetchScriptList()
  } catch (error: any) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    updating.value = false
  }
}

// 查看详情
const viewDetail = (script: Script) => {
  currentScript.value = script
  detailVisible.value = true
}

// 删除剧本
const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此剧本吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteScript(id)
    ElMessage.success('删除成功')
    await fetchScriptList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const goToProject = () => {
  router.push('/project')
}

// 监听路由变化
watch(() => route.query.projectId, (val) => {
  if (val) {
    projectId.value = Number(val)
    fetchOutlineList()
  }
}, { immediate: true })

onMounted(() => {
  if (route.query.projectId) {
    projectId.value = Number(route.query.projectId)
    fetchOutlineList()
  }
})
</script>

<style scoped lang="scss">
.script-page {
  height: calc(100vh - 120px);
}

.script-container {
  display: flex;
  gap: 20px;
  height: 100%;
}

.outline-panel {
  width: 280px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.script-panel {
  flex: 1;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title {
    font-size: 16px;
    font-weight: 500;
    color: #303133;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.outline-list {
  flex: 1;
  padding: 12px;
  overflow-y: auto;

  .outline-item {
    padding: 12px;
    margin-bottom: 8px;
    border-radius: 4px;
    border: 1px solid #ebeef5;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: #409eff;
      background: #ecf5ff;
    }

    &.active {
      border-color: #409eff;
      background: #409eff;
      color: #fff;

      .outline-subtitle {
        color: rgba(255, 255, 255, 0.8);
      }
    }

    .outline-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .outline-subtitle {
      font-size: 12px;
      color: #909399;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.script-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.script-list {
  flex: 1;
  padding: 20px;
  overflow-y: auto;

  .script-card {
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      .script-name {
        font-size: 16px;
        font-weight: 500;
        color: #303133;
      }

      .card-actions {
        display: flex;
        gap: 8px;
      }
    }

    .card-content {
      .content-preview {
        font-size: 13px;
        color: #606266;
        line-height: 1.6;
        margin-bottom: 12px;
        white-space: pre-wrap;
      }

      .element-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .more-tag {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }
}

.script-detail {
  .detail-header {
    h3 {
      margin: 0;
      font-size: 18px;
      color: #303133;
    }
  }

  .script-content-detail {
    margin-bottom: 24px;

    h4 {
      margin: 0 0 12px;
      font-size: 15px;
      color: #303133;
    }

    .content-text {
      background: #f5f7fa;
      padding: 16px;
      border-radius: 4px;
      max-height: 400px;
      overflow: auto;

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-all;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: #606266;
      }
    }
  }

  .script-elements {
    h4 {
      margin: 0 0 12px;
      font-size: 15px;
      color: #303133;
    }

    .element-list {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .element-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #f5f7fa;
        border-radius: 4px;

        .element-name {
          font-weight: 500;
          color: #303133;
        }

        .element-intro {
          font-size: 13px;
          color: #909399;
        }
      }
    }
  }
}
</style>
