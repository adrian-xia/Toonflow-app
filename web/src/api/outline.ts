import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { Outline, Storyline, CreateOutlineParams, UpdateOutlineParams } from '@/types/outline'

// 获取大纲列表
export function getOutlineList(projectId: number): Promise<ApiResponse<Outline[]>> {
  return request.post('/outline/getOutline', { projectId })
}

// 添加大纲
export function addOutline(data: CreateOutlineParams): Promise<ApiResponse<{ id: number }>> {
  return request.post('/outline/addOutline', data)
}

// 更新大纲
export function updateOutline(data: UpdateOutlineParams): Promise<ApiResponse<null>> {
  return request.post('/outline/updateOutline', data)
}

// 删除大纲
export function deleteOutline(id: number): Promise<ApiResponse<null>> {
  return request.post('/outline/delOutline', { id })
}

// 获取故事线
export function getStoryline(projectId: number): Promise<ApiResponse<Storyline[]>> {
  return request.post('/outline/getStoryline', { projectId })
}

// 更新故事线
export function updateStoryline(data: Partial<Storyline> & { id: number }): Promise<ApiResponse<null>> {
  return request.post('/outline/updateStoryline', data)
}

// 获取历史记录
export function getHistory(projectId: number): Promise<ApiResponse<any[]>> {
  return request.post('/outline/getHistory', { projectId })
}

// 设置历史记录
export function setHistory(projectId: number, history: any[]): Promise<ApiResponse<null>> {
  return request.post('/outline/setHistory', { projectId, history })
}

// WebSocket 路径
export const WS_OUTLINE_PATH = '/outline/agentsOutline'