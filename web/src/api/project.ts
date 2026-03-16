import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { Project, CreateProjectParams, UpdateProjectParams } from '@/types/project'

// 获取项目列表
export function getProjectList(): Promise<ApiResponse<Project[]>> {
  return request.post('/project/getProject')
}

// 获取项目详情
export function getProjectDetail(id: number): Promise<ApiResponse<Project>> {
  return request.post('/project/getSingleProject', { id })
}

// 创建项目
export function createProject(data: CreateProjectParams): Promise<ApiResponse<{ id: number }>> {
  return request.post('/project/addProject', data)
}

// 更新项目
export function updateProject(data: UpdateProjectParams): Promise<ApiResponse<null>> {
  return request.post('/project/updateProject', data)
}

// 删除项目
export function deleteProject(id: number): Promise<ApiResponse<null>> {
  return request.post('/project/delProject', { id })
}

// 获取项目数量
export function getProjectCount(): Promise<ApiResponse<{ count: number }>> {
  return request.post('/project/getProjectCount')
}