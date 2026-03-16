import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { Asset, GetAssetsParams, CreateAssetsParams, UpdateAssetsParams } from '@/types/assets'

// 获取素材列表
export function getAssetsList(params: GetAssetsParams): Promise<ApiResponse<Asset[]>> {
  return request.post('/assets/getAssets', params)
}

// 添加素材
export function addAssets(data: CreateAssetsParams): Promise<ApiResponse<{ id: number }>> {
  return request.post('/assets/addAssets', data)
}

// 更新素材
export function updateAssets(data: UpdateAssetsParams): Promise<ApiResponse<null>> {
  return request.post('/assets/updateAssets', data)
}

// 删除素材
export function deleteAssets(id: number): Promise<ApiResponse<null>> {
  return request.post('/assets/delAssets', { id })
}

// 删除素材图像
export function deleteAssetsImage(id: number): Promise<ApiResponse<null>> {
  return request.post('/assets/delAssetsImage', { id })
}

// 获取分镜素材
export function getStoryboardAssets(scriptId: number): Promise<ApiResponse<Asset[]>> {
  return request.post('/assets/getStoryboard', { scriptId })
}

// 润色提示词
export function polishPrompt(data: { id: number; prompt: string }): Promise<ApiResponse<{ prompt: string }>> {
  return request.post('/assets/polishPrompt', data)
}

// 生成素材图片
export function generateAssets(data: {
  id: number
  type: 'role' | 'scene' | 'props' | 'storyboard'
  projectId: number
  name: string
  base64?: string | null
  prompt: string
}): Promise<ApiResponse<{ path: string; assetsId: number }>> {
  return request.post('/assets/generateAssets', data)
}

// 上传素材图片
export function uploadAssetsImage(formData: FormData): Promise<ApiResponse<{ path: string }>> {
  return request.post('/assets/uploadImage', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}