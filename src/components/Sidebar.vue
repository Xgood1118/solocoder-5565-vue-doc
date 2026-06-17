<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useDocumentsStore } from '@/stores/documents'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

const uiStore = useUiStore()
const authStore = useAuthStore()
const documentsStore = useDocumentsStore()
const router = useRouter()
const route = useRoute()

const { documents, isLoading } = storeToRefs(documentsStore)
const { currentUser } = storeToRefs(authStore)
const { activeTab, tags } = storeToRefs(uiStore)

const navItems = [
  { id: 'dashboard', name: '仪表板', icon: '📊', path: '/' },
  { id: 'documents', name: '所有文档', icon: '📄', path: '/documents' },
  { id: 'templates', name: '模板库', icon: '📋', path: '/templates' },
  { id: 'search', name: '搜索', icon: '🔍', path: '/search' },
  { id: 'notifications', name: '通知', icon: '🔔', path: '/notifications' },
  { id: 'settings', name: '设置', icon: '⚙️', path: '/settings' }
]

const recentDocs = computed(() => {
  return documents.value
    .filter(d => d.lastOpenedAt > 0)
    .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
    .slice(0, 5)
})

function navigateTo(path: string, tabId: string) {
  uiStore.setActiveTab(tabId)
  router.push(path)
}

function openDocument(id: string) {
  router.push(`/documents/${id}`)
}

function createNewDoc() {
  uiStore.openModal('templatePicker')
}

function toggleSidebar() {
  uiStore.toggleSidebar()
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">📝</span>
        <span class="logo-text">SoloDoc</span>
      </div>
      <button class="collapse-btn" @click="toggleSidebar" title="收起侧边栏">
        ◀
      </button>
    </div>
    <button class="new-doc-btn" @click="createNewDoc">
      <span>+</span> 新建文档
    </button>
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-title">导航</div>
        <button
          v-for="item in navItems.slice(0, 4)"
          :key="item.id"
          class="nav-item"
          :class="{ active: route.path === item.path }"
          @click="navigateTo(item.path, item.id)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </button>
      </div>
      <div class="nav-section">
        <div class="nav-section-title">最近文档</div>
        <div v-if="isLoading" class="loading-text">加载中...</div>
        <div v-else-if="recentDocs.length === 0" class="empty-text">暂无最近文档</div>
        <button
          v-for="doc in recentDocs"
          :key="doc.id"
          class="nav-item doc-item"
          @click="openDocument(doc.id)"
        >
          <span class="doc-icon">📄</span>
          <span class="doc-info">
            <span class="doc-title">{{ doc.title }}</span>
            <span class="doc-date">{{ formatDate(doc.lastOpenedAt) }}</span>
          </span>
        </button>
      </div>
      <div class="nav-section" v-if="tags.length > 0">
        <div class="nav-section-title">标签</div>
        <div class="tag-list">
          <span
            v-for="tag in tags"
            :key="tag.id"
            class="tag-chip"
            :style="{ backgroundColor: tag.color + '20', color: tag.color }"
          >
            {{ tag.name }}
          </span>
        </div>
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="user-info">
        <img :src="currentUser?.avatar" alt="" class="user-avatar" />
        <div class="user-details">
          <span class="user-name">{{ currentUser?.name }}</span>
          <span class="user-role">{{ currentUser?.role }}</span>
        </div>
        <button class="logout-btn" @click="authStore.logout()" title="切换用户">
          🔄
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  height: 100%;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 18px;
  color: var(--text-primary);
}

.logo-icon {
  font-size: 24px;
}

.collapse-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.collapse-btn:hover {
  background-color: var(--bg-tertiary);
}

.new-doc-btn {
  margin: 16px 20px;
  padding: 10px 16px;
  background-color: var(--accent);
  color: white;
  border-radius: 6px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background-color 0.2s;
}

.new-doc-btn:hover {
  background-color: var(--accent-hover);
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.nav-section {
  margin-bottom: 16px;
}

.nav-section-title {
  padding: 0 20px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 20px;
  text-align: left;
  color: var(--text-secondary);
  transition: background-color 0.15s, color 0.15s;
}

.nav-item:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.active {
  background-color: var(--accent) + '15';
  color: var(--accent);
}

.nav-icon {
  font-size: 16px;
  width: 20px;
}

.doc-item {
  flex-direction: row;
  align-items: flex-start;
}

.doc-icon {
  margin-top: 2px;
}

.doc-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.doc-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-date {
  font-size: 11px;
  color: var(--text-muted);
}

.loading-text, .empty-text {
  padding: 8px 20px;
  font-size: 12px;
  color: var(--text-muted);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 20px;
}

.tag-chip {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 11px;
  color: var(--text-muted);
}

.logout-btn {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.logout-btn:hover {
  background-color: var(--bg-tertiary);
}
</style>
