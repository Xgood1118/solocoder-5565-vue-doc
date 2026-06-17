<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import type { Block } from '@/types'

const props = defineProps<{
  block: Block
  editable?: boolean
}>()

const documentsStore = useDocumentsStore()
const showMenu = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

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
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    documentsStore.updateBlock(props.block.id, {
      url: result,
      filename: file.name,
      size: file.size
    })
  }
  reader.readAsDataURL(file)
}

const handlePaste = () => {
  navigator.clipboard.read().then(items => {
    for (const item of items) {
      if (item.types.some(type => type.startsWith('image/'))) {
        item.getType(item.types.find(t => t.startsWith('image/'))!).then(blob => {
          processFile(blob as File)
        })
        break
      }
    }
  }).catch(() => {
    alert('请先复制图片到剪贴板')
  })
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    processFile(file)
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}

const updateCaption = (e: Event) => {
  const target = e.target as HTMLElement
  documentsStore.updateBlock(props.block.id, {
    caption: target.innerText
  })
}

const updateAlt = (e: Event) => {
  const target = e.target as HTMLInputElement
  documentsStore.updateBlock(props.block.id, {
    alt: target.value
  })
}

const removeImage = () => {
  if (confirm('确定要移除图片吗？')) {
    documentsStore.updateBlock(props.block.id, {
      url: '',
      filename: '',
      alt: '',
      caption: ''
    })
  }
}
</script>

<template>
  <div class="image-block">
    <div 
      v-if="!block.url && editable"
      class="image-uploader"
      @click="handleFileSelect"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <div class="upload-icon">🖼️</div>
      <p class="upload-text">点击上传或拖拽图片到此处</p>
      <p class="upload-hint">支持 JPG、PNG、GIF 等格式</p>
      <div class="upload-actions">
        <button class="btn btn-secondary btn-sm" @click.stop="handleFileSelect">
          📁 选择文件
        </button>
        <button class="btn btn-secondary btn-sm" @click.stop="handlePaste">
          📋 粘贴图片
        </button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleFileChange"
      />
    </div>

    <div v-else-if="block.url" class="image-container">
      <img :src="block.url" :alt="block.alt || ''" />
      
      <div v-if="editable" class="image-menu">
        <button class="menu-btn" @click="showMenu = !showMenu">
          ⋮
        </button>
        
        <div v-if="showMenu" class="dropdown">
          <label class="menu-item">
            <span>Alt 文本：</span>
            <input
              type="text"
              :value="block.alt"
              placeholder="图片描述"
              @input="updateAlt"
              @click.stop
            />
          </label>
          <button class="menu-item danger" @click="removeImage">
            🗑️ 移除图片
          </button>
        </div>
      </div>
      
      <div 
        v-if="block.caption || editable"
        class="image-caption"
        :contenteditable="editable"
        @blur="updateCaption"
      >
        {{ block.caption || (editable ? '点击添加图片说明...' : '') }}
      </div>
    </div>

    <div 
      class="click-outside" 
      v-if="showMenu"
      @click="showMenu = false"
    ></div>
  </div>
</template>

<style scoped>
.image-block {
  position: relative;
  margin: 0.5rem 0;
}

.image-uploader {
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

.image-uploader:hover {
  border-color: var(--primary-400);
  background: var(--primary-50);
}

.upload-icon {
  font-size: 2.5rem;
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
  margin-bottom: 1rem;
}

.upload-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
}

.image-container {
  position: relative;
  text-align: center;
}

.image-container img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.image-menu {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.menu-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.image-container:hover .menu-btn {
  opacity: 1;
}

.dropdown {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 0.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  padding: 0.5rem;
  min-width: 200px;
  z-index: 100;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  width: 100%;
}

.menu-item label {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.menu-item input {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.8rem;
}

.menu-item:hover {
  background: var(--bg-tertiary);
}

.menu-item.danger {
  color: var(--danger-500);
}

.menu-item.danger:hover {
  background: var(--danger-50);
}

.image-caption {
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-style: italic;
  outline: none;
}

.image-caption:empty:before {
  content: attr(data-placeholder);
  color: var(--text-tertiary);
}

.click-outside {
  position: fixed;
  inset: 0;
  z-index: 99;
}
</style>
