<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <h1>Toonflow</h1>
        <p>AI短剧工厂</p>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="aside-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="/project">
          <el-icon><Folder /></el-icon>
          <span>项目管理</span>
        </el-menu-item>
        <el-menu-item index="/novel">
          <el-icon><Document /></el-icon>
          <span>小说管理</span>
        </el-menu-item>
        <el-menu-item index="/outline">
          <el-icon><List /></el-icon>
          <span>大纲管理</span>
        </el-menu-item>
        <el-menu-item index="/script">
          <el-icon><EditPen /></el-icon>
          <span>剧本管理</span>
        </el-menu-item>
        <el-menu-item index="/storyboard">
          <el-icon><Picture /></el-icon>
          <span>分镜管理</span>
        </el-menu-item>
        <el-menu-item index="/assets">
          <el-icon><Files /></el-icon>
          <span>素材管理</span>
        </el-menu-item>
        <el-menu-item index="/video">
          <el-icon><VideoCamera /></el-icon>
          <span>视频管理</span>
        </el-menu-item>
        <el-menu-item index="/setting">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <span class="page-title">{{ currentTitle }}</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              <span>{{ username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'
import {
  Folder,
  Document,
  List,
  EditPen,
  Picture,
  Files,
  VideoCamera,
  Setting,
  User
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/project')) return '/project'
  return path
})

const currentTitle = computed(() => {
  return route.meta.title as string || 'Toonflow'
})

const username = computed(() => {
  return userStore.userInfo?.username || 'admin'
})

const handleCommand = (command: string) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      userStore.logout()
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
}

.aside {
  background-color: #304156;

  .logo {
    height: 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #fff;
    border-bottom: 1px solid #3a4a5b;

    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: #bfcbd9;
    }
  }

  .aside-menu {
    border-right: none;
  }
}

.header {
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;

  .header-left {
    .page-title {
      font-size: 18px;
      font-weight: 500;
      color: #303133;
    }
  }

  .header-right {
    .user-info {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: #606266;

      &:hover {
        color: #409EFF;
      }
    }
  }
}

.main {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>