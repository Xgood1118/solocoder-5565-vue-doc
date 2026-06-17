<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'

const uiStore = useUiStore()
const documentsStore = useDocumentsStore()
const authStore = useAuthStore()
const router = useRouter()

const { templates } = storeToRefs(uiStore)
const { currentUser } = storeToRefs(authStore)

async function selectTemplate(templateId: string) {
  const template = uiStore.getTemplateById(templateId)
  if (!template) return
  const blocks = JSON.parse(JSON.stringify(template.blocks))
  const title = template.id === 'blank' ? '未命名文档' : `${template.name}`
  const doc = await documentsStore.createDocument(
    title,
    blocks,
    [],
    currentUser.value?.id || 'user-1'
  )
  uiStore.closeModal('templatePicker')
  router.push(`/documents/${doc.id}`)
}
</script>

<template>
  <div class="modal-overlay" @click.self="uiStore.closeModal('templatePicker')">
    <div class="template-modal animate-slide-up">
      <div class="modal-header">
        <h2 class="modal-title">选择模板</h2>
        <button class="close-btn" @click="uiStore.closeModal('templatePicker')">✕</button>
      </div>
      <div class="modal-body">
        <div class="templates-grid">
          <button
            v-for="template in templates"
            :key="template.id"
            class="template-card"
            @click="selectTemplate(template.id)"
          >
            <div class="template-icon">{{ template.icon }}</div>
            <div class="template-info">
              <div class="template-name">{{ template.name }}</div>
              <div class="template-desc">{{ template.description }}</div>
            </div>
            <div class="template-arrow">→</div>
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
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.template-modal {
  width: 100%;
  max-width: 800px;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.template-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background-color: var(--bg-primary);
  transition: all 0.2s;
  text-align: left;
  position: relative;
}

.template-card:hover {
  border-color: var(--accent);
  background-color: var(--accent) + '08';
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.template-icon {
  font-size: 32px;
}

.template-info {
  flex: 1;
}

.template-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.template-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

.template-arrow {
  position: absolute;
  top: 20px;
  right: 20px;
  color: var(--text-muted);
  transition: transform 0.2s;
}

.template-card:hover .template-arrow {
  transform: translateX(4px);
  color: var(--accent);
}
</style>
