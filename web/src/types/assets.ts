// 素材
export interface Asset {
  id: number
  type: string // 角色、道具、场景、分镜
  name: string
  intro: string
  prompt: string
  filePath: string
  projectId: number
  scriptId?: number
  duration?: number
  videoPrompt?: string
  segmentId?: number
  shotIndex?: number
  createTime: number
}

// 获取素材参数
export interface GetAssetsParams {
  projectId: number
  type: string
}

// 创建素材参数
export interface CreateAssetsParams {
  type: string
  name: string
  intro?: string
  prompt?: string
  filePath?: string
  projectId: number
}

// 更新素材参数
export interface UpdateAssetsParams {
  id: number
  name?: string
  intro?: string
  prompt?: string
  filePath?: string
}