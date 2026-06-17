<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { getShareLinkByToken } from '@/utils/idb'
import type { Document, PermissionRole } from '@/types'

const route = useRoute()
const router = useRouter()
const documentsStore = useDocumentsStore()
const authStore = useAuthStore()

const token = route.params.token as string
const isLoading = ref(true)
const error = ref<string | null>(null)
const document = ref<Document | null>(null)
const requirePassword = ref(false)
const password = ref('')
const passwordError = ref(false)
const shareRole = ref<PermissionRole>('viewer')

onMounted(async () => {
  try {
    const shareLink = await getShareLinkByToken(token)
    
    if (!shareLink) {
      error.value = '分享链接不存在或已被撤销'
      isLoading.value = false
      return
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      error.value = '分享链接已过期'
      isLoading.value = false
      return
    }

    if (shareLink.password) {
      requirePassword.value = true
      isLoading.value = false
      return
    }

    shareRole.value = shareLink.role
    await loadDocument(shareLink.documentId)
  } catch (e) {
    error.value = '加载失败，请稍后重试'
    isLoading.value = false
  }
})

const verifyPassword = async () => {
  passwordError.value = false
  const shareLink = await getShareLinkByToken(token)
  
  if (shareLink?.password === password.value) {
    requirePassword.value = false
    shareRole.value = shareLink.role
    await loadDocument(shareLink.documentId)
  } else {
    passwordError.value = true
  }
}

const loadDocument = async (documentId: string) => {
  await documentsStore.loadDocument(documentId)
  document.value = documentsStore.currentDocument
  isLoading.value = false
}

const handleLogin = () => {
  router.push('/login')
}

const getRoleText = (role: PermissionRole) => {
  const roleMap: Record<PermissionRole, string> = {
    owner: '所有者',
    viewer: '只读访问',
    commenter: '可评论',
    editor: '可编辑'
  }
  return roleMap[role] || '只读访问'
}
</script>

