import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { AiModel, Config, AiModelListResponse, Setting, Log } from '@/types/setting'

// 获取 AI 模型列表
export function getAiModelList(type: 'text' | 'image' | 'video'): Promise<ApiResponse<AiModelListResponse>> {
  return request.post('/setting/getAiModelList', { type })
}

// 获取 AI 模型映射
export function getAiModelMap(): Promise<ApiResponse<Record<string, AiModel>>> {
  return request.post('/setting/getAiModelMap')
}

// 获取配置
export function getSetting(): Promise<ApiResponse<Setting>> {
  return request.post('/setting/getSetting')
}

// 添加模型配置
export function addModel(data: Partial<Config>): Promise<ApiResponse<{ id: number }>> {
  return request.post('/setting/addModel', data)
}

// 更新模型配置
export function updateModel(data: Partial<Config> & { id: number }): Promise<ApiResponse<null>> {
  return request.post('/setting/updateModel', data)
}

// 删除模型配置
export function deleteModel(id: number): Promise<ApiResponse<null>> {
  return request.post('/setting/delModel', { id })
}

// 配置模型
export function configurationModel(data: { id: number; configId: number }): Promise<ApiResponse<null>> {
  return request.post('/setting/configurationModel', data)
}

// 获取日志
export function getLog(params: { page?: number; pageSize?: number }): Promise<ApiResponse<{ list: Log[]; total: number }>> {
  return request.post('/setting/getLog', params)
}

// 测试 AI
export function testAI(data: { manufacturer: string; model: string; url?: string; key?: string }): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request.post('/other/testAI', data)
}

// 测试图像 AI
export function testImage(data: { manufacturer: string; model: string; url?: string; key?: string }): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request.post('/other/testImage', data)
}

// 测试视频 AI
export function testVideo(data: { manufacturer: string; model: string; url?: string; key?: string }): Promise<ApiResponse<{ success: boolean; message: string }>> {
  return request.post('/other/testVideo', data)
}