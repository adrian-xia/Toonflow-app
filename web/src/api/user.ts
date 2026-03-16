import request from '@/utils/request'
import type { ApiResponse } from '@/types/common'
import type { LoginParams, LoginResult, UserInfo } from '@/types/user'

// 登录
export function login(data: LoginParams): Promise<ApiResponse<LoginResult>> {
  return request.post('/other/login', data)
}

// 登出
export function logout(): Promise<ApiResponse<null>> {
  return request.post('/other/logout')
}

// 获取用户信息
export function getUserInfo(): Promise<ApiResponse<UserInfo>> {
  return request.get('/user/getUser')
}