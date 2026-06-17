<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import type { PermissionRole, ShareLink } from '@/types'

const uiStore = useUiStore()
const documentsStore = useDocumentsStore()
const authStore = useAuthStore()

const { currentDocument, shareLinks } = storeToRefs(documentsStore)
const { allUsers } = storeToRefs(authStore)

type ShareRole = 'editor' | 'commenter' | 'viewer'
const selectedRole = ref<ShareRole>('viewer')
const expireDays = ref<number | null>(null)
const hasPassword = ref(false)
const password = ref('')
const generatedLink = ref<ShareLink | null>(null)
const showPassword = ref(false)

const origin = computed(() => window.location.origin)

watch(() => uiStore.modals.share, async (open) => {
  if (open && currentDocument.value) {
    await documentsStore.loadShareLinks(currentDocument.value.id)
    generatedLink.value = null
  }
})

async function generateLink() {
  if (!currentDocument.value) return
  const expiresAt = expireDays.value
    ? Date.now() + expireDays.value * 24 * 60 * 60 * 1000
    : undefined
  const pwd = hasPassword.value ? password.value : undefined
  generatedLink.value = await documentsStore.createShareLink(
    currentDocument.value.id,
    selectedRole.value,
    expiresAt,
    pwd
  )
}

function copyLink(link: ShareLink) {
  const url = `${origin.value}/share/${link.token}`
  navigator.clipboard.writeText(url)
  alert('链接已复制到剪贴板')
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const roleOptions = [
  { value: 'viewer', label: '浏览者' },
  { value: 'commenter', label: '评论者' },
  { value: 'editor', label: '编辑者' }
]

const expireOptions = [
  { value: null, label: '永不过期' },
  { value: 1, label: '1 天后' },
  { value: 7, label: '7 天后' },
  { value: 30, label: '30 天后' }
]
</script>

<template>
  <div class="modal-overlay" @click.self="uiStore.closeModal('share')">
    <div class="share-modal animate-slide-up">
      <div class="modal-header">
        <h2 class="modal-title">分享文档</h2>
        <button class="close-btn" @click="uiStore.closeModal('share')">✕</button>
      </div>
      <div class="modal-body">
        <div class="doc-info">
          <span class="doc-icon">📄</span>
          <span class="doc-title">{{ currentDocument?.title || '文档' }}</span>
        </div>
        <div class="section">
          <label class="field-label">权限设置</label>
          <div class="role-picker">
            <button
              v-for="role in roleOptions"
              :key="role.value"
              class="role-btn"
              :class="{ active: selectedRole === role.value }"
              @click="selectedRole = role.value as ShareRole"
            >
              {{ role.label }}
            </button>
          </div>
        </div>
        <div class="section">
          <label class="field-label">有效期</label>
          <div class="expire-picker">
            <button
              v-for="opt in expireOptions"
              :key="String(opt.value)"
              class="expire-btn"
              :class="{ active: expireDays === opt.value }"
              @click="expireDays = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="section">
          <label class="checkbox-field">
            <input type="checkbox" v-model="hasPassword" />
            <span>设置访问密码</span>
          </label>
          <div v-if="hasPassword" class="password-input-wrap">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="password-input"
              placeholder="输入访问密码"
            />
            <button class="toggle-password" @click="showPassword = !showPassword">
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>
        <button class="generate-btn" @click="generateLink">
          生成分享链接
        </button>
        <div v-if="generatedLink" class="generated-link animate-fade-in">
          <div class="link-display">
            <span class="link-url">{{ origin }}/share/{{ generatedLink?.token }}</span>
            <button class="copy-btn" @click="copyLink(generatedLink)">复制</button>
          </div>
          <div class="link-meta">
            <span>角色: {{ roleOptions.find(r => r.value === generatedLink?.role)?.label }}</span>
            <span v-if="generatedLink?.expiresAt">过期: {{ formatDate(generatedLink.expiresAt) }}</span>
            <span v-if="generatedLink?.password">🔒 密码保护</span>
          </div>
        </div>
        <div v-if="shareLinks.length > 0" class="section">
          <label class="field-label">已有分享链接 ({{ shareLinks.length }})</label>
          <div class="link-list">
            <div v-for="link in shareLinks" :key="link.id" class="link-item">
              <div class="link-info">
                <span class="link-token">{{ link.token.slice(0, 12) }}...</span>
                <span class="link-role">{{ roleOptions.find(r => r.value === link.role)?.label }}</span>
                <span v-if="link.expiresAt" class="link-expire">
                  {{ Date.now() > link.expiresAt ? '已过期' : formatDate(link.expiresAt) }}
                </span>
              </div>
              <div class="link-actions">
                <button class="action-btn" @click="copyLink(link)" title="复制链接">📋</button>
                <button class="action-btn danger" @click="documentsStore.removeShareLink(link.id)" title="删除">🗑️</button>
              </div>
            </div>
          </div>
        </div>
        <div class="section">
          <label class="field-label">团队成员权限</label>
          <div class="member-list">
            <div v-for="user in allUsers.slice(0, 5)" :key="user.id" class="member-item">
              <img :src="user.avatar" alt="" class="member-avatar" />
              <span class="member-name">{{ user.name }}</span>
              <select
                class="member-role"
                :value="user.role"
                @change="authStore.setUserRole(user.id, ($event.target as HTMLSelectElement).value as PermissionRole)"
              >
                <option value="owner">所有者</option>
                <option value="editor">编辑者</option>
                <option value="commenter">评论者</option>
                <option value="viewer">浏览者</option>
              </select>
            </div>
          </div>
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
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.share-modal {
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  background-color: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
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

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.doc-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 20px;
}

.doc-icon {
  font-size: 18px;
}

.doc-title {
  font-weight: 500;
  color: var(--text-primary);
}

.section {
  margin-bottom: 20px;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.role-picker, .expire-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.role-btn, .expire-btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  background-color: var(--bg-primary);
  transition: all 0.15s;
}

.role-btn:hover, .expire-btn:hover {
  border-color: var(--accent);
}

.role-btn.active, .expire-btn.active {
  border-color: var(--accent);
  background-color: var(--accent) + '15';
  color: var(--accent);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
}

.password-input-wrap {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.password-input {
  flex: 1;
}

.toggle-password {
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 14px;
}

.generate-btn {
  width: 100%;
  padding: 12px;
  background-color: var(--accent);
  color: white;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 16px;
  transition: background-color 0.2s;
}

.generate-btn:hover {
  background-color: var(--accent-hover);
}

.generated-link {
  padding: 16px;
  background-color: var(--success) + '15';
  border: 1px solid var(--success) + '40';
  border-radius: 8px;
  margin-bottom: 20px;
}

.link-display {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.link-url {
  flex: 1;
  font-size: 12px;
  font-family: monospace;
  color: var(--text-secondary);
  word-break: break-all;
}

.copy-btn {
  padding: 6px 12px;
  background-color: var(--success);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  flex-shrink: 0;
}

.link-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: var(--bg-secondary);
  border-radius: 6px;
}

.link-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.link-token {
  font-family: monospace;
  color: var(--text-primary);
}

.link-role {
  padding: 2px 6px;
  background-color: var(--accent) + '15';
  color: var(--accent);
  border-radius: 3px;
}

.link-expire {
  color: var(--text-muted);
}

.link-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  font-size: 14px;
}

.action-btn:hover {
  background-color: var(--bg-tertiary);
}

.action-btn.danger:hover {
  background-color: var(--danger) + '20';
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.member-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
}

.member-role {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  background-color: var(--bg-primary);
  color: var(--text-secondary);
}
</style>
