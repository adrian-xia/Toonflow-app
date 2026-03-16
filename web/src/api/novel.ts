import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { Novel, CreateNovelParams } from '@/types/novel'

// 获取小说列表
export function getNovelList(projectId: number): Promise<ApiResponse<Novel[]>> {
  return request.post('/novel/getNovel', { projectId })
}

// 添加小说章节
export function addNovel(data: CreateNovelParams): Promise<ApiResponse<{ id: number }>> {
  return request.post('/novel/addNovel', data)
}

// 更新小说章节
export function updateNovel(data: Partial<Novel> & { id: number }): Promise<ApiResponse<null>> {
  return request.post('/novel/updateNovel', data)
}

// 删除小说章节
export function deleteNovel(id: number): Promise<ApiResponse<null>> {
  return request.post('/novel/delNovel', { id })
}