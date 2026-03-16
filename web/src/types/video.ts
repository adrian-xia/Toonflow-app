// 视频
export interface Video {
  id: number
  configId: number
  time: number
  resolution: string
  prompt: string
  firstFrame: string
  filePath: string
  storyboardImgs: string[]
  model: string
  scriptId: number
  state: number // 0: 待生成, 1: 生成中, 2: 已完成, 3: 失败
  errorReason?: string
}

// 获取视频参数
export interface GetVideoParams {
  scriptId: number
  specifyIds?: number[]
}

// 创建视频参数
export interface CreateVideoParams {
  configId: number
  prompt: string
  firstFrame?: string
  storyboardImgs?: string[]
  model: string
  scriptId: number
}

// 视频配置
export interface VideoConfig {
  id: number
  name: string
  manufacturer: string
  model: string
  projectId: number
  config: string
}

// 视频模型
export interface VideoModel {
  id: number
  manufacturer: string
  model: string
}