<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { storeToRefs } from 'pinia'

const uiStore = useUiStore()
const router = useRouter()
const { searchResults, isSearching, searchQuery } = storeToRefs(uiStore)

const inputRef = ref<HTMLInputElement | null>(null)
const localQuery = ref('')

watch(() => uiStore.modals.search, async (open) => {
  if (open) {
    await nextTick()
    inputRef.value?.focus()
    localQuery.value = searchQuery.value
  }
})

async function handleSearch() {
  await uiStore.searchDocuments(localQuery.value)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleSearch()
  }
}

function goToResult(result: typeof searchResults.value[0]) {
  uiStore.closeModal('search')
  router.push({
    path: `/documents/${result.documentId}`,
    hash: `#${result.blockId}`
  })
}

function highlightSnippet(snippet: string, query: string): string {
  if (!query) return snippet
  const regex = new RegExp(`(${query})`, 'gi')
  return snippet.replace(regex, '<mark>$1</mark>')
}
</script>

<template>
  <div class="modal-overlay" @click.self="uiStore.closeModal('search')">
    <div class="search-modal animate-slide-up">
      <div class="search-header">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            ref="inputRef"
            v-model="localQuery"
            type="text"
            class="search-input"
            placeholder="搜索文档内容..."
            @input="handleSearch"
            @keydown="handleKeydown"
          />
          <button v-if="localQuery" class="clear-btn" @click="localQuery = ''; uiStore.clearSearch()">✕</button>
        </div>
        <div class="search-tips">
          <span>按 Enter 搜索</span>
          <span>按 Esc 关闭</span>
        </div>
      </div>
      <div class="search-results">
        <div v-if="isSearching" class="search-loading">
          <span class="loading-spinner">⏳</span>
          搜索中...
        </div>
        <div v-else-if="!localQuery" class="search-empty">
          <span class="empty-icon">📝</span>
          <p>输入关键词搜索所有文档</p>
        </div>
        <div v-else-if="searchResults.length === 0" class="search-empty">
          <span class="empty-icon">🔍</span>
          <p>没有找到匹配的结果</p>
          <p class="empty-desc">尝试其他关键词</p>
        </div>
        <div v-else class="results-list">
          <div class="results-count">
            找到 {{ searchResults.length }} 个匹配结果
          </div>
          <button
            v-for="(result, index) in searchResults"
            :key="`${result.documentId}-${result.blockId}-${index}`"
            class="result-item"
            @click="goToResult(result)"
          >
            <div class="result-doc">
              <span class="doc-icon">📄</span>
              <span class="doc-title">{{ result.documentTitle }}</span>
            </div>
            <div
              class="result-snippet"
              v-html="highlightSnippet(result.snippet, localQuery)"
            />
            <div class="result-type">
              <span class="type-badge">{{ {
                'h1': '一级标题', 'h2': '二级标题', 'h3': '三级标题', 'h4': '四级标题', 'h5': '五级标题', 'h6': '六级标题',
                'paragraph': '正文', 'bulleted-list': '无序列表', 'numbered-list': '有序列表',
                'quote': '引用', 'code': '代码', 'table': '表格', 'todo': '待办',
                'image': '图片', 'attachment': '附件', 'divider': '分割线'
              }[result.blockType] || result.blockType }}</span>
            </div>
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
  justify-content: center;
  padding-top: 10vh;
  z-index: 1000;
}

.search-modal {
  width: 100%;
  max-width: 640px;
  background-color: var(--bg-primary);
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.search-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 2px solid var(--border);
  border-radius: 8px;
  transition: border-color 0.2s;
}

.search-input-wrap:focus-within {
  border-color: var(--accent);
}

.search-icon {
  font-size: 16px;
  color: var(--text-muted);
}

.search-input {
  flex: 1;
  border: none;
  background: none;
  font-size: 16px;
  padding: 0;
  outline: none;
}

.clear-btn {
  color: var(--text-muted);
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
}

.clear-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.search-tips {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  font-size: 11px;
  color: var(--text-muted);
}

.search-results {
  max-height: 50vh;
  overflow-y: auto;
  padding: 8px 0;
}

.search-loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-empty {
  padding: 60px 20px;
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

.results-count {
  padding: 8px 20px;
  font-size: 12px;
  color: var(--text-muted);
}

.result-item {
  width: 100%;
  display: block;
  text-align: left;
  padding: 12px 20px;
  border-left: 3px solid transparent;
  transition: background-color 0.15s, border-color 0.15s;
}

.result-item:hover {
  background-color: var(--bg-secondary);
  border-left-color: var(--accent);
}

.result-doc {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.doc-icon {
  font-size: 14px;
}

.doc-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.result-snippet {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 6px;
  word-break: break-all;
}

.result-snippet :deep(mark) {
  background-color: var(--warning) + '40';
  color: var(--text-primary);
  padding: 0 2px;
  border-radius: 2px;
}

.result-type {
  display: flex;
  gap: 6px;
}

.type-badge {
  font-size: 10px;
  padding: 2px 6px;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 3px;
}
</style>
