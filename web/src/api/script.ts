import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { Script } from '@/types/outline'

// 获取剧本列表
export function getScriptList(projectId: number): Promise<ApiResponse<Script[]>> {
  return request.post('/script/getScript', { projectId })
}

// 获取部分剧本
export function getPartScript(outlineId: number): Promise<ApiResponse<Script[]>> {
  return request.post('/outline/getPartScript', { outlineId })
}

// 更新剧本
export function updateScript(data: Partial<Script> & { id: number }): Promise<ApiResponse<null>> {
  return request.post('/outline/updateScript', data)
}

// 生成剧本
export function generateScript(data: { outlineId: number; scriptId: number }): Promise<ApiResponse<null>> {
  return request.post('/script/generateScriptApi', data)
}

// 添加剧本
export function addScript(data: { name: string; outlineId: number; projectId: number }): Promise<ApiResponse<{ id: number }>> {
  return request.post('/script/addScript', data)
}

// 删除剧本
export function deleteScript(id: number): Promise<ApiResponse<null>> {
  return request.post('/script/delScript', { id })
}