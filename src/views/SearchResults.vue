<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useDocumentsStore } from '@/stores/documents'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const documentsStore = useDocumentsStore()

const searchQuery = ref(route.query.q as string || '')

onMounted(() => {
  documentsStore.loadAllDocuments()
  if (searchQuery.value) {
    uiStore.searchDocuments(searchQuery.value)
  }
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.replace({ query: { q: searchQuery.value } })
    uiStore.searchDocuments(searchQuery.value)
  }
}

const highlightedText = (text: string, query: string) => {
  if (!query) return text
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

const openDocument = (docId: string) => {
  router.push(`/document/${docId}`)
}

const getBlockTypeName = (blockType: string) => {
  const typeMap: Record<string, string> = {
    'h1': '标题',
    'h2': '标题',
    'h3': '标题',
    'h4': '标题',
    'h5': '标题',
    'h6': '标题',
    'paragraph': '段落',
    'bulleted-list': '无序列表',
    'numbered-list': '有序列表',
    'quote': '引用',
    'code': '代码块',
    'image': '图片',
    'table': '表格',
    'todo': '待办',
    'attachment': '附件',
    'divider': '分割线'
  }
  return typeMap[blockType] || blockType
}
</script>

<template>
  <div class="search-page">
    <div class="page-header">
      <h1 class="page-title">搜索结果</h1>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文档..."
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <button class="btn btn-primary" @click="handleSearch">搜索</button>
      </div>
    </div>

    <div v-if="uiStore.searchResults.length > 0" class="results-info">
      找到 {{ uiStore.searchResults.length }} 个匹配结果
    </div>

    <div class="results-list">
      <div
        v-for="result in uiStore.searchResults"
        :key="result.documentId"
        class="result-card"
        @click="openDocument(result.documentId)"
      >
        <h3 class="result-title">
          <span v-html="highlightedText(result.documentTitle, searchQuery)"></span>
        </h3>
        <p 
          class="result-snippet"
          v-html="highlightedText(result.snippet, searchQuery)"
        ></p>
        <div class="result-meta">
          <span class="result-block-type">
            {{ getBlockTypeName(result.blockType) }}
          </span>
          <span>·</span>
          <span>1 处匹配</span>
        </div>
      </div>
    </div>

    <div v-if="searchQuery && uiStore.searchResults.length === 0" class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>没有找到匹配的结果</h3>
      <p>尝试使用其他关键词搜索</p>
    </div>

    <div v-if="!searchQuery" class="empty-state">
      <div class="empty-icon">⌨️</div>
      <h3>输入关键词开始搜索</h3>
      <p>支持跨文档全文搜索</p>
    </div>
  </div>
</template>

<style scoped>
.search-page {
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
  margin-bottom: 1rem;
}

.search-box {
  display: flex;
  gap: 0.75rem;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  transition: all 0.15s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-400);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-400) 20%, transparent);
}

.results-info {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-card:hover {
  border-color: var(--primary-400);
  box-shadow: var(--shadow-sm);
}

.result-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.result-snippet {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.result-snippet :deep(mark) {
  background: var(--warning-200);
  color: var(--warning-800);
  padding: 0 2px;
  border-radius: 2px;
}

.result-title :deep(mark) {
  background: var(--warning-200);
  color: var(--warning-800);
  padding: 0 2px;
  border-radius: 2px;
}

.result-meta {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  display: flex;
  gap: 0.5rem;
}

.result-block-type {
  color: var(--primary-500);
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
