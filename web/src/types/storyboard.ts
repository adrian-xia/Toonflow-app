// 分镜
export interface Storyboard {
  id: number
  name: string
  intro: string
  prompt: string
  videoPrompt: string
  filePath: string
  type: string
  scriptId: number
  duration: number
  segmentId: number
  shotIndex: number
  generateImg: GeneratedImage[]
}

// 生成的图像
export interface GeneratedImage {
  assetsId: number
  filePath: string
}

// 获取分镜参数
export interface GetStoryboardParams {
  scriptId: number
  projectId: number
}