<template>
  <div class="outline-page">
    <el-empty v-if="!projectId" description="请先选择项目">
      <el-button type="primary" @click="goToProject">选择项目</el-button>
    </el-empty>

    <div v-else class="outline-container">
      <!-- 左侧：AI 对话面板 -->
      <div class="chat-panel">
        <div class="panel-header">
          <span class="title">AI 大纲生成助手</span>
          <el-button
            size="small"
            :type="wsConnected ? 'success' : 'info'"
            @click="toggleConnection"
            :loading="wsConnecting"
          >
            {{ wsConnected ? '已连接' : '连接' }}
          </el-button>
        </div>

        <!-- Agent 状态显示 -->
        <div v-if="wsConnected" class="agent-status">
          <div class="status-item" :class="{ active: currentAgent === 'main' }">
            <el-icon><User /></el-icon>
            <span>主控</span>
          </div>
          <div class="status-item" :class="{ active: currentAgent === 'AI1' }">
            <el-icon><Reading /></el-icon>
            <span>AI1 故事师</span>
          </div>
          <div class="status-item" :class="{ active: currentAgent === 'AI2' }">
            <el-icon><Document /></el-icon>
            <span>AI2 大纲师</span>
          </div>
          <div class="status-item" :class="{ active: currentAgent === 'director' }">
            <el-icon><VideoCamera /></el-icon>
            <span>导演</span>
          </div>
        </div>

        <!-- 聊天消息区域 -->
        <div class="chat-messages" ref="messagesContainer">
          <div
            v-for="(msg, index) in chatMessages"
            :key="index"
            class="message-item"
            :class="msg.role"
          >
            <div class="message-avatar">
              <el-icon v-if="msg.role === 'user'"><User /></el-icon>
              <el-icon v-else><Reading /></el-icon>
            </div>
            <div class="message-content">
              <div class="message-text">{{ msg.content }}</div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>

          <!-- Sub-Agent 流式输出 -->
          <div v-if="subAgentStreaming" class="message-item assistant">
            <div class="message-avatar">
              <el-icon><Reading /></el-icon>
            </div>
            <div class="message-content">
              <div class="sub-agent-label">{{ subAgentLabel }}</div>
              <div class="message-text streaming">{{ subAgentText }}</div>
            </div>
          </div>

          <!-- Tool 调用显示 -->
          <div v-if="toolCalling" class="tool-call-item">
            <el-icon class="loading"><Loading /></el-icon>
            <span>{{ toolCallText }}</span>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="chat-input">
          <el-input
            v-model="userInput"
            type="textarea"
            :rows="3"
            placeholder="输入指令，例如：生成第1-3章的大纲"
            :disabled="!wsConnected || sending"
            @keydown.ctrl.enter="sendMessage"
          />
          <div class="input-actions">
            <el-button
              size="small"
              @click="cleanHistory"
              :disabled="!wsConnected"
            >
              清空历史
            </el-button>
            <el-button
              type="primary"
              @click="sendMessage"
              :loading="sending"
              :disabled="!wsConnected || !userInput.trim()"
            >
              发送 (Ctrl+Enter)
            </el-button>
          </div>
        </div>
      </div>

      <!-- 右侧：大纲列表 -->
      <div class="outline-panel">
        <div class="panel-header">
          <span class="title">大纲列表</span>
          <el-button
            size="small"
            type="primary"
            @click="fetchOutlineList"
            :loading="loading"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>

        <div class="outline-list" v-loading="loading">
          <el-empty v-if="outlineList.length === 0" description="暂无大纲数据" />

          <div
            v-for="outline in outlineList"
            :key="outline.id"
            class="outline-card"
            @click="viewDetail(outline)"
          >
            <div class="card-header">
              <span class="episode">第 {{ outline.episode }} 集</span>
              <el-button
                type="danger"
                size="small"
                link
                @click.stop="handleDelete(outline.id)"
              >
                删除
              </el-button>
            </div>
            <div class="card-content">
              <div class="outline-info">
                <div class="info-item">
                  <span class="label">标题：</span>
                  <span class="value">{{ getOutlineTitle(outline.data) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">章节范围：</span>
                  <span class="value">{{ getChapterRange(outline.data) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">核心冲突：</span>
                  <span class="value">{{ getCoreConflict(outline.data) }}</span>
                </div>
              </div>
            </div>
            <div class="card-footer">
              <span class="time">{{ formatDate(outline.createTime) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 大纲详情对话框 -->
    <el-dialog v-model="detailVisible" title="大纲详情" width="800px" top="5vh">
      <div v-if="currentOutline" class="outline-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="集数">
            第 {{ currentOutline.episode }} 集
          </el-descriptions-item>
          <el-descriptions-item label="章节范围">
            {{ getChapterRange(currentOutline.data) }}
          </el-descriptions-item>
          <el-descriptions-item label="标题" :span="2">
            {{ getOutlineTitle(currentOutline.data) }}
          </el-descriptions-item>
          <el-descriptions-item label="核心冲突" :span="2">
            {{ getCoreConflict(currentOutline.data) }}
          </el-descriptions-item>
          <el-descriptions-item label="开场钩子" :span="2">
            {{ getOpeningHook(currentOutline.data) }}
          </el-descriptions-item>
          <el-descriptions-item label="结尾钩子" :span="2">
            {{ getEndingHook(currentOutline.data) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <h4>大纲内容</h4>
        <div class="outline-content">
          {{ getOutlineContent(currentOutline.data) }}
        </div>

        <h4>关键事件</h4>
        <ul class="key-events">
          <li v-for="(event, index) in getKeyEvents(currentOutline.data)" :key="index">
            {{ event }}
          </li>
        </ul>

        <h4>视觉亮点</h4>
        <ul class="visual-highlights">
          <li v-for="(highlight, index) in getVisualHighlights(currentOutline.data)" :key="index">
            {{ highlight }}
          </li>
        </ul>

        <h4>经典台词</h4>
        <ul class="classic-quotes">
          <li v-for="(quote, index) in getClassicQuotes(currentOutline.data)" :key="index">
            "{{ quote }}"
          </li>
        </ul>

        <el-divider />

        <h4>角色</h4>
        <el-tag
          v-for="(char, index) in getCharacters(currentOutline.data)"
          :key="index"
          class="asset-tag"
        >
          {{ char.name }}
        </el-tag>

        <h4>场景</h4>
        <el-tag
          v-for="(scene, index) in getScenes(currentOutline.data)"
          :key="index"
          class="asset-tag"
          type="success"
        >
          {{ scene.name }}
        </el-tag>

        <h4>道具</h4>
        <el-tag
          v-for="(prop, index) in getProps(currentOutline.data)"
          :key="index"
          class="asset-tag"
          type="warning"
        >
          {{ prop.name }}
        </el-tag>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User,
  Reading,
  Document,
  VideoCamera,
  Refresh,
  Loading
} from '@element-plus/icons-vue'
import WsClient from '@/utils/websocket'
import { getOutlineList, deleteOutline, WS_OUTLINE_PATH } from '@/api/outline'
import type { Outline, ChatMessage, OutlineData } from '@/types/outline'

const route = useRoute()
const router = useRouter()

// 基础状态
const projectId = ref<number>(0)
const loading = ref(false)
const outlineList = ref<Outline[]>([])
const detailVisible = ref(false)
const currentOutline = ref<Outline | null>(null)

// WebSocket 状态
const wsClient = ref<WsClient | null>(null)
const wsConnected = ref(false)
const wsConnecting = ref(false)
const chatMessages = ref<ChatMessage[]>([])
const userInput = ref('')
const sending = ref(false)
const messagesContainer = ref<HTMLElement>()

// Agent 状态
const currentAgent = ref<'main' | 'AI1' | 'AI2' | 'director'>('main')
const subAgentStreaming = ref(false)
const subAgentText = ref('')
const subAgentLabel = ref('')
const toolCalling = ref(false)
const toolCallText = ref('')

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

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

const getChapterRange = (data: string) => {
  const parsed = parseOutlineData(data)
  if (!parsed?.chapterRange || parsed.chapterRange.length === 0) return '未知'
  return `第 ${parsed.chapterRange[0]} - ${parsed.chapterRange[parsed.chapterRange.length - 1]} 章`
}

const getCoreConflict = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.coreConflict || '无'
}

const getOpeningHook = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.openingHook || '无'
}

const getEndingHook = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.endingHook || '无'
}

const getOutlineContent = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.outline || '无'
}

const getKeyEvents = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.keyEvents || []
}

const getVisualHighlights = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.visualHighlights || []
}

const getClassicQuotes = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.classicQuotes || []
}

