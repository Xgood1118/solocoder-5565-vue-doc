<script setup lang="ts">
import { watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const uiStore = useUiStore()
const authStore = useAuthStore()
const router = useRouter()

const { notifications, unreadNotificationsCount } = storeToRefs(uiStore)
const { currentUser } = storeToRefs(authStore)

watch(() => uiStore.modals.notifications, async (open) => {
  if (open && currentUser.value) {
    await uiStore.loadNotifications(currentUser.value.id)
  }
})

function markAsRead(id: string) {
  uiStore.markNotificationAsRead(id)
}

function markAllRead() {
  if (currentUser.value) {
    uiStore.markAllNotificationsRead(currentUser.value.id)
  }
}

function goToNotification(notif: typeof notifications.value[0]) {
  markAsRead(notif.id)
  uiStore.closeModal('notifications')
  if (notif.documentId) {
    router.push(`/documents/${notif.documentId}`)
  }
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

const typeIcons: Record<string, string> = {
  mention: '💬',
  comment: '📝',
  share: '🔗',
  version: '📋'
}
</script>

<template>
  <div class="modal-overlay" @click.self="uiStore.closeModal('notifications')">
    <div class="notifications-panel animate-slide-up">
      <div class="panel-header">
        <h2 class="panel-title">通知中心</h2>
        <div class="header-actions">
          <button v-if="unreadNotificationsCount > 0" class="mark-all-btn" @click="markAllRead">
            全部已读
          </button>
          <button class="close-btn" @click="uiStore.closeModal('notifications')">✕</button>
        </div>
      </div>
      <div class="panel-body">
        <div v-if="notifications.length === 0" class="empty-state">
          <span class="empty-icon">🔔</span>
          <p>暂无通知</p>
          <p class="empty-desc">有新的评论、@提及或分享时会在这里显示</p>
        </div>
        <div v-else class="notifications-list">
          <button
            v-for="notif in notifications"
            :key="notif.id"
            class="notification-item"
            :class="{ unread: !notif.read }"
            @click="goToNotification(notif)"
          >
            <div class="notif-icon">{{ typeIcons[notif.type] || '📌' }}</div>
            <div class="notif-content">
              <div class="notif-header">
                <span class="notif-type">
                  {{ { mention: '被 @ 提及', comment: '新评论', share: '文档分享', version: '版本更新', edit: '文档编辑', resolve: '评论已解决' }[notif.type] }}
                </span>
                <span class="notif-time">{{ formatTime(notif.createdAt) }}</span>
              </div>
              <p class="notif-message">{{ notif.message }}</p>
              <div class="notif-doc">
                <span class="doc-icon">📄</span>
                <span class="doc-title">{{ notif.documentTitle }}</span>
              </div>
            </div>
            <div v-if="!notif.read" class="unread-dot"></div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  z-index: 1000;
}

.notifications-panel {
  width: 100%;
  max-width: 420px;
  height: 100%;
  background-color: var(--bg-primary);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mark-all-btn {
  font-size: 12px;
  color: var(--accent);
  padding: 4px 8px;
  border-radius: 4px;
}

.mark-all-btn:hover {
  background-color: var(--accent) + '10';
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 14px;
}

.close-btn:hover {
  background-color: var(--bg-tertiary);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  padding: 60px 24px;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-desc {
  font-size: 12px;
  margin-top: 4px;
}

.notifications-list {
  display: flex;
  flex-direction: column;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  text-align: left;
  border-bottom: 1px solid var(--border);
  position: relative;
  transition: background-color 0.15s;
}

.notification-item:hover {
  background-color: var(--bg-secondary);
}

.notification-item.unread {
  background-color: var(--accent) + '05';
}

.notif-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.notif-type {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}

.notif-time {
  font-size: 11px;
  color: var(--text-muted);
}

.notif-message {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-doc {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--accent);
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 8px;
}
</style>
