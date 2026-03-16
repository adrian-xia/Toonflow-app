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
  type: string
  manufacturer: string
  model: string
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