// AI 模型
export interface AiModel {
  id: number
  manufacturer: string
  model: string
  responseFormat?: string
  image?: boolean
  think?: boolean
  tool?: boolean
}

// 配置项
export interface Config {
  id: number
  title?: string // 配置名称
  type: string
  manufacturer: string
  model: string
  baseUrl: string
  apiKey: string
  protocol?: 'openai' | 'claude' // 协议类型
  modelType?: string
  url?: string
  key?: string
  projectId: number
}

// AI 模型列表响应
export interface AiModelListResponse {
  [manufacturer: string]: Array<{ label: string; value: string }>
}

// 设置
export interface Setting {
  tokenKey: string
}

// 日志
export interface Log {
  id: number
  type: string
  content: string
  createTime: number
}