import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProjectStore = defineStore('project', () => {
  const currentProjectId = ref<number | null>(null)
  const currentProjectName = ref<string>('')

  const setCurrentProject = (id: number, name: string) => {
    currentProjectId.value = id
    currentProjectName.value = name
    // 持久化到 localStorage
    localStorage.setItem('currentProjectId', String(id))
    localStorage.setItem('currentProjectName', name)
  }

  const clearCurrentProject = () => {
    currentProjectId.value = null
    currentProjectName.value = ''
    localStorage.removeItem('currentProjectId')
    localStorage.removeItem('currentProjectName')
  }

  const loadFromStorage = () => {
    const id = localStorage.getItem('currentProjectId')
    const name = localStorage.getItem('currentProjectName')
    if (id && name) {
      currentProjectId.value = Number(id)
      currentProjectName.value = name
    }
  }

  return {
    currentProjectId,
    currentProjectName,
    setCurrentProject,
    clearCurrentProject,
    loadFromStorage
  }
})
