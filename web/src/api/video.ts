import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { Video, GetVideoParams, VideoConfig } from '@/types/video'

// 获取视频列表
export function getVideoList(params: GetVideoParams): Promise<ApiResponse<Video[]>> {
  return request.post('/video/getVideo', params)
}

// 保存视频
export function saveVideo(data: Partial<Video> & { id: number }): Promise<ApiResponse<null>> {
  return request.post('/video/saveVideo', data)
}

// 获取视频配置列表
export function getVideoConfigs(projectId: number): Promise<ApiResponse<VideoConfig[]>> {
  return request.post('/video/getVideoConfigs', { projectId })
}

// 添加视频配置
export function addVideoConfig(data: Partial<VideoConfig>): Promise<ApiResponse<{ id: number }>> {
  return request.post('/video/addVideoConfig', data)
}

// 更新视频配置
export function updateVideoConfig(data: Partial<VideoConfig> & { id: number }): Promise<ApiResponse<null>> {
  return request.post('/video/upDateVideoConfig', data)
}

// 删除视频配置
export function deleteVideoConfig(id: number): Promise<ApiResponse<null>> {
  return request.post('/video/deleteVideoConfig', { id })
}

// 获取视频模型列表
export function getVideoModelList(userId: number): Promise<ApiResponse<string[]>> {
  return request.post('/video/getVideoModel', { userId })
}

// 获取视频模型详情
export function getVideoModelDetail(manufacturer: string, model: string): Promise<ApiResponse<any>> {
  return request.post('/video/getVideoModelDetail', { manufacturer, model })
}

// 获取厂商列表
export function getManufacturer(): Promise<ApiResponse<string[]>> {
  return request.post('/video/getManufacturer')
}

// 生成提示词
export function generatePrompt(data: { id: number; intro: string }): Promise<ApiResponse<{ prompt: string }>> {
  return request.post('/video/generatePrompt', data)
}

// 获取视频分镜
export function getVideoStoryboards(scriptId: number): Promise<ApiResponse<any[]>> {
  return request.post('/video/getVideoStoryboards', { scriptId })
}

// 生成视频
export function generateVideo(data: {
  projectId: number
  scriptId: number
  configId?: number
  resolution: string
  aiConfigId: number
  filePath: string[]
  duration: number
  prompt: string
  mode: 'startEnd' | 'multi' | 'single' | 'text'
  audioEnabled: boolean
}): Promise<ApiResponse<{ id: number; configId: number | null }>> {
  return request.post('/video/generateVideo', data)
}