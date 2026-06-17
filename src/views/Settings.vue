<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import type { KeyboardShortcut } from '@/types'

const uiStore = useUiStore()
const authStore = useAuthStore()
const router = useRouter()

const activeTab = ref<'theme' | 'shortcuts' | 'account'>('theme')

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const resetShortcuts = () => {
  if (confirm('确定要重置所有快捷键为默认值吗？')) {
    uiStore.resetShortcuts()
  }
}

const getShortcutKeys = (shortcut: KeyboardShortcut): string[] => {
  if (shortcut.keys) return shortcut.keys
  return shortcut.currentKey.split('+').map(k => k.trim())
}
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h1 class="page-title">设置</h1>
    </div>

    <div class="settings-container">
      <div class="settings-sidebar">
        <button
          class="sidebar-item"
          :class="{ active: activeTab === 'theme' }"
          @click="activeTab = 'theme'"
        >
          <span class="icon">🎨</span>
          主题设置
        </button>
        <button
          class="sidebar-item"
          :class="{ active: activeTab === 'shortcuts' }"
          @click="activeTab = 'shortcuts'"
        >
          <span class="icon">⌨️</span>
          快捷键
        </button>
        <button
          class="sidebar-item"
          :class="{ active: activeTab === 'account' }"
          @click="activeTab = 'account'"
        >
          <span class="icon">👤</span>
          账号
        </button>
      </div>

      <div class="settings-content">
        <div v-if="activeTab === 'theme'" class="settings-panel">
          <h2 class="panel-title">选择主题</h2>
          <p class="panel-desc">选择你喜欢的界面主题</p>
          
          <div class="themes-grid">
            <button
              v-for="theme in uiStore.availableThemes"
              :key="theme.id"
              class="theme-card"
              :class="{ active: uiStore.currentTheme === theme.id }"
              @click="uiStore.setTheme(theme.id)"
            >
              <div class="theme-preview" :style="theme.variables">
                <div class="preview-bar"></div>
                <div class="preview-content">
                  <div class="preview-line"></div>
                  <div class="preview-line short"></div>
                </div>
              </div>
              <span class="theme-name">{{ theme.name }}</span>
              <span v-if="uiStore.currentTheme === theme.id" class="checkmark">✓</span>
            </button>
          </div>
        </div>

        <div v-if="activeTab === 'shortcuts'" class="settings-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">快捷键设置</h2>
              <p class="panel-desc">自定义你的快捷键</p>
            </div>
            <button class="btn btn-secondary" @click="resetShortcuts">
              重置默认
            </button>
          </div>

          <div class="shortcuts-list">
            <div
              v-for="shortcut in uiStore.shortcuts"
              :key="shortcut.id"
              class="shortcut-item"
            >
              <span class="shortcut-name">{{ shortcut.name }}</span>
              <div class="shortcut-keys">
                <kbd v-for="(key, idx) in getShortcutKeys(shortcut)" :key="idx" class="key">
                  {{ key }}
                </kbd>
              </div>
            </div>
          </div>

          <div v-if="uiStore.shortcutConflicts.length > 0" class="conflict-warning">
            <span class="warning-icon">⚠️</span>
            <div>
              <p class="conflict-title">检测到快捷键冲突</p>
              <p class="conflict-detail">
                {{ uiStore.shortcutConflicts.map(c => `${c.name} (${c.keys})`).join('、') }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'account'" class="settings-panel">
          <h2 class="panel-title">账号信息</h2>
          <p class="panel-desc">管理你的账号</p>

          <div class="account-info">
            <div 
              class="account-avatar"
              :style="{ backgroundColor: authStore.currentUser?.color }"
            >
              {{ authStore.currentUser?.name?.charAt(0) }}
            </div>
            <div class="account-details">
              <h3 class="account-name">{{ authStore.currentUser?.name }}</h3>
              <p class="account-role">
                {{ authStore.currentUser?.role === 'owner' ? '所有者' :
                   authStore.currentUser?.role === 'editor' ? '编辑者' :
                   authStore.currentUser?.role === 'commenter' ? '评论者' : '查看者' }}
              </p>
            </div>
          </div>

          <div class="account-actions">
            <button class="btn btn-danger" @click="handleLogout">
              退出登录
            </button>
          </div>

          <div class="data-section">
            <h3 class="section-title">数据管理</h3>
            <p class="section-desc">所有数据保存在浏览器本地</p>
            <div class="data-stats">
              <div class="stat-item">
                <span class="stat-label">存储位置</span>
                <span class="stat-value">IndexedDB + localStorage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-container {
  display: flex;
  gap: 2rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.settings-sidebar {
  width: 200px;
  border-right: 1px solid var(--border);
  padding: 1rem 0;
}

.sidebar-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  font-size: 0.95rem;
  transition: all 0.15s ease;
}

.sidebar-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  font-weight: 500;
}

.sidebar-item .icon {
  font-size: 1.1rem;
}

.settings-content {
  flex: 1;
  padding: 2rem;
}

.settings-panel {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.panel-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.panel-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}

.theme-card {
  position: relative;
  background: var(--bg-primary);
  border: 2px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.theme-card:hover {
  border-color: var(--accent);
}

.theme-card.active {
  border-color: var(--accent);
}

.theme-preview {
  height: 80px;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
}

.preview-bar {
  height: 8px;
  background: var(--accent);
  border-radius: 2px;
  margin-bottom: 0.75rem;
}

.preview-line {
  height: 6px;
  background: var(--text-muted);
  border-radius: 2px;
  margin-bottom: 0.375rem;
}

.preview-line.short {
  width: 60%;
}

.theme-name {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
}

.checkmark {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 20px;
  height: 20px;
  background: var(--accent);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.shortcut-name {
  color: var(--text-primary);
  font-size: 0.9rem;
}

.shortcut-keys {
  display: flex;
  gap: 0.25rem;
}

.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 0.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.conflict-warning {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border: 1px solid var(--warning);
  border-radius: 8px;
  margin-top: 1.5rem;
}

.warning-icon {
  font-size: 1.25rem;
}

.conflict-title {
  font-weight: 600;
  color: var(--warning);
  margin-bottom: 0.25rem;
}

.conflict-detail {
  font-size: 0.875rem;
  color: var(--warning);
}

.account-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 1.5rem;
}

.account-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
}

.account-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.account-role {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.account-actions {
  margin-bottom: 2rem;
}

.data-section {
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.section-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.data-stats {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  color: var(--text-primary);
  font-family: monospace;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .settings-container {
    flex-direction: column;
  }
  
  .settings-sidebar {
    width: 100%;
    display: flex;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 0.5rem;
    gap: 0.5rem;
    overflow-x: auto;
  }
  
  .sidebar-item {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
  }
}
</style>
