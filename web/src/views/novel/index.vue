<template>
  <div class="page-container">
    <div class="page-header">
      <span class="title">小说管理</span>
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        添加章节
      </el-button>
    </div>

    <el-table :data="novelList" v-loading="loading" border stripe>
      <el-table-column prop="chapterIndex" label="章节序号" width="100" />
      <el-table-column prop="reel" label="卷名" width="150" />
      <el-table-column prop="chapter" label="章节名" width="200" />
      <el-table-column prop="chapterData" label="内容" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="content-preview">{{ getContentPreview(row.chapterData) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="showEditDialog(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑章节' : '添加章节'"
      width="700px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="章节序号" prop="chapterIndex">
          <el-input-number v-model="form.chapterIndex" :min="1" />
        </el-form-item>
        <el-form-item label="卷名">
          <el-input v-model="form.reel" placeholder="请输入卷名" />
        </el-form-item>
        <el-form-item label="章节名">
          <el-input v-model="form.chapter" placeholder="请输入章节名" />
        </el-form-item>
        <el-form-item label="章节内容" prop="chapterData">
          <el-input
            v-model="form.chapterData"
            type="textarea"
            :rows="10"
            placeholder="请输入章节内容"
          />
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
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getNovelList, addNovel, updateNovel, deleteNovel } from '@/api/novel'
import type { Novel } from '@/types/novel'

const route = useRoute()
const formRef = ref<FormInstance>()

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const projectId = ref<number>(0)
const novelList = ref<Novel[]>([])

const form = reactive({
  chapterIndex: 1,
  reel: '',
  chapter: '',
  chapterData: ''
})

const rules: FormRules = {
  chapterIndex: [
    { required: true, message: '请输入章节序号', trigger: 'blur' }
  ],
  chapterData: [
    { required: true, message: '请输入章节内容', trigger: 'blur' }
  ]
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const getContentPreview = (content: string) => {
  if (!content) return ''
  return content.length > 100 ? content.slice(0, 100) + '...' : content
}

const fetchNovelList = async () => {
  if (!projectId.value) return
  loading.value = true
  try {
    const { data } = await getNovelList(projectId.value)
    novelList.value = data.sort((a, b) => a.chapterIndex - b.chapterIndex)
  } catch (error: any) {
    ElMessage.error(error.message || '获取小说列表失败')
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  editId.value = null
  const maxIndex = novelList.value.length > 0
    ? Math.max(...novelList.value.map(n => n.chapterIndex))
    : 0
  Object.assign(form, {
    chapterIndex: maxIndex + 1,
    reel: '',
    chapter: '',
    chapterData: ''
  })
  dialogVisible.value = true
}

const showEditDialog = (novel: Novel) => {
  isEdit.value = true
  editId.value = novel.id
  Object.assign(form, {
    chapterIndex: novel.chapterIndex,
    reel: novel.reel || '',
    chapter: novel.chapter || '',
    chapterData: novel.chapterData
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value && editId.value) {
      await updateNovel({ id: editId.value, ...form })
      ElMessage.success('更新成功')
    } else {
      await addNovel({ ...form, projectId: projectId.value })
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    fetchNovelList()
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此章节吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteNovel(id)
    ElMessage.success('删除成功')
    fetchNovelList()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

watch(() => route.query.projectId, (val) => {
  if (val) {
    projectId.value = Number(val)
    fetchNovelList()
  }
}, { immediate: true })

onMounted(() => {
  if (route.query.projectId) {
    projectId.value = Number(route.query.projectId)
    fetchNovelList()
  }
})
</script>

<style scoped lang="scss">
.content-preview {
  color: #606266;
}
</style>