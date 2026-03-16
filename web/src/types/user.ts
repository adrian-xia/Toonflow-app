export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  name: string
  id: number
}

export interface UserInfo {
  id: number
  name: string
}