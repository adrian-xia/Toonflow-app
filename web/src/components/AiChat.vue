<template>
  <div class="ai-chat">
    <div class="chat-messages" ref="messagesContainer">
      <div v-for="(msg, index) in messages" :key="index" class="message-item" :class="msg.role">
        <div class="message-avatar">
          <el-icon v-if="msg.role === 'user'" :size="24"><User /></el-icon>
          <el-icon v-else :size="24"><Cpu /></el-icon>
        </div>
        <div class="message-content">
          <div class="message-text">{{ msg.content }}</div>
          <div v-if="msg.timestamp" class="message-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>
      <div v-if="loading" class="message-item assistant">
        <div class="message-avatar">
          <el-icon :size="24"><Cpu /></el-icon>
        </div>
        <div class="message-content">
          <div class="message-text typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
    <div class="chat-input">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="3"
        :placeholder="placeholder"
        @keydown.enter.ctrl="handleSend"
      />
      <div class="input-actions">
        <el-button type="primary" @click="handleSend" :loading="loading" :disabled="!inputText.trim()">
          发送 (Ctrl+Enter)
        </el-button>
        <el-button v-if="showClear" @click="handleClear">清空历史</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { User, Cpu } from '@element-plus/icons-vue'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

interface Props {
  messages: Message[]
  loading?: boolean
  placeholder?: string
  showClear?: boolean
}

interface Emits {
  (e: 'send', message: string): void
  (e: 'clear'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  placeholder: '输入消息...',
  showClear: true
})

const emit = defineEmits<Emits>()

const inputText = ref('')
const messagesContainer = ref<HTMLElement>()

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const handleSend = () => {
  if (!inputText.value.trim() || props.loading) return
  emit('send', inputText.value.trim())
  inputText.value = ''
}

const handleClear = () => {
  emit('clear')
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

watch(() => props.messages.length, () => {
  scrollToBottom()
})

watch(() => props.loading, () => {
  scrollToBottom()
})
</script>

<style scoped lang="scss">
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #f5f7fa;

    .message-item {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;

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
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .message-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .message-text {
          padding: 10px 14px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          word-break: break-word;
          white-space: pre-wrap;
          max-width: 70%;

          &.typing {
            display: flex;
            gap: 4px;
            padding: 16px;

            span {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #909399;
              animation: typing 1.4s infinite;

              &:nth-child(2) {
                animation-delay: 0.2s;
              }

              &:nth-child(3) {
                animation-delay: 0.4s;
              }
            }
          }
        }

        .message-time {
          font-size: 12px;
          color: #909399;
          padding: 0 4px;
        }
      }
    }
  }

  .chat-input {
    padding: 16px;
    background: #fff;
    border-top: 1px solid #dcdfe6;

    .input-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      justify-content: flex-end;
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}
</style>
