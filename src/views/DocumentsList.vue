<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import TemplatePickerModal from '@/components/TemplatePickerModal.vue'
import ShareModal from '@/components/ShareModal.vue'
import type { Document, Block } from '@/types'

const documentsStore = useDocumentsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()

const showTemplatePicker = ref(false)
const showShareModal = ref(false)
const selectedDocument = ref<Document | null>(null)
const searchQuery = ref('')
const sortBy = ref<'updated' | 'created' | 'title'>('updated')

onMounted(() => {
  documentsStore.loadAllDocuments()
  uiStore.loadTags()
})

const filteredDocuments = computed(() => {
  let docs = [...documentsStore.documents]
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    docs = docs.filter((d: Document) => 
      d.title.toLowerCase().includes(query) ||
      d.blocks.some((b: Block) => b.content?.toLowerCase().includes(query))
    )
  }
  
  switch (sortBy.value) {
    case 'updated':
      docs.sort((a: Document, b: Document) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      break
    case 'created':
      docs.sort((a: Document, b: Document) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      break
    case 'title':
      docs.sort((a: Document, b: Document) => a.title.localeCompare(b.title, 'zh-CN'))
      break
  }
  
  return docs
})

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const openDocument = (doc: Document) => {
  router.push(`/document/${doc.id}`)
}

const createFromTemplate = (templateId: string) => {
  const template = uiStore.templates.find(t => t.id === templateId)
  if (template) {
    documentsStore.createDocument(template.name, template.blocks)
    showTemplatePicker.value = false
    router.push(`/document/${documentsStore.currentDocument?.id}`)
  }
}

const openShareModal = (doc: Document, e: Event) => {
  e.stopPropagation()
  selectedDocument.value = doc
  showShareModal.value = true
}

const deleteDocument = (doc: Document, e: Event) => {
  e.stopPropagation()
  if (confirm(`确定要删除文档"${doc.title}"吗？`)) {
    documentsStore.deleteDocument(doc.id)
  }
}

const getRoleBadge = (doc: Document) => {
  const role = doc.permissions?.find(p => p.userId === authStore.currentUser?.id)?.role || 'viewer'
  const roleMap: Record<string, { label: string; color: string }> = {
    owner: { label: '所有者', color: 'var(--primary-500)' },
    editor: { label: '可编辑', color: 'var(--success-500)' },
    commenter: { label: '可评论', color: 'var(--warning-500)' },
    viewer: { label: '只读', color: 'var(--text-secondary)' }
  }
  return roleMap[role]
}

const getDocumentPreview = (doc: Document): string => {
  const contentBlock = doc.blocks.find((b: Block) => b.content)
  if (!contentBlock?.content) return '暂无内容'
  return contentBlock.content.length > 100 
    ? contentBlock.content.slice(0, 100) + '...' 
    : contentBlock.content
}
</script>

<template>
  <div class="documents-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">所有文档</h1>
        <p class="page-subtitle">共 {{ filteredDocuments.length }} 个文档</p>
      </div>
      <button class="btn btn-primary" @click="showTemplatePicker = true">
        <span class="icon">+</span> 新建文档
      </button>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文档标题或内容..."
          class="search-input"
        />
      </div>
      <div class="sort-options">
        <label class="sort-label">排序：</label>
        <select v-model="sortBy" class="sort-select">
          <option value="updated">最近更新</option>
          <option value="created">创建时间</option>
          <option value="title">标题</option>
        </select>
      </div>
    </div>

    <div class="documents-grid" v-if="filteredDocuments.length > 0">
      <div
        v-for="doc in filteredDocuments"
        :key="doc.id"
        class="document-card"
        @click="openDocument(doc)"
      >
        <div class="card-header">
          <div class="doc-icon">📄</div>
          <div class="doc-actions">
            <button class="icon-btn" title="分享" @click="openShareModal(doc, $event)">
              🔗
            </button>
            <button class="icon-btn" title="删除" @click="deleteDocument(doc, $event)">
              🗑️
            </button>
          </div>
        </div>
        
        <h3 class="doc-title">{{ doc.title }}</h3>
        
        <div class="doc-preview">
          {{ getDocumentPreview(doc) }}
        </div>
        
        <div class="doc-tags" v-if="doc.tags.length > 0">
          <span
            v-for="tagId in doc.tags.slice(0, 3)"
            :key="tagId"
            class="tag"
            :style="{ 
              backgroundColor: uiStore.tags.find(t => t.id === tagId)?.color + '20', 
              color: uiStore.tags.find(t => t.id === tagId)?.color 
            }"
          >
            {{ uiStore.tags.find(t => t.id === tagId)?.name }}
          </span>
          <span v-if="doc.tags.length > 3" class="tag-more">
            +{{ doc.tags.length - 3 }}
          </span>
        </div>
        
        <div class="card-footer">
          <span
            class="role-badge"
            :style="{ color: getRoleBadge(doc).color }"
          >
            {{ getRoleBadge(doc).label }}
          </span>
          <span class="doc-date">{{ formatDate(doc.updatedAt) }}</span>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">📁</div>
      <h3>没有找到文档</h3>
      <p>{{ searchQuery ? '尝试使用其他关键词搜索' : '点击右上角创建你的第一份文档吧！' }}</p>
      <button 
        v-if="!searchQuery" 
        class="btn btn-primary" 
        @click="showTemplatePicker = true"
      >
        新建文档
      </button>
    </div>

    <TemplatePickerModal
      :show="showTemplatePicker"
      @close="showTemplatePicker = false"
      @select="createFromTemplate"
    />

    <ShareModal
      v-if="selectedDocument"
      :show="showShareModal"
      :document-id="selectedDocument.id"
      @close="showShareModal = false"
    />
  </div>
</template>

<style scoped>
.documents-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
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

.toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 300px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.875rem;
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.625rem 1rem 0.625rem 2.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.15s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-400) 20%, transparent);
}

.sort-options {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.sort-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.document-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.document-card:hover {
  border-color: var(--primary-400);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.doc-icon {
  font-size: 2rem;
}

.doc-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.document-card:hover .doc-actions {
  opacity: 1;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: background 0.15s ease;
}

.icon-btn:hover {
  background: var(--bg-tertiary);
}

.doc-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.doc-preview {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  margin-bottom: 0.75rem;
}

.doc-tags {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.tag {
  font-size: 0.7rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.tag-more {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  padding: 0.125rem 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.role-badge {
  font-size: 0.75rem;
  font-weight: 500;
}

.doc-date {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-state p {
  margin-bottom: 1.5rem;
}
</style>