const getCharacters = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.characters || []
}

const getScenes = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.scenes || []
}

const getProps = (data: string) => {
  const parsed = parseOutlineData(data)
  return parsed?.props || []
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// WebSocket 连接
const toggleConnection = async () => {
  if (wsConnected.value) {
    disconnect()
  } else {
    await connect()
  }
}

const connect = async () => {
  if (!projectId.value) {
    ElMessage.warning('请先选择项目')
    return
  }

  wsConnecting.value = true
  try {
    wsClient.value = new WsClient()

    // 监听事件
    wsClient.value.on('open', () => {
      wsConnected.value = true
      ElMessage.success('WebSocket 连接成功')
    })

    wsClient.value.on('close', () => {
      wsConnected.value = false
      ElMessage.info('WebSocket 连接已关闭')
    })

    wsClient.value.on('error', (error: any) => {
      ElMessage.error('WebSocket 连接错误')
      console.error('WebSocket error:', error)
    })

    wsClient.value.on('init', (data: any) => {
      console.log('WebSocket 初始化:', data)
    })

    wsClient.value.on('stream', (data: any) => {
      // 主 Agent 流式输出
      if (chatMessages.value.length > 0) {
        const lastMsg = chatMessages.value[chatMessages.value.length - 1]
        if (lastMsg.role === 'assistant' && lastMsg.isStreaming) {
          lastMsg.content += data
        } else {
          chatMessages.value.push({
            role: 'assistant',
            content: data,
            timestamp: Date.now(),
            isStreaming: true
          })
        }
      } else {
        chatMessages.value.push({
          role: 'assistant',
          content: data,
          timestamp: Date.now(),
          isStreaming: true
        })
      }
      scrollToBottom()
    })

    wsClient.value.on('response_end', () => {
      // 结束流式输出
      if (chatMessages.value.length > 0) {
        const lastMsg = chatMessages.value[chatMessages.value.length - 1]
        if (lastMsg.isStreaming) {
          lastMsg.isStreaming = false
        }
      }
      sending.value = false
    })

    wsClient.value.on('subAgentStream', (data: any) => {
      // Sub-Agent 流式输出
      subAgentStreaming.value = true
      currentAgent.value = data.agent

      const agentLabels: Record<string, string> = {
        AI1: 'AI1 故事师',
        AI2: 'AI2 大纲师',
        director: '导演'
      }
      subAgentLabel.value = agentLabels[data.agent] || data.agent

      if (data.text) {
        subAgentText.value += data.text
      }
      scrollToBottom()
    })

    wsClient.value.on('subAgentEnd', () => {
      // Sub-Agent 结束
      if (subAgentText.value) {
        chatMessages.value.push({
          role: 'assistant',
          content: `[${subAgentLabel.value}] ${subAgentText.value}`,
          timestamp: Date.now()
        })
      }
      subAgentStreaming.value = false
      subAgentText.value = ''
      subAgentLabel.value = ''
      currentAgent.value = 'main'
      scrollToBottom()
    })

    wsClient.value.on('toolCall', (data: any) => {
      // Tool 调用
      toolCalling.value = true
      toolCallText.value = `正在调用工具: ${data.name}`
      console.log('Tool call:', data)
    })

    wsClient.value.on('transfer', (data: any) => {
      // Agent 切换
      currentAgent.value = data.to
      toolCalling.value = false
    })

    wsClient.value.on('refresh', async () => {
      // 刷新数据
      await fetchOutlineList()
    })

    wsClient.value.on('error', (data: any) => {
      ElMessage.error(data.message || 'WebSocket 错误')
    })

    wsClient.value.on('notice', (data: any) => {
      ElMessage.info(data.message || '通知')
    })

    // 连接
    await wsClient.value.connect(WS_OUTLINE_PATH, { projectId: projectId.value })
  } catch (error: any) {
    ElMessage.error(error.message || '连接失败')
  } finally {
    wsConnecting.value = false
  }
}

const disconnect = () => {
  if (wsClient.value) {
    wsClient.value.close()
    wsClient.value = null
  }
  wsConnected.value = false
  currentAgent.value = 'main'
}

// 发送消息
const sendMessage = () => {
  if (!userInput.value.trim() || !wsClient.value || !wsConnected.value) {
    return
  }

  sending.value = true

  // 添加用户消息
  chatMessages.value.push({
    role: 'user',
    content: userInput.value,
    timestamp: Date.now()
  })

  // 发送到服务器
  wsClient.value.sendUserMessage(userInput.value)

  userInput.value = ''
  scrollToBottom()
}

// 清空历史
const cleanHistory = async () => {
  try {
    await ElMessageBox.confirm('确定要清空对话历史吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    if (wsClient.value) {
      wsClient.value.cleanHistory()
      chatMessages.value = []
      ElMessage.success('历史记录已清空')
    }
  } catch {
    // 用户取消
  }
}

// 获取大纲列表
const fetchOutlineList = async () => {
  if (!projectId.value) return
  loading.value = true
  try {
    const { data } = await getOutlineList(projectId.value)
    outlineList.value = data.sort((a, b) => b.createTime - a.createTime)
  } catch (error: any) {
    ElMessage.error(error.message || '获取大纲列表失败')
  } finally {
    loading.value = false
  }
}

// 查看详情
const viewDetail = (outline: Outline) => {
  currentOutline.value = outline
  detailVisible.value = true
}

// 删除大纲
const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此大纲吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteOutline(id)
    ElMessage.success('删除成功')
    fetchOutlineList()
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

onUnmounted(() => {
  disconnect()
})
</script>

<style scoped lang="scss">
.outline-page {
  height: calc(100vh - 120px);
}

.outline-container {
  display: flex;
  gap: 20px;
  height: 100%;
}

.chat-panel,
.outline-panel {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-panel {
  flex: 1;
  min-width: 500px;
}

.outline-panel {
  width: 450px;
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
}

.agent-status {
  padding: 12px 20px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  gap: 16px;

  .status-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 4px;
    background: #fff;
    font-size: 13px;
    color: #909399;
    transition: all 0.3s;

    &.active {
      background: #409eff;
      color: #fff;
    }
  }
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f5f7fa;

  .message-item {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;

    &.user {
      flex-direction: row-reverse;

      .message-content {
        align-items: flex-end;
      }

      .message-text {
        background: #409eff;
        color: #fff;
      }
    }

    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .message-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .sub-agent-label {
        font-size: 12px;
        color: #409eff;
        font-weight: 500;
      }

      .message-text {
        padding: 12px 16px;
        border-radius: 8px;
        background: #fff;
        color: #303133;
        line-height: 1.6;
        word-break: break-word;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

        &.streaming::after {
          content: '▋';
          animation: blink 1s infinite;
        }
      }

      .message-time {
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .tool-call-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #e6f7ff;
    border-radius: 4px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #1890ff;

    .loading {
      animation: rotate 1s linear infinite;
    }
  }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.chat-input {
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background: #fff;

  .input-actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

.outline-list {
  flex: 1;
  padding: 20px;
  overflow-y: auto;

  .outline-card {
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      .episode {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
      }
    }

    .card-content {
      .outline-info {
        .info-item {
          margin-bottom: 8px;
          font-size: 13px;
          display: flex;
          gap: 8px;

          .label {
            color: #909399;
            flex-shrink: 0;
          }

          .value {
            color: #606266;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }

    .card-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #ebeef5;

      .time {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

.outline-detail {
  h4 {
    margin: 20px 0 12px;
    font-size: 15px;
    color: #303133;

    &:first-child {
      margin-top: 0;
    }
  }

  .outline-content {
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    line-height: 1.8;
    color: #606266;
    white-space: pre-wrap;
  }

  .key-events,
  .visual-highlights,
  .classic-quotes {
    margin: 0;
    padding-left: 24px;

    li {
      margin-bottom: 8px;
      line-height: 1.6;
      color: #606266;
    }
  }

  .asset-tag {
    margin-right: 8px;
    margin-bottom: 8px;
  }
}
</style>
