<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { exportMarkdown, exportHtml, exportPdf, exportDocx, importMarkdown } from '@/utils/export'
import type { EditorMode, BlockType, Document, SaveState, Block } from '@/types'

const props = defineProps<{
  document: Document | null
  saveState: SaveState
  editorMode: EditorMode
  showComments: boolean
  showVersions: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'toggle-comments'): void
  (e: 'toggle-versions'): void
  (e: 'add-block', type: BlockType): void
}>()

const documentsStore = useDocumentsStore()
const uiStore = useUiStore()
const authStore = useAuthStore()

const showBlockMenu = ref(false)
const showExportMenu = ref(false)
const localEditorMode = ref<EditorMode>(props.editorMode)

watch(() => props.editorMode, (newMode) => {
  localEditorMode.value = newMode
})

const saveState = computed(() => props.saveState)
const canEdit = computed(() => {
  const role = props.document?.permissions?.find(
    p => p.userId === authStore.currentUser?.id
  )?.role
  return role === 'owner' || role === 'editor'
})

const blockTypes: { type: BlockType; label: string; icon: string }[] = [
  { type: 'h1', label: '一级标题', icon: 'H1' },
  { type: 'h2', label: '二级标题', icon: 'H2' },
  { type: 'h3', label: '三级标题', icon: 'H3' },
  { type: 'paragraph', label: '段落', icon: '¶' },
  { type: 'bulleted-list', label: '无序列表', icon: '•' },
  { type: 'numbered-list', label: '有序列表', icon: '1.' },
  { type: 'todo', label: '待办清单', icon: '☑' },
  { type: 'quote', label: '引用块', icon: '"' },
  { type: 'code', label: '代码块', icon: '</>' },
  { type: 'table', label: '表格', icon: '▦' },
  { type: 'image', label: '图片', icon: '🖼' },
  { type: 'attachment', label: '附件', icon: '📎' },
  { type: 'divider', label: '分割线', icon: '—' },
]

const toggleMode = () => {
  localEditorMode.value = localEditorMode.value === 'richtext' ? 'markdown' : 'richtext'
  documentsStore.toggleEditorMode()
}

const addBlock = (type: BlockType) => {
  emit('add-block', type)
  showBlockMenu.value = false
}

const handleExport = async (format: 'markdown' | 'html' | 'pdf' | 'docx') => {
  if (!documentsStore.currentDocument) return
  
  try {
    const { blocks, title } = documentsStore.currentDocument
    switch (format) {
      case 'markdown':
        await exportMarkdown(blocks, title)
        break
      case 'html':
        await exportHtml(blocks, title)
        break
      case 'pdf':
        await exportPdf(blocks, title)
        break
      case 'docx':
        await exportDocx(blocks, title)
        break
    }
  } catch (e) {
    console.error('Export failed:', e)
  }
  showExportMenu.value = false
}

