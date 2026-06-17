<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import type { Notification } from '@/types'

const uiStore = useUiStore()
const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  uiStore.loadNotifications(authStore.currentUser!.id)
})

const sortedNotifications = computed(() => {
  return [...uiStore.notifications].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

const unreadCount = computed(() => 
  uiStore.notifications.filter(n => !n.read).length
)

const formatDate = (dateStr: string | number) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    mention: '@',
    comment: '💬',
    resolve: '✅',
    share: '🔗',
    edit: '✏️'
  }
  return iconMap[type] || '📢'
}

const handleClick = (notification: Notification) => {
  if (!notification.read) {
    uiStore.markNotificationAsRead(notification.id)
  }
  if (notification.documentId) {
    router.push(`/document/${notification.documentId}`)
  }
}

const markAllRead = () => {
  uiStore.markAllNotificationsRead(authStore.currentUser!.id)
}

const getUserName = (userId: string) => {
  return authStore.allUsers.find(u => u.id === userId)?.name || '未知用户'
}

const getUserAvatarColor = (userId: string) => {
  return authStore.allUsers.find(u => u.id === userId)?.color || '#666'
}
</script>

<template>
  <div class="notifications-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">通知中心</h1>
        <p class="page-subtitle" v-if="unreadCount > 0">
          你有 {{ unreadCount }} 条未读通知
        </p>
        <p class="page-subtitle" v-else>
          暂无未读通知
        </p>
      </div>
      <button 
        class="btn btn-secondary" 
        @click="markAllRead"
        :disabled="unreadCount === 0"
      >
        全部标记已读
      </button>
    </div>

    <div class="notifications-list">
      <div
        v-for="notification in sortedNotifications"
        :key="notification.id"
        class="notification-item"
        :class="{ unread: !notification.read }"
        @click="handleClick(notification)"
      >
        <div 
          class="notif-avatar"
          :style="{ backgroundColor: getUserAvatarColor(notification.userId) }"
        >
          {{ getNotificationIcon(notification.type) }}
        </div>
        
        <div class="notif-content">
          <div class="notif-header">
            <span class="notif-from">{{ getUserName(notification.userId) }}</span>
            <span class="notif-type-badge" :class="notification.type">
              {{ notification.type === 'mention' ? '提到了你' :
                 notification.type === 'comment' ? '评论了' :
                 notification.type === 'resolve' ? '解决了评论' :
                 notification.type === 'share' ? '分享了文档' :
                 notification.type === 'edit' ? '编辑了文档' :
                 notification.type }}
            </span>
          </div>
          <p class="notif-message">{{ notification.message }}</p>
          <span class="notif-time">{{ formatDate(notification.createdAt) }}</span>
        </div>
        
        <div v-if="!notification.read" class="unread-dot"></div>
      </div>
    </div>

    <div v-if="sortedNotifications.length === 0" class="empty-state">
      <div class="empty-icon">🔔</div>
      <h3>暂无通知</h3>
      <p>当有人 @ 你或评论你的文档时，会在这里显示</p>
    </div>
  </div>
</template>

<style scoped>
.notifications-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.notification-item:hover {
  background: var(--bg-tertiary);
}

.notification-item.unread {
  background: color-mix(in srgb, var(--primary-500) 5%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--primary-400) 30%, var(--border-color));
}

.notif-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  flex-shrink: 0;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.notif-from {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.notif-type-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.notif-type-badge.mention {
  background: var(--primary-100);
  color: var(--primary-600);
}

.notif-type-badge.comment {
  background: var(--info-100);
  color: var(--info-600);
}

.notif-type-badge.resolve {
  background: var(--success-100);
  color: var(--success-600);
}

.notif-type-badge.share {
  background: var(--warning-100);
  color: var(--warning-600);
}

.notif-type-badge.edit {
  background: var(--secondary-100);
  color: var(--secondary-600);
}

.notif-message {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 0.375rem;
}

.notif-time {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-500);
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}
</style>
