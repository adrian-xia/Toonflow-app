import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { Storyboard, GetStoryboardParams } from '@/types/storyboard'

// 获取分镜列表
export function getStoryboardList(params: GetStoryboardParams): Promise<ApiResponse<Storyboard[]>> {
  return request.post('/storyboard/getStoryboard', params)
}

// 生成分镜
export function generateStoryboard(data: { scriptId: number; projectId: number }): Promise<ApiResponse<null>> {
  return request.post('/storyboard/generateStoryboardApi', data)
}

// 删除分镜
export function deleteStoryboard(id: number): Promise<ApiResponse<null>> {
  return request.post('/storyboard/delStoryboard', { id })
}

// 保存分镜
export function saveStoryboard(data: Partial<Storyboard> & { id: number }): Promise<ApiResponse<null>> {
  return request.post('/storyboard/saveStoryboard', data)
}

// 生成分镜图像
export function generateShotImage(data: { id: number; prompt: string }): Promise<ApiResponse<null>> {
  return request.post('/storyboard/generateShotImage', data)
}

// 生成视频提示词
export function generateVideoPrompt(data: { id: number; intro: string }): Promise<ApiResponse<{ prompt: string }>> {
  return request.post('/storyboard/generateVideoPrompt', data)
}

// 上传图像
export function uploadImage(formData: FormData): Promise<ApiResponse<{ filePath: string }>> {
  return request.post('/storyboard/uploadImage', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}