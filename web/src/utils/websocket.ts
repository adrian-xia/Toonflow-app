/**
 * WebSocket 客户端封装
 * 用于实时 AI 生成通信
 */

export type WsEventType = 'open' | 'close' | 'error' | 'message' | 'init' | 'stream' | 'response_end' | 'subAgentStream' | 'subAgentEnd' | 'toolCall' | 'transfer' | 'refresh' | 'error' | 'notice'

export interface WsMessage {
  type: string
  data: any
}

export interface WsEventListener {
  (data: any): void
}

export interface WsOptions {
  /** WebSocket 基础 URL，默认使用当前页面的协议和主机 */
  baseUrl?: string
  /** 连接超时时间（毫秒），默认 10000 */
  timeout?: number
  /** 是否自动重连，默认 false */
  autoReconnect?: boolean
  /** 重连间隔（毫秒），默认 3000 */
  reconnectInterval?: number
  /** 最大重连次数，默认 5 */
  maxReconnectAttempts?: number
}

class WsClient {
  private ws: WebSocket | null = null
  private url: string = ''
  private listeners: Map<string, Set<WsEventListener>> = new Map()
  private options: WsOptions
  private reconnectAttempts = 0
  private isConnecting = false
  private isManualClose = false

  constructor(options: WsOptions = {}) {
    this.options = {
      baseUrl: this.getDefaultBaseUrl(),
      timeout: 10000,
      autoReconnect: false,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...options,
    }
  }

  /**
   * 获取默认的 WebSocket 基础 URL
   */
  private getDefaultBaseUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}`
  }

  /**
   * 构建 WebSocket URL
   */
  private buildUrl(path: string, params?: Record<string, string | number>): string {
    const base = this.options.baseUrl || this.getDefaultBaseUrl()
    let url = `${base}${path}`

    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value))
      })
      url += `?${searchParams.toString()}`
    }

    return url
  }

  /**
   * 连接 WebSocket
   */
  connect(path: string, params?: Record<string, string | number>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.isManualClose = false
      this.url = this.buildUrl(path, params)

      const timeoutId = setTimeout(() => {
        if (this.isConnecting) {
          this.ws?.close()
          reject(new Error('WebSocket 连接超时'))
        }
      }, this.options.timeout)

      try {
        this.isConnecting = true
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          clearTimeout(timeoutId)
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.emit('open', {})
          resolve()
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeoutId)
          this.isConnecting = false
          this.emit('close', { code: event.code, reason: event.reason })

          // 自动重连
          if (
            !this.isManualClose &&
            this.options.autoReconnect &&
            this.reconnectAttempts < (this.options.maxReconnectAttempts || 5)
          ) {
            this.reconnectAttempts++
            setTimeout(() => {
              this.connect(path, params)
            }, this.options.reconnectInterval)
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeoutId)
          this.isConnecting = false
          this.emit('error', error)
          reject(new Error('WebSocket 连接失败'))
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WsMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (e) {
            console.error('WebSocket 消息解析失败:', e)
          }
        }
      } catch (error) {
        clearTimeout(timeoutId)
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WsMessage) {
    const { type, data } = message

    // 触发通用 message 事件
    this.emit('message', message)

    // 触发特定类型事件
    this.emit(type, data)
  }

  /**
   * 发送消息
   */
  send(type: string, data: any): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.error('WebSocket 未连接')
      return
    }

    const message = JSON.stringify({ type, data })
    this.ws.send(message)
  }

  /**
   * 发送用户消息
   */
  sendUserMessage(content: string): void {
    this.send('msg', {
      type: 'user',
      data: content,
    })
  }

  /**
   * 清空历史记录
   */
  cleanHistory(): void {
    this.send('cleanHistory', {})
  }

  /**
   * 设置小说章节
   */
  setNovel(novels: any[]): void {
    this.send('setNovel', novels)
  }

  /**
   * 监听事件
   */
  on(event: string, callback: WsEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // 返回取消监听函数
    return () => {
      this.off(event, callback)
    }
  }

  /**
   * 取消监听事件
   */
  off(event: string, callback: WsEventListener): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data)
        } catch (e) {
          console.error(`WebSocket 事件处理错误 [${event}]:`, e)
        }
      })
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.isManualClose = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.listeners.clear()
  }

  /**
   * 获取连接状态
   */
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export default WsClient