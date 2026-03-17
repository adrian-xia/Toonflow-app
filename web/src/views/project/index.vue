<template>
  <div class="page-container">
    <div class="page-header">
      <span class="title">项目列表</span>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新建项目
      </el-button>
    </div>

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>

    <div v-else-if="projectList.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Folder /></el-icon>
      <p class="empty-text">暂无项目，点击右上角按钮创建</p>
    </div>

    <div v-else class="card-grid">
      <el-card
        v-for="project in projectList"
        :key="project.id"
        class="project-card"
        shadow="hover"
        @click="goToDetail(project.id)"
      >
        <template #header>
          <div class="card-header">
            <span class="project-name">{{ project.name }}</span>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, project)">
              <el-button type="primary" link @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
        <div class="card-content">
          <p class="project-intro">{{ project.intro || '暂无简介' }}</p>
          <div class="project-meta">
            <el-tag size="small">{{ project.type || '默认类型' }}</el-tag>
            <el-tag size="small" type="info">{{ project.artStyle || '默认风格' }}</el-tag>
          </div>
          <p class="project-time">创建时间: {{ formatDate(project.createTime) }}</p>
        </div>
      </el-card>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑项目' : '新建项目'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目简介">
          <el-input
            v-model="form.intro"
            type="textarea"
            :rows="3"
            placeholder="请输入项目简介"
          />
        </el-form-item>
        <el-form-item label="项目类型">
          <el-input v-model="form.type" placeholder="请输入项目类型" />
        </el-form-item>
        <el-form-item label="艺术风格">
          <el-input v-model="form.artStyle" placeholder="请输入艺术风格" />
        </el-form-item>
        <el-form-item label="视频比例">
          <el-select v-model="form.videoRatio" placeholder="请选择视频比例">
            <el-option label="16:9 (横屏)" value="16:9" />
            <el-option label="9:16 (竖屏)" value="9:16" />
            <el-option label="1:1 (方形)" value="1:1" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Folder, MoreFilled, Loading } from '@element-plus/icons-vue'
import { getProjectList, createProject, updateProject, deleteProject } from '@/api/project'
import { useProjectStore } from '@/stores/project'
import type { Project } from '@/types/project'

const router = useRouter()
const projectStore = useProjectStore()
const formRef = ref<FormInstance>()

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const projectList = ref<Project[]>([])

const form = reactive({
  name: '',
  intro: '',
  type: '',
  artStyle: '',
  videoRatio: '16:9'
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' }
  ]
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const fetchProjectList = async () => {
  loading.value = true
  try {
    const { data } = await getProjectList()
    projectList.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '获取项目列表失败')
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  isEdit.value = false
  editId.value = null
  Object.assign(form, {
    name: '',
    intro: '',
    type: '',
    artStyle: '',
    videoRatio: '16:9'
  })
  dialogVisible.value = true
}

const showEditDialog = (project: Project) => {
  isEdit.value = true
  editId.value = project.id
  Object.assign(form, {
    name: project.name,
    intro: project.intro,
    type: project.type,
    artStyle: project.artStyle,
    videoRatio: project.videoRatio
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value && editId.value) {
      await updateProject({ id: editId.value, ...form })
      ElMessage.success('更新成功')
    } else {
      await createProject(form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchProjectList()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此项目吗？删除后无法恢复。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteProject(id)
    ElMessage.success('删除成功')
    // 如果删除的是当前项目，清除存储
    if (projectStore.currentProjectId === id) {
      projectStore.clearCurrentProject()
    }
    fetchProjectList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const goToDetail = (id: number) => {
  const project = projectList.value.find(p => p.id === id)
  if (project) {
    projectStore.setCurrentProject(id, project.name)
  }
  router.push(`/project/${id}`)
}

// 处理下拉菜单命令
const handleCommand = (command: string, project: Project) => {
  if (command === 'edit') {
    showEditDialog(project)
  } else if (command === 'delete') {
    handleDelete(project.id)
  }
}

onMounted(() => {
  fetchProjectList()
  // 加载存储的项目信息
  projectStore.loadFromStorage()
})
</script>

<style scoped lang="scss">
.loading-container {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .project-name {
    font-size: 16px;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.card-content {
  .project-intro {
    color: #606266;
    font-size: 14px;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 42px;
  }

  .project-meta {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .project-time {
    color: #909399;
    font-size: 12px;
    margin: 0;
  }
}
</style>