const handleImport = async () => {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (event) => {
        const content = event.target?.result as string
        const blocks = await importMarkdown(content)
        if (blocks.length > 0) {
          documentsStore.createDocument(file.name.replace('.md', ''), blocks)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  } catch (e) {
    console.error('Import failed:', e)
  }
}

const handleSave = () => {
  documentsStore.save()
}

const handleUndo = () => {
  documentsStore.undo()
}

const handleRedo = () => {
  documentsStore.redo()
}

const formatText = (command: string) => {
  document.execCommand(command, false)
}
</script>

<template>
  <div class="editor-toolbar">
    <div class="toolbar-left">
      <button class="tool-btn back-btn" @click="emit('back')" title="返回">
        ←
      </button>
      <div class="save-status">
        <span 
          class="status-dot"
          :class="{
            'saving': saveState.status === 'saving',
            'saved': saveState.status === 'saved',
            'error': saveState.status === 'error'
          }"
        ></span>
        <span class="status-text">
          {{ saveState.status === 'saving' ? '保存中...' : 
             saveState.status === 'saved' ? '已保存' : 
             saveState.status === 'error' ? '保存失败' : '未保存' }}
        </span>
      </div>
    </div>

    <div class="toolbar-center" v-if="canEdit">
      <div class="formatting-group">
        <button class="tool-btn" title="加粗" @click="formatText('bold')">
          <strong>B</strong>
        </button>
        <button class="tool-btn" title="斜体" @click="formatText('italic')">
          <em>I</em>
        </button>
        <button class="tool-btn" title="下划线" @click="formatText('underline')">
          <u>U</u>
        </button>
        <button class="tool-btn" title="删除线" @click="formatText('strikeThrough')">
          <s>S</s>
        </button>
      </div>

      <div class="divider"></div>

      <div class="formatting-group">
        <button class="tool-btn" title="撤销" @click="handleUndo">
          ↶
        </button>
        <button class="tool-btn" title="重做" @click="handleRedo">
          ↷
        </button>
      </div>

      <div class="divider"></div>

      <div class="block-menu-wrapper">
        <button class="tool-btn block-btn" @click="showBlockMenu = !showBlockMenu">
          <span class="icon">+</span>
          <span>插入块</span>
          <span class="arrow">▼</span>
        </button>
        
        <div v-if="showBlockMenu" class="block-menu dropdown">
          <div class="menu-grid">
            <button
              v-for="block in blockTypes"
              :key="block.type"
              class="menu-item"
              @click="addBlock(block.type)"
            >
              <span class="item-icon">{{ block.icon }}</span>
              <span class="item-label">{{ block.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <button 
        class="tool-btn mode-toggle" 
        @click="toggleMode"
        :title="localEditorMode === 'richtext' ? '切换到 Markdown 模式' : '切换到富文本模式'"
      >
        {{ localEditorMode === 'richtext' ? '📝 富文本' : '📄 Markdown' }}
      </button>
    </div>

    <div class="toolbar-right">
      <button 
        class="tool-btn" 
        :class="{ active: showComments }"
        @click="emit('toggle-comments')" 
        title="评论"
      >
        💬 评论
      </button>
      <button 
        class="tool-btn" 
        :class="{ active: showVersions }"
        @click="emit('toggle-versions')" 
        title="版本历史"
      >
        📜 版本
      </button>
      <div class="export-menu-wrapper">
        <button class="tool-btn export-btn" @click="showExportMenu = !showExportMenu">
          <span>导出</span>
          <span class="arrow">▼</span>
        </button>
        
        <div v-if="showExportMenu" class="export-menu dropdown">
          <button class="menu-item" @click="handleExport('markdown')">
            📄 Markdown (.md)
          </button>
          <button class="menu-item" @click="handleExport('html')">
            🌐 HTML (.html)
          </button>
          <button class="menu-item" @click="handleExport('pdf')">
            📑 PDF (.pdf)
          </button>
          <button class="menu-item" @click="handleExport('docx')">
            📘 Word (.docx)
          </button>
          <div class="menu-divider"></div>
          <button class="menu-item" @click="handleImport">
            📥 导入 Markdown
          </button>
        </div>
      </div>

      <button class="btn btn-primary btn-sm" @click="handleSave" v-if="canEdit">
        💾 保存
      </button>
    </div>

    <div 
      class="click-outside" 
      v-if="showBlockMenu || showExportMenu"
      @click="showBlockMenu = false; showExportMenu = false"
    ></div>
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  transition: all 0.2s ease;
}

.status-dot.saving {
  background: var(--warning-500);
  animation: pulse 1s ease-in-out infinite;
}

.status-dot.saved {
  background: var(--success-500);
}

.status-dot.error {
  background: var(--danger-500);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  color: var(--text-secondary);
}

.formatting-group {
  display: flex;
  gap: 0.125rem;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.tool-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color);
}

.tool-btn:active {
  transform: scale(0.98);
}

.tool-btn strong {
  font-weight: 700;
}

.tool-btn em {
  font-style: italic;
}

.tool-btn u {
  text-decoration: underline;
}

.tool-btn s {
  text-decoration: line-through;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 0.25rem;
}

.arrow {
  font-size: 0.7rem;
  opacity: 0.7;
}

.block-menu-wrapper,
.export-menu-wrapper {
  position: relative;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 180px;
  padding: 0.5rem;
  animation: slideDown 0.15s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.25rem;
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
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}

.menu-item:hover {
  background: var(--bg-tertiary);
}

.item-icon {
  width: 20px;
  text-align: center;
  font-weight: 600;
  opacity: 0.8;
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem -0.5rem;
}

.export-menu .menu-item {
  display: block;
}

.click-outside {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .toolbar-left .status-text {
    display: none;
  }
  
  .formatting-group {
    display: none;
  }
  
  .block-btn span:not(.icon):not(.arrow),
  .export-btn span:not(.arrow) {
    display: none;
  }
}
</style>
