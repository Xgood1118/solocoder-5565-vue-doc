<script setup lang="ts">
import { onMounted } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { useUiStore } from '@/stores/ui'
import { useRouter } from 'vue-router'

const documentsStore = useDocumentsStore()
const uiStore = useUiStore()
const router = useRouter()

onMounted(() => {
  uiStore.loadTags()
})

const createFromTemplate = (templateId: string) => {
  const template = uiStore.templates.find(t => t.id === templateId)
  if (template) {
    documentsStore.createDocument(template.name, template.blocks)
    router.push(`/document/${documentsStore.currentDocument?.id}`)
  }
}
</script>

<template>
  <div class="templates-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">模板库</h1>
        <p class="page-subtitle">选择一个模板快速开始你的文档</p>
      </div>
    </div>

    <div class="templates-grid">
      <div
        v-for="template in uiStore.templates"
        :key="template.id"
        class="template-card"
        @click="createFromTemplate(template.id)"
      >
        <div class="template-icon">{{ template.icon }}</div>
        <h3 class="template-name">{{ template.name }}</h3>
        <p class="template-description">{{ template.description }}</p>
        <div class="template-meta">
          <span>{{ template.blocks.length }} 个预置块</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.templates-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
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

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.template-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  border-color: var(--primary-400);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.template-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.template-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.template-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 1rem;
  min-height: 42px;
}

.template-meta {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}
</style>
