<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'

const uiStore = useUiStore()
const authStore = useAuthStore()
const { currentUser } = storeToRefs(authStore)
const { unreadNotificationsCount } = storeToRefs(uiStore)

function toggleSidebar() {
  uiStore.toggleSidebar()
}

function openSearch() {
  uiStore.openModal('search')
}

function openNotifications() {
  uiStore.openModal('notifications')
}

function openSettings() {
  uiStore.openModal('settings')
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button class="icon-btn" @click="toggleSidebar" title="展开/收起侧边栏">
        ☰
      </button>
      <div class="header-title">
        <slot name="title">SoloDoc</slot>
      </div>
    </div>
    <div class="header-center">
      <div class="search-bar" @click="openSearch">
        <span class="search-icon">🔍</span>
        <span class="search-placeholder">搜索文档 (Ctrl+F)</span>
      </div>
    </div>
    <div class="header-right">
      <button class="icon-btn" @click="openSearch" title="搜索">
        🔍
      </button>
      <button class="icon-btn notification-btn" @click="openNotifications" title="通知">
        🔔
        <span v-if="unreadNotificationsCount > 0" class="notification-badge">
          {{ unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount }}
        </span>
      </button>
      <button class="icon-btn" @click="openSettings" title="设置">
        ⚙️
      </button>
      <div class="user-menu">
        <img :src="currentUser?.avatar" alt="" class="user-avatar" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background-color: var(--bg-primary);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-secondary);
  transition: background-color 0.15s;
}

.icon-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-center {
  flex: 1;
  max-width: 500px;
  margin: 0 20px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.search-bar:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--accent);
}

.search-icon {
  font-size: 14px;
  color: var(--text-muted);
}

.search-placeholder {
  font-size: 13px;
  color: var(--text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-btn {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background-color: var(--danger);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
}
</style>