<template>
  <div class="shared-page">
    <div class="shared-header">
      <div class="logo">📝 SoloDoc</div>
      <button v-if="!authStore.isLoggedIn" class="btn btn-secondary" @click="handleLogin">
        登录
      </button>
    </div>

    <div class="shared-content">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <div class="error-icon">❌</div>
        <h2>{{ error }}</h2>
        <button class="btn btn-primary" @click="router.push('/dashboard')">
          返回首页
        </button>
      </div>

      <div v-else-if="requirePassword" class="password-form">
        <div class="lock-icon">🔒</div>
        <h2>此文档需要访问密码</h2>
        <p>请输入分享者提供的密码</p>
        
        <div class="password-input-group" :class="{ error: passwordError }">
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            @keyup.enter="verifyPassword"
          />
          <button class="btn btn-primary" @click="verifyPassword">
            访问
          </button>
        </div>
        
        <p v-if="passwordError" class="error-message">
          密码错误，请重试
        </p>
      </div>

      <div v-else-if="document" class="document-view">
        <div class="doc-info-bar">
          <h1 class="doc-title">{{ document.title }}</h1>
          <span class="access-badge">
            {{ getRoleText(shareRole) }}
          </span>
        </div>

        <div class="doc-content">
          <div
            v-for="block in document.blocks"
            :key="block.id"
            class="block"
            :class="`block-${block.type}`"
          >
            <h1 v-if="block.type === 'h1'" class="block-content">
              {{ block.content }}
            </h1>
            <h2 v-else-if="block.type === 'h2'" class="block-content">
              {{ block.content }}
            </h2>
            <h3 v-else-if="block.type === 'h3'" class="block-content">
              {{ block.content }}
            </h3>
            <h4 v-else-if="block.type === 'h4'" class="block-content">
              {{ block.content }}
            </h4>
            <h5 v-else-if="block.type === 'h5'" class="block-content">
              {{ block.content }}
            </h5>
            <h6 v-else-if="block.type === 'h6'" class="block-content">
              {{ block.content }}
            </h6>
            <p v-else-if="block.type === 'paragraph'" class="block-content">
              {{ block.content }}
            </p>
            <ul v-else-if="block.type === 'bulleted-list'" class="block-content">
              <li v-for="(item, idx) in block.content.split('\n')" :key="idx">{{ item }}</li>
            </ul>
            <ol v-else-if="block.type === 'numbered-list'" class="block-content">
              <li v-for="(item, idx) in block.content.split('\n')" :key="idx">{{ item }}</li>
            </ol>
            <blockquote v-else-if="block.type === 'quote'" class="block-content">
              {{ block.content }}
            </blockquote>
            <pre v-else-if="block.type === 'code'" class="block-content"><code>{{ block.content }}</code></pre>
            <div v-else-if="block.type === 'image'" class="block-content image-block">
              <img :src="block.imageData" :alt="block.imageAlt || ''" />
              <p v-if="block.imageCaption" class="image-caption">{{ block.imageCaption }}</p>
            </div>
            <div v-else-if="block.type === 'table'" class="block-content table-block">
              <table>
                <tbody>
                  <tr v-for="(row, rowIdx) in block.tableData" :key="rowIdx">
                    <td v-for="(cell, cellIdx) in row" :key="cellIdx">
                      {{ cell }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else-if="block.type === 'todo'" class="block-content todo-block">
              <input type="checkbox" :checked="block.checked" disabled />
              <span :class="{ checked: block.checked }">{{ block.content }}</span>
            </div>
            <div v-else-if="block.type === 'attachment'" class="block-content attachment-block">
              <span class="file-icon">📎</span>
              <a :href="block.attachmentData" :download="block.attachmentName">
                {{ block.attachmentName }}
              </a>
              <span class="file-size">{{ (block.attachmentSize! / 1024).toFixed(1) }} KB</span>
            </div>
            <div v-else-if="block.type === 'divider'" class="block-divider"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shared-page {
  min-height: 100vh;
  background: var(--bg-primary);
}

.shared-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.shared-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-state,
.error-state,
.password-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.lock-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h2,
.password-form h2 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.error-state p,
.password-form p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.password-input-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  max-width: 400px;
  margin-bottom: 0.5rem;
}

.password-input-group input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
}

.password-input-group.error input {
  border-color: var(--danger-500);
}

.error-message {
  color: var(--danger-500);
  font-size: 0.875rem;
}

.doc-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.doc-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.access-badge {
  padding: 0.375rem 0.75rem;
  background: var(--primary-100);
  color: var(--primary-600);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
}

.doc-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.block {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.block-content {
  color: var(--text-primary);
  line-height: 1.7;
  margin: 0;
}

.block-h1 .block-content { font-size: 2rem; font-weight: 700; margin-top: 1.5rem; }
.block-h2 .block-content { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; }
.block-h3 .block-content { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; }
.block-h4 .block-content { font-size: 1.1rem; font-weight: 600; }
.block-h5 .block-content { font-size: 1rem; font-weight: 600; }
.block-h6 .block-content { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); }

.block-quote .block-content {
  border-left: 4px solid var(--primary-400);
  padding-left: 1rem;
  color: var(--text-secondary);
  font-style: italic;
}

.block-code .block-content {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
}

.image-block {
  text-align: center;
}

.image-block img {
  max-width: 100%;
  border-radius: 8px;
}

.image-caption {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.table-block table {
  width: 100%;
  border-collapse: collapse;
}

.table-block td {
  border: 1px solid var(--border-color);
  padding: 0.5rem 0.75rem;
}

.todo-block {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.todo-block input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.todo-block .checked {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.attachment-block {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.attachment-block a {
  color: var(--primary-500);
  text-decoration: none;
}

.attachment-block a:hover {
  text-decoration: underline;
}

.file-size {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

.block-divider {
  height: 1px;
  background: var(--border-color);
  margin: 1rem 0;
}
</style>
