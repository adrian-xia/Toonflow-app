import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/project',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'project',
        name: 'Project',
        component: () => import('@/views/project/index.vue'),
        meta: { title: '项目管理' },
      },
      {
        path: 'project/:id',
        name: 'ProjectDetail',
        component: () => import('@/views/project/detail.vue'),
        meta: { title: '项目详情' },
      },
      {
        path: 'novel',
        name: 'Novel',
        component: () => import('@/views/novel/index.vue'),
        meta: { title: '小说管理' },
      },
      {
        path: 'outline',
        name: 'Outline',
        component: () => import('@/views/outline/index.vue'),
        meta: { title: '大纲管理' },
      },
      {
        path: 'script',
        name: 'Script',
        component: () => import('@/views/script/index.vue'),
        meta: { title: '剧本管理' },
      },
      {
        path: 'storyboard',
        name: 'Storyboard',
        component: () => import('@/views/storyboard/index.vue'),
        meta: { title: '分镜管理' },
      },
      {
        path: 'assets',
        name: 'Assets',
        component: () => import('@/views/assets/index.vue'),
        meta: { title: '素材管理' },
      },
      {
        path: 'video',
        name: 'Video',
        component: () => import('@/views/video/index.vue'),
        meta: { title: '视频管理' },
      },
      {
        path: 'setting',
        name: 'Setting',
        component: () => import('@/views/setting/index.vue'),
        meta: { title: '系统设置' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  const token = userStore.token || localStorage.getItem('token')

  if (to.meta.requiresAuth !== false && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && token) {
    next({ name: 'Project' })
  } else {
    // 设置页面标题
    document.title = `${to.meta.title || 'Toonflow'} - AI短剧工厂`
    next()
  }
})

export default router