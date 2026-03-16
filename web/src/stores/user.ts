import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login, logout } from '@/api/user'
import type { LoginParams } from '@/types/user'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<any>(null)

  const loginAction = async (params: LoginParams) => {
    const res = await login(params)
    if (res.code === 200) {
      token.value = res.data.token
      userInfo.value = {
        id: res.data.id,
        name: res.data.name,
      }
      localStorage.setItem('token', res.data.token)
    }
    return res
  }

  const logoutAction = async () => {
    await logout()
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  const setUserInfo = (info: any) => {
    userInfo.value = info
  }

  return {
    token,
    userInfo,
    login: loginAction,
    logout: logoutAction,
    loginAction,
    logoutAction,
    setUserInfo,
  }
})