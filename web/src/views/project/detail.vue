<template>
  <div class="page-container">
    <div class="page-header">
      <span class="title">项目详情</span>
      <el-button @click="goBack">
        <el-icon><Back /></el-icon>
        返回列表
      </el-button>
    </div>

    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="40"><Loading /></el-icon>
    </div>

    <template v-else>
      <el-descriptions title="基本信息" :column="2" border>
        <el-descriptions-item label="项目名称">{{ project?.name }}</el-descriptions-item>
        <el-descriptions-item label="项目类型">{{ project?.type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="艺术风格">{{ project?.artStyle || '-' }}</el-descriptions-item>
        <el-descriptions-item label="视频比例">{{ project?.videoRatio || '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目简介" :span="2">{{ project?.intro || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(project?.createTime) }}</el-descriptions-item>
      </el-descriptions>

      <div class="section-title">工作流程</div>
      <div class="workflow-steps">
        <el-card
          v-for="(step, index) in workflowSteps"
          :key="index"
          class="workflow-card"
          shadow="hover"
          @click="goToStep(step.path)"
        >
          <div class="step-icon">
            <el-icon :size="32"><component :is="step.icon" /></el-icon>
          </div>
          <div class="step-info">
            <h3>{{ step.title }}</h3>
            <p>{{ step.description }}</p>
          </div>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Document, List, EditPen, Picture, Files, VideoCamera, Loading } from '@element-plus/icons-vue'
import { getProjectDetail } from '@/api/project'
import type { Project } from '@/types/project'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const project = ref<Project | null>(null)
const projectId = ref<number>(0)

const workflowSteps = [
  {
    title: '小说管理',
    description: '上传和管理小说章节',
    icon: markRaw(Document),
    path: 'novel'
  },
  {
    title: '大纲管理',
    description: '生成和管理故事大纲',
    icon: markRaw(List),
    path: 'outline'
  },
  {
    title: '剧本管理',
    description: '生成和编辑剧本内容',
    icon: markRaw(EditPen),
    path: 'script'
  },
  {
    title: '分镜管理',
    description: '创建和管理视觉分镜',
    icon: markRaw(Picture),
    path: 'storyboard'
  },
  {
    title: '素材管理',
    description: '管理角色、场景等素材',
    icon: markRaw(Files),
    path: 'assets'
  },
  {
    title: '视频管理',
    description: '生成和管理视频片段',
    icon: markRaw(VideoCamera),
    path: 'video'
  }
]

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const fetchProjectDetail = async () => {
  loading.value = true
  try {
    const { data } = await getProjectDetail(projectId.value)
    project.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '获取项目详情失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/project')
}

const goToStep = (path: string) => {
  router.push({ path: `/${path}`, query: { projectId: projectId.value } })
}

onMounted(() => {
  projectId.value = Number(route.params.id)
  if (projectId.value) {
    fetchProjectDetail()
  }
})
</script>

<style scoped lang="scss">
.loading-container {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.section-title {
  margin: 30px 0 20px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.workflow-card {
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .step-icon {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .step-info {
    flex: 1;

    h3 {
      margin: 0 0 4px;
      font-size: 16px;
      color: #303133;
    }

    p {
      margin: 0;
      font-size: 13px;
      color: #909399;
    }
  }
}
</style>