<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { getVersions } from '@/utils/idb'
import VersionDiffViewer from './VersionDiffViewer.vue'
import type { DocumentVersion } from '@/types'

const props = defineProps<{
  documentId: string
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const documentsStore = useDocumentsStore()
const versions = ref<DocumentVersion[]>([])
const selectedVersion = ref<DocumentVersion | null>(null)
const compareMode = ref(false)
const versionA = ref<DocumentVersion | null>(null)
const versionB = ref<DocumentVersion | null>(null)
const isLoading = ref(true)

const sortedVersions = computed(() => 
  [...versions.value].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
)

onMounted(async () => {
  if (props.show) {
    await loadVersions()
  }
})

const loadVersions = async () => {
  isLoading.value = true
  try {
    versions.value = await getVersions(props.documentId)
  } finally {
    isLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
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
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const previewVersion = (version: DocumentVersion) => {
  selectedVersion.value = version
}

const restoreVersion = async (versionId: string) => {
  if (confirm('确定要还原到此版本吗？当前内容会被覆盖。')) {
    await documentsStore.restoreVersion(versionId)
    emit('close')
  }
}

const selectForCompare = (version: DocumentVersion) => {
  if (!versionA.value) {
    versionA.value = version
  } else if (!versionB.value && version.id !== versionA.value.id) {
    versionB.value = version
  } else {
    versionA.value = version
    versionB.value = null
  }
}

const clearCompare = () => {
  versionA.value = null
  versionB.value = null
}

const getVersionNumber = (index: number) => {
  return sortedVersions.value.length - index
}
</script>

<template>
  <div class="version-history" v-if="show">
    <div class="version-sidebar">
      <div class="sidebar-header">
        <h3>版本历史</h3>
        <div class="header-actions">
          <button
            class="btn btn-text btn-sm"
            @click="compareMode = !compareMode"
            :class="{ active: compareMode }"
          >
            {{ compareMode ? '取消对比' : '对比版本' }}
          </button>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>
      </div>

      <div v-if="compareMode" class="compare-info">
        <p v-if="!versionA">点击选择第一个版本</p>
        <p v-else-if="!versionB">点击选择第二个版本</p>
        <p v-else>
          已选择 2 个版本进行对比
          <button class="btn-link" @click="clearCompare">清除</button>
        </p>
      </div>

      <div class="version-list" v-if="!isLoading">
        <div
          v-for="(version, index) in sortedVersions"
          :key="version.id"
          class="version-item"
          :class="{
            active: selectedVersion?.id === version.id,
            'compare-a': versionA?.id === version.id,
            'compare-b': versionB?.id === version.id
          }"
          @click="compareMode ? selectForCompare(version) : previewVersion(version)"
        >
          <div class="version-marker">
            <div class="marker-dot"></div>
            <div class="marker-line" v-if="index < sortedVersions.length - 1"></div>
          </div>
          
          <div class="version-info">
            <div class="version-header">
              <span class="version-number">v{{ getVersionNumber(index) }}</span>
              <span class="version-time">{{ formatDate(version.createdAt.toString()) }}</span>
            </div>
            <div class="version-message" v-if="version.message">
              {{ version.message }}
            </div>
          </div>

          <div class="version-actions" v-if="!compareMode && selectedVersion?.id === version.id">
            <button 
              class="btn btn-primary btn-sm"
              @click.stop="restoreVersion(version.id)"
            >
              还原
            </button>
          </div>
        </div>

        <div v-if="sortedVersions.length === 0" class="empty-state">
          <p>暂无版本历史</p>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>
    </div>

    <div class="version-content">
      <div v-if="compareMode && versionA && versionB">
        <VersionDiffViewer :version-a="versionA" :version-b="versionB" />
      </div>

      <div v-else-if="selectedVersion" class="version-preview">
        <div class="preview-header">
          <h4>版本预览</h4>
          <span class="preview-date">{{ formatDate(selectedVersion.createdAt.toString()) }}</span>
        </div>
        
        <div class="preview-blocks">
          <div
            v-for="(block, idx) in selectedVersion.blocks"
            :key="block.id"
            class="preview-block"
          >
            <template v-if="block.type === 'h1'">
              <h1>{{ block.content }}</h1>
            </template>
            <template v-else-if="block.type === 'h2'">
              <h2>{{ block.content }}</h2>
            </template>
            <template v-else-if="block.type === 'h3'">
              <h3>{{ block.content }}</h3>
            </template>
            <template v-else-if="block.type === 'paragraph'">
              <p>{{ block.content }}</p>
            </template>
            <template v-else-if="block.type === 'bulleted-list'">
              <ul>
                <li v-for="(item, i) in block.items" :key="i">{{ item }}</li>
              </ul>
            </template>
            <template v-else-if="block.type === 'numbered-list'">
              <ol>
                <li v-for="(item, i) in block.items" :key="i">{{ item }}</li>
              </ol>
            </template>
            <template v-else-if="block.type === 'quote'">
              <blockquote>{{ block.content }}</blockquote>
            </template>
            <template v-else-if="block.type === 'code'">
              <pre><code>{{ block.content }}</code></pre>
            </template>
            <template v-else-if="block.type === 'todo'">
              <div class="todo-item">
                <input type="checkbox" :checked="block.checked" disabled />
                <span :class="{ checked: block.checked }">{{ block.content }}</span>
              </div>
            </template>
            <template v-else-if="block.type === 'divider'">
              <hr />
            </template>
            <template v-else-if="block.type === 'image'">
              <img v-if="block.url" :src="block.url" :alt="block.alt || ''" />
            </template>
          </div>
        </div>

        <div class="preview-footer">
          <button 
            class="btn btn-primary"
            @click="restoreVersion(selectedVersion.id)"
          >
            还原到此版本
          </button>
        </div>
      </div>

      <div v-else class="empty-preview">
        <div class="empty-icon">📜</div>
        <p v-if="compareMode">选择两个版本进行对比</p>
        <p v-else>点击左侧版本查看详情</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.version-history {
  display: flex;
  height: 100%;
  background: var(--bg-primary);
}

.version-sidebar {
  width: 320px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.compare-info {
  padding: 0.75rem 1.25rem;
  background: var(--primary-50);
  border-bottom: 1px solid var(--border-color);
  font-size: 0.85rem;
  color: var(--primary-700);
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-600);
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
}

.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.version-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  transition: background 0.15s ease;
  position: relative;
}

.version-item:hover {
  background: var(--bg-tertiary);
}

.version-item.active {
  background: var(--primary-50);
}

.version-item.compare-a {
  background: var(--danger-50);
}

.version-item.compare-b {
  background: var(--success-50);
}

.version-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
}

