<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'
import TemplatePickerModal from '@/components/TemplatePickerModal.vue'
import type { Document, Tag, Block } from '@/types'

const documentsStore = useDocumentsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()

const showTemplatePicker = ref(false)
const selectedTag = ref<string | null>(null)

onMounted(() => {
  documentsStore.loadAllDocuments()
  uiStore.loadTags()
})

const filteredDocuments = computed(() => {
  let docs = documentsStore.documents
  if (selectedTag.value) {
    docs = docs.filter((d: Document) => d.tags.includes(selectedTag.value!))
  }
  return docs.sort((a: Document, b: Document) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
})

const stats = computed(() => {
  const docs = documentsStore.documents
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const todayEdits = docs.filter((d: Document) => new Date(d.updatedAt) >= today).length
  const weekEdits = docs.filter((d: Document) => new Date(d.updatedAt) >= weekAgo).length
  const activeDocs = docs.filter((d: Document) => new Date(d.updatedAt) >= weekAgo).length
  
  let pendingTodos = 0
  docs.forEach((doc: Document) => {
    doc.blocks.forEach((block: Block) => {
      if (block.type === 'todo' && !block.checked) {
        pendingTodos++
      }
    })
  })
  
  return { todayEdits, weekEdits, activeDocs, pendingTodos }
})

const recentDocuments = computed(() => filteredDocuments.value.slice(0, 5))

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
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

const selectTag = (tag: Tag | null) => {
  selectedTag.value = tag?.id || null
}

const getTagDocumentCount = (tagId: string): number => {
  return documentsStore.documents.filter((d: Document) => d.tags.includes(tagId)).length
}
</script>

<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">欢迎回来，{{ authStore.currentUser?.name }}</h1>
        <p class="page-subtitle">这里是你的文档工作台</p>
      </div>
      <button class="btn btn-primary" @click="showTemplatePicker = true">
        <span class="icon">+</span> 新建文档
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--primary-100); color: var(--primary-600);">
          ✏️
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.todayEdits }}</div>
          <div class="stat-label">今日编辑</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--success-100); color: var(--success-600);">
          📊
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.weekEdits }}</div>
          <div class="stat-label">本周编辑</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--warning-100); color: var(--warning-600);">
          📁
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeDocs }}</div>
          <div class="stat-label">活跃文档</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: var(--danger-100); color: var(--danger-600);">
          ✅
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pendingTodos }}</div>
          <div class="stat-label">待办未完成</div>
        </div>
      </div>
    </div>

    <div class="dashboard-content">
      <div class="main-content">
        <div class="section-header">
          <h2 class="section-title">最近文档</h2>
          <button class="btn btn-text" @click="router.push('/documents')">查看全部 →</button>
        </div>
        
        <div class="document-list">
          <div
            v-for="doc in recentDocuments"
            :key="doc.id"
            class="document-card"
            @click="openDocument(doc)"
          >
            <div class="doc-icon">📄</div>
            <div class="doc-info">
              <h3 class="doc-title">{{ doc.title }}</h3>
              <div class="doc-meta">
                <span>{{ formatDate(doc.updatedAt) }}</span>
                <span>·</span>
                <span>{{ doc.blocks.length }} 个块</span>
              </div>
              <div class="doc-tags" v-if="doc.tags.length > 0">
                <span
                  v-for="tagId in doc.tags"
                  :key="tagId"
                  class="tag"
                  :style="{ backgroundColor: uiStore.tags.find(t => t.id === tagId)?.color + '20', color: uiStore.tags.find(t => t.id === tagId)?.color }"
                >
                  {{ uiStore.tags.find(t => t.id === tagId)?.name }}
                </span>
              </div>
            </div>
            <div class="doc-arrow">→</div>
          </div>
          
          <div v-if="recentDocuments.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <p>还没有文档，点击右上角创建你的第一份文档吧！</p>
          </div>
        </div>
      </div>

      <div class="sidebar-content">
        <div class="section-header">
          <h2 class="section-title">标签筛选</h2>
        </div>
        <div class="tag-list">
          <button
            class="tag-item"
            :class="{ active: !selectedTag }"
            @click="selectTag(null)"
          >
            全部
          </button>
          <button
            v-for="tag in uiStore.tags"
            :key="tag.id"
            class="tag-item"
            :class="{ active: selectedTag === tag.id }"
            :style="{ '--tag-color': tag.color }"
            @click="selectTag(tag)"
          >
            <span class="tag-dot" :style="{ backgroundColor: tag.color }"></span>
            {{ tag.name }}
            <span class="tag-count">
              {{ getTagDocumentCount(tag.id) }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <TemplatePickerModal
      :show="showTemplatePicker"
      @close="showTemplatePicker = false"
      @select="createFromTemplate"
    />
  </div>
</template>

<style scoped>
.dashboard {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
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
  font-size: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.dashboard-content {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.document-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.document-card:hover {
  border-color: var(--primary-400);
  box-shadow: var(--shadow-sm);
}

.doc-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-meta {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.doc-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.doc-arrow {
  color: var(--text-tertiary);
  font-size: 1.25rem;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.sidebar-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  height: fit-content;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.875rem;
  width: 100%;
  text-align: left;
}

.tag-item:hover {
  background: var(--bg-tertiary);
}

.tag-item.active {
  background: color-mix(in srgb, var(--tag-color, var(--primary-500)) 10%, transparent);
  color: var(--tag-color, var(--primary-600));
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tag-count {
  margin-left: auto;
  font-size: 0.75rem;
  opacity: 0.7;
}

@media (max-width: 900px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
  
  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
