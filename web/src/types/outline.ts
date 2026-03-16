// 大纲
export interface Outline {
  id: number
  episode: number
  data: string
  projectId: number
  createTime: number
}

// 大纲数据详情（存储在 data 字段中）
export interface OutlineData {
  episodeIndex: number
  title: string
  chapterRange: number[]
  scenes: AssetItem[]
  characters: AssetItem[]
  props: AssetItem[]
  coreConflict: string
  outline: string
  openingHook: string
  keyEvents: string[]
  emotionalCurve: string
  visualHighlights: string[]
  endingHook: string
  classicQuotes: string[]
}

// 资产项（角色、道具、场景）
export interface AssetItem {
  name: string
  description: string
}

// 剧本
export interface Script {
  id: number
  name: string
  content: string
  outlineId: number
  projectId: number
  data: string
  element: Asset[]
}

// 资产（角色、道具、场景）
export interface Asset {
  id: number
  type: string
  name: string
  filePath: string
  intro?: string
  prompt?: string
}

// 故事线
export interface Storyline {
  id: number
  character: string
  content: string
  projectId: number
}

// 创建大纲参数
export interface CreateOutlineParams {
  chapter: string
  data: string
  projectId: number
}

// 更新大纲参数
export interface UpdateOutlineParams {
  id: number
  chapter?: string
  data?: string
}

// WebSocket 消息类型
export interface WsMessageData {
  type: string
  data: any
}

// Sub-Agent 消息
export interface SubAgentMessage {
  agent: 'AI1' | 'AI2' | 'director'
  text?: string
}

// Tool 调用消息
export interface ToolCallMessage {
  agent: 'main' | 'AI1' | 'AI2' | 'director'
  name: string
  args: any
}

// Transfer 消息
export interface TransferMessage {
  to: 'AI1' | 'AI2' | 'director'
}

// 聊天消息
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}