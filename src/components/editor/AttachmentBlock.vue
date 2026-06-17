<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import type { Block } from '@/types'

const props = defineProps<{
  block: Block
  editable?: boolean
}>()

const documentsStore = useDocumentsStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const handleFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

const processFile = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    documentsStore.updateBlock(props.block.id, {
      attachmentData: result,
      attachmentName: file.name,
      attachmentSize: file.size
    })
  }
  reader.readAsDataURL(file)
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    processFile(file)
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const downloadFile = () => {
  if (!props.block.attachmentData) return
  
  const link = document.createElement('a')
  link.href = props.block.attachmentData
  link.download = props.block.attachmentName || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const formatSize = (bytes?: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const getFileIcon = (filename?: string) => {
  if (!filename) return '📄'
  const ext = filename.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    pdf: '📕',
    doc: '📘', docx: '📘',
    xls: '📗', xlsx: '📗',
    ppt: '📙', pptx: '📙',
    zip: '📦', rar: '📦', '7z': '📦',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
    mp3: '🎵', wav: '🎵',
    mp4: '🎬', avi: '🎬',
    js: '📜', ts: '📜', html: '📜', css: '📜',
    txt: '📝'
  }
  return iconMap[ext || ''] || '📄'
}

const removeAttachment = () => {
  if (confirm('确定要移除此附件吗？')) {
    documentsStore.updateBlock(props.block.id, {
      attachmentData: '',
      attachmentName: '',
      attachmentSize: 0
    })
  }
}
</script>

<template>
  <div class="attachment-block">
    <div
      v-if="!block.attachmentData && editable"
      class="attachment-uploader"
      :class="{ dragging: isDragging }"
      @click="handleFileSelect"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div class="upload-icon">📎</div>
      <p class="upload-text">点击或拖拽文件到此处添加附件</p>
      <p class="upload-hint">支持任意文件类型</p>
      <input
        ref="fileInputRef"
        type="file"
        style="display: none"
        @change="handleFileChange"
      />
    </div>

    <div v-else-if="block.attachmentData" class="attachment-card">
      <div class="file-icon">{{ getFileIcon(block.attachmentName) }}</div>
      
      <div class="file-info">
        <div class="file-name" :title="block.attachmentName">
          {{ block.attachmentName }}
        </div>
        <div class="file-meta">
          <span>{{ formatSize(block.attachmentSize) }}</span>
        </div>
      </div>
      
      <div class="file-actions">
        <button
          class="action-btn"
          title="下载"
          @click="downloadFile"
        >
          ⬇️ 下载
        </button>
        
        <button
          v-if="editable"
          class="action-btn danger"
          title="移除"
          @click="removeAttachment"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attachment-block {
  margin: 0.5rem 0;
}

.attachment-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.attachment-uploader:hover,
.attachment-uploader.dragging {
  border-color: var(--primary-400);
  background: var(--primary-50);
}

.upload-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.upload-text {
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.upload-hint {
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

.attachment-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.attachment-card:hover {
  border-color: var(--primary-300);
}

.file-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.25rem;
}

.file-meta {
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.file-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
  background: var(--primary-100);
  border: 1px solid var(--primary-200);
  border-radius: 6px;
  color: var(--primary-600);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--primary-200);
}

.action-btn.danger {
  background: var(--danger-50);
  border-color: var(--danger-200);
  color: var(--danger-600);
}

.action-btn.danger:hover {
  background: var(--danger-100);
}
</style>