.marker-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary-500);
  flex-shrink: 0;
}

.version-item.compare-a .marker-dot {
  background: var(--danger-500);
}

.version-item.compare-b .marker-dot {
  background: var(--success-500);
}

.marker-line {
  width: 2px;
  flex: 1;
  background: var(--border-color);
  margin-top: 4px;
}

.version-info {
  flex: 1;
  min-width: 0;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
}

.version-number {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.version-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.version-author {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.version-changes {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-actions {
  display: flex;
  align-items: center;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
}

.version-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.preview-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.preview-date {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.preview-blocks {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-block h1 {
  font-size: 1.75rem;
  color: var(--text-primary);
  margin: 0.5rem 0;
}

.preview-block h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0.5rem 0;
}

.preview-block h3 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0.5rem 0;
}

.preview-block p {
  color: var(--text-primary);
  line-height: 1.7;
  margin: 0.25rem 0;
}

.preview-block ul,
.preview-block ol {
  padding-left: 1.5rem;
  color: var(--text-primary);
  line-height: 1.7;
}

.preview-block blockquote {
  padding: 0.75rem 1rem;
  border-left: 4px solid var(--primary-400);
  background: var(--primary-50);
  color: var(--text-secondary);
  font-style: italic;
  margin: 0.5rem 0;
  border-radius: 0 6px 6px 0;
}

.preview-block pre {
  background: var(--bg-tertiary);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
}

.preview-block .todo-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-block .todo-item .checked {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.preview-block img {
  max-width: 100%;
  border-radius: 6px;
}

.preview-block hr {
  border: none;
  height: 1px;
  background: var(--border-color);
  margin: 1rem 0;
}

.preview-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-tertiary);
}

.btn-text.active {
  color: var(--primary-600);
  background: var(--primary-100);
}
</style>
