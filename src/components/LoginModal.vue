<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const { allUsers } = storeToRefs(authStore)

function selectUser(userId: string) {
  authStore.loginAs(userId)
}
</script>

<template>
  <div class="login-overlay">
    <div class="login-modal animate-slide-up">
      <div class="login-header">
        <div class="app-logo">📝</div>
        <h1 class="app-title">SoloDoc</h1>
        <p class="app-subtitle">轻量级浏览器内协作文档工具</p>
      </div>
      <div class="login-content">
        <h2 class="section-title">选择身份登录</h2>
        <p class="section-desc">模拟不同角色体验协作功能（多 tab 打开模拟多人协作）</p>
        <div class="user-list">
          <button
            v-for="user in allUsers"
            :key="user.id"
            class="user-card"
            @click="selectUser(user.id)"
          >
            <img :src="user.avatar" alt="" class="user-avatar" />
            <div class="user-info">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-role-badge" :class="user.role">
                {{ { owner: '所有者', editor: '编辑者', commenter: '评论者', viewer: '浏览者' }[user.role] }}
              </span>
            </div>
            <span class="select-arrow">→</span>
          </button>
        </div>
      </div>
      <div class="login-footer">
        <p>💡 打开多个浏览器标签页，选择不同用户体验多人协作</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-modal {
  width: 100%;
  max-width: 480px;
  background-color: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.login-header {
  padding: 40px 32px 24px;
  text-align: center;
  background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
  border-bottom: 1px solid var(--border);
}

.app-logo {
  font-size: 48px;
  margin-bottom: 12px;
}

.app-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.app-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.login-content {
  padding: 24px 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.section-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background-color: var(--bg-primary);
  transition: all 0.2s;
  text-align: left;
}

.user-card:hover {
  border-color: var(--accent);
  background-color: var(--accent) + '08';
  transform: translateX(4px);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.user-role-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  width: fit-content;
}

.user-role-badge.owner {
  background-color: var(--accent) + '20';
  color: var(--accent);
}

.user-role-badge.editor {
  background-color: var(--success) + '20';
  color: var(--success);
}

.user-role-badge.commenter {
  background-color: var(--warning) + '20';
  color: var(--warning);
}

.user-role-badge.viewer {
  background-color: var(--text-muted) + '20';
  color: var(--text-muted);
}

.select-arrow {
  color: var(--text-muted);
  font-size: 16px;
  transition: transform 0.2s;
}

.user-card:hover .select-arrow {
  transform: translateX(4px);
  color: var(--accent);
}

.login-footer {
  padding: 16px 32px 24px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  background-color: var(--bg-secondary);
}
</style>
