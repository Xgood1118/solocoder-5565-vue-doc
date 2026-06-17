<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import {
  initCollaboration,
  leaveCollaboration,
  sendCursorPosition,
  sendSelection,
  sendBlockUpdate,
  sendBlocksReorder,
  sendBlockCreate,
  sendBlockDelete,
  setOnBlockUpdate,
  setOnBlocksReorder,
  setOnBlockCreate,
  setOnBlockDelete,
  setOnCollaboratorsChanged,
  getCollaborators
} from '@/utils/collab'
import type { Block, Collaborator, CursorPosition, Selection } from '@/types'
import BlockRenderer from './BlockRenderer.vue'
import CollaboratorCursors from './CollaboratorCursors.vue'
import CommentDrawer from './CommentDrawer.vue'
import VersionHistory from './VersionHistory.vue'
import EditorToolbar from './EditorToolbar.vue'

const props = defineProps<{
  documentId: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const documentsStore = useDocumentsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const editorRef = ref<HTMLElement | null>(null)
const collaborators = ref<Collaborator[]>([])
const showComments = ref(false)
const selectedCommentBlock = ref<Block | null>(null)
const showVersions = ref(false)
const isDragging = ref(false)
const dragOverIndex = ref(-1)
const draggedBlockId = ref<string | null>(null)

const currentDocument = computed(() => documentsStore.currentDocument)
const editorMode = computed(() => documentsStore.currentMode)
const saveState = computed(() => documentsStore.saveState)
const blocks = computed(() => currentDocument.value?.blocks || [])

const initCollab = () => {
  if (!authStore.currentUser || !currentDocument.value) return

  initCollaboration(authStore.currentUser, currentDocument.value.id)

  setOnBlockUpdate((blockId, block, fromTabId) => {
    const existingBlock = currentDocument.value?.blocks.find(b => b.id === blockId)
    if (existingBlock) {
      Object.assign(existingBlock, block, { updatedAt: Date.now() })
    }
  })

  setOnBlocksReorder((fromIndex, toIndex, fromTabId) => {
    if (!currentDocument.value) return
    const blocks = currentDocument.value.blocks
    const [moved] = blocks.splice(fromIndex, 1)
    blocks.splice(toIndex, 0, moved)
  })

  setOnBlockCreate((block, afterBlockId, fromTabId) => {
    if (!currentDocument.value) return
    if (afterBlockId === null) {
      currentDocument.value.blocks.unshift(block)
    } else {
      const index = currentDocument.value.blocks.findIndex(b => b.id === afterBlockId)
      currentDocument.value.blocks.splice(index + 1, 0, block)
    }
  })

  setOnBlockDelete((blockId, fromTabId) => {
    if (!currentDocument.value || currentDocument.value.blocks.length <= 1) return
    const index = currentDocument.value.blocks.findIndex(b => b.id === blockId)
    if (index > -1) {
      currentDocument.value.blocks.splice(index, 1)
    }
  })

  setOnCollaboratorsChanged((collabs) => {
    collaborators.value = collabs
  })

  setInterval(() => {
    collaborators.value = getCollaborators()
  }, 1000)
}

const loadDocument = async () => {
  await documentsStore.loadDocument(props.documentId)
  await nextTick()
  initCollab()
}

watch(() => props.documentId, () => {
  leaveCollaboration()
  loadDocument()
})

onMounted(() => {
  loadDocument()
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  leaveCollaboration()
  documentsStore.closeDocument()
  document.removeEventListener('keydown', handleGlobalKeydown)
})

const handleGlobalKeydown = (e: KeyboardEvent) => {
  const shortcut = uiStore.shortcuts.find(s => {
    const key = s.currentKey
    if (!key) return false
    
    let ctrl = false, shift = false, alt = false, meta = false
    let keyChar = key
    
    if (keyChar.includes('Ctrl+')) { ctrl = true; keyChar = keyChar.replace('Ctrl+', '') }
    if (keyChar.includes('Shift+')) { shift = true; keyChar = keyChar.replace('Shift+', '') }
    if (keyChar.includes('Alt+')) { alt = true; keyChar = keyChar.replace('Alt+', '') }
    if (keyChar.includes('Cmd+') || keyChar.includes('Win+')) { meta = true; keyChar = keyChar.replace('Cmd+', '').replace('Win+', '') }
    
    const ctrlMatch = ctrl === e.ctrlKey || meta === e.metaKey
    const shiftMatch = shift === e.shiftKey
    const altMatch = alt === e.altKey
    const keyMatch = e.key.toLowerCase() === keyChar.toLowerCase() ||
                    (keyChar === 'Escape' && e.key === 'Escape') ||
                    (keyChar === 'Enter' && e.key === 'Enter') ||
                    (keyChar === 'Backspace' && e.key === 'Backspace')
    
    return ctrlMatch && shiftMatch && altMatch && keyMatch
  })

  if (shortcut) {
    e.preventDefault()
    handleShortcutAction(shortcut.action)
  }
}

const handleShortcutAction = (action: string) => {
  switch (action) {
    case 'save':
      documentsStore.forceSave()
      break
    case 'undo':
      documentsStore.undo()
      break
    case 'redo':
      documentsStore.redo()
      break
    case 'toggle-mode':
      documentsStore.toggleEditorMode()
      break
    case 'search':
      uiStore.openModal('search')
      break
    case 'comment':
      if (uiStore.selectedBlockId) {
        const block = currentDocument.value?.blocks.find(b => b.id === uiStore.selectedBlockId)
        if (block) {
          openBlockComments(block)
        }
      }
      break
    case 'escape':
      showComments.value = false
      showVersions.value = false
      uiStore.closeAllModals()
      break
  }
}

const openBlockComments = (block: Block) => {
  selectedCommentBlock.value = block
  showComments.value = true
  showVersions.value = false
}

const closeComments = () => {
  showComments.value = false
  selectedCommentBlock.value = null
}

const toggleVersions = () => {
  showVersions.value = !showVersions.value
  if (showVersions.value) {
    showComments.value = false
  }
}

const toggleComments = () => {
  showComments.value = !showComments.value
  if (showComments.value) {
    showVersions.value = false
  }
}

const handleToolbarAddBlock = (type: Block['type']) => {
  handleAddBlock(blocks.value[blocks.value.length - 1]?.id || null, type)
}

const handleDragStart = (e: DragEvent, blockId: string) => {
  if (!authStore.canEdit) return
  isDragging.value = true
  draggedBlockId.value = blockId
  e.dataTransfer?.setData('text/plain', blockId)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

const handleDragEnd = () => {
  isDragging.value = false
  dragOverIndex.value = -1
  draggedBlockId.value = null
}

const handleDragOver = (e: DragEvent, index: number) => {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverIndex.value = index
}

const handleDrop = (e: DragEvent, toIndex: number) => {
  e.preventDefault()
  if (!authStore.canEdit || !draggedBlockId.value) return

  const fromIndex = blocks.value.findIndex(b => b.id === draggedBlockId.value)
  if (fromIndex === -1 || fromIndex === toIndex) return

  documentsStore.reorderBlocks(fromIndex, toIndex)
  sendBlocksReorder(fromIndex, toIndex)

  handleDragEnd()
}

const handleContentUpdate = (blockId: string, content: string) => {
  const block = blocks.value.find(b => b.id === blockId)
  if (block) {
    sendBlockUpdate(blockId, { content })
  }
}

const handleAddBlock = (afterBlockId: string | null, type: Block['type'] = 'paragraph') => {
  if (!authStore.canEdit) return
  const newBlock = documentsStore.addBlock(afterBlockId, type)
  if (newBlock) {
    sendBlockCreate(newBlock, afterBlockId)
  }
}

const handleRemoveBlock = (blockId: string) => {
  if (!authStore.canEdit) return
  documentsStore.removeBlock(blockId)
  sendBlockDelete(blockId)
}

const handleTitleChange = (e: Event) => {
  if (!authStore.canEdit) return
  const target = e.target as HTMLElement
  documentsStore.updateTitle(target.innerText)
}

const getCursorPosition = (): CursorPosition | null => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  const blockElement = range.startContainer.parentElement?.closest('[data-block-id]')
  if (!blockElement) return null

  const blockId = blockElement.getAttribute('data-block-id')
  if (!blockId) return null

  return {
    blockId,
    offset: range.startOffset
  }
}

const getSelectionRange = (): Selection | null => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const startBlock = selection.anchorNode?.parentElement?.closest('[data-block-id]')
  const endBlock = selection.focusNode?.parentElement?.closest('[data-block-id]')
  
  if (!startBlock || !endBlock) return null

  const startBlockId = startBlock.getAttribute('data-block-id')
  const endBlockId = endBlock.getAttribute('data-block-id')
  
  if (!startBlockId || !endBlockId) return null

  return {
    start: { blockId: startBlockId, offset: selection.anchorOffset },
    end: { blockId: endBlockId, offset: selection.focusOffset }
  }
}

const handleSelectionChange = () => {
  if (!authStore.currentUser) return

  const cursor = getCursorPosition()
  sendCursorPosition(cursor)

  const selection = getSelectionRange()
  sendSelection(selection)

  if (cursor) {
    uiStore.setSelectedBlock(cursor.blockId)
  }
}

document.addEventListener('selectionchange', handleSelectionChange)
</script>

<template>
  <div class="block-editor" ref="editorRef">
    <EditorToolbar
      :document="currentDocument"
      :save-state="saveState"
      :editor-mode="editorMode"
      :show-comments="showComments"
      :show-versions="showVersions"
      @back="emit('back')"
      @toggle-comments="toggleComments"
      @toggle-versions="toggleVersions"
      @add-block="handleToolbarAddBlock"
    />

    <div class="editor-main">
      <div class="editor-content-area">
        <div class="collaborators-bar">
          <div class="collaborators-list">
            <div
              v-for="collab in collaborators"
              :key="collab.tabId"
              class="collaborator-avatar"
              :title="collab.user.name"
              :style="{ borderColor: collab.user.color }"
            >
              <img :src="collab.user.avatar" :alt="collab.user.name" />
            </div>
            <div v-if="collaborators.length > 0" class="collaborators-count">
              {{ collaborators.length }} 人在线
            </div>
          </div>
        </div>

        <div class="document-title-wrapper">
          <h1
            class="document-title"
            :contenteditable="authStore.canEdit"
            @input="handleTitleChange"
            @blur="(e) => { if (!(e.target as HTMLElement).innerText.trim()) (e.target as HTMLElement).innerText = '未命名文档' }"
          >
            {{ currentDocument?.title || '未命名文档' }}
          </h1>
          <div class="document-meta">
            <span class="meta-item">
              创建于 {{ currentDocument ? new Date(currentDocument.createdAt).toLocaleDateString('zh-CN') : '-' }}
            </span>
            <span class="meta-item">
              更新于 {{ currentDocument ? new Date(currentDocument.updatedAt).toLocaleDateString('zh-CN') : '-' }}
            </span>
          </div>
        </div>

        <div class="blocks-container">
          <div
            v-for="(block, index) in blocks"
            :key="block.id"
            class="block-container"
            :class="{
              'drag-over': dragOverIndex === index,
              'dragging': isDragging && draggedBlockId === block.id
            }"
            :data-block-id="block.id"
            :draggable="authStore.canEdit"
            @dragstart="handleDragStart($event, block.id)"
            @dragend="handleDragEnd"
            @dragover="handleDragOver($event, index)"
            @drop="handleDrop($event, index)"
          >
            <BlockRenderer
              :block="block"
              :index="index"
              :editable="authStore.canEdit"
              :editor-mode="editorMode"
              @content-update="handleContentUpdate"
              @add-block="handleAddBlock"
              @remove-block="handleRemoveBlock"
              @add-comment="openBlockComments(block)"
            />
            
            <div
              v-if="block.comments && block.comments.filter(c => !c.resolved).length > 0"
              class="block-comment-badge"
              @click="openBlockComments(block)"
            >
              {{ block.comments.filter(c => !c.resolved).length }}
            </div>
          </div>

          <div
            v-if="authStore.canEdit"
            class="add-block-button"
            @click="handleAddBlock(blocks[blocks.length - 1]?.id || null)"
          >
            <span class="add-icon">+</span>
            <span>点击添加块</span>
          </div>
        </div>

        <CollaboratorCursors
          :collaborators="collaborators"
          :blocks="blocks"
        />
      </div>

      <CommentDrawer
        v-if="showComments"
        :block="selectedCommentBlock"
        :show="showComments"
        @close="closeComments"
      />

      <VersionHistory
        v-if="showVersions"
        :document-id="documentId"
        :versions="documentsStore.versions"
        :show="showVersions"
        @close="showVersions = false"
      />
    </div>
  </div>
</template>

<style scoped>
.block-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
}

.editor-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-content-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  position: relative;
}

.collaborators-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 8px 0;
  margin-bottom: 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
}

.collaborators-list {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collaborator-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid;
  overflow: hidden;
  background: var(--bg-primary);
}

.collaborator-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.collaborators-count {
  margin-left: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.document-title-wrapper {
  margin-bottom: 32px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.document-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  outline: none;
  line-height: 1.2;
}

.document-title[contenteditable="true"]:empty:before {
  content: "未命名文档";
  color: var(--text-tertiary);
}

.document-title[contenteditable="true"]:focus {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 4px;
}

.document-meta {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.blocks-container {
  max-width: 800px;
  margin: 0 auto;
}

.block-container {
  position: relative;
  transition: all 0.15s ease;
}

.block-container.drag-over {
  border-top: 3px solid var(--accent);
  padding-top: 8px;
}

.block-container.dragging {
  opacity: 0.5;
}

.block-comment-badge {
  position: absolute;
  right: -40px;
  top: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.block-comment-badge:hover {
  transform: scale(1.1);
}

.add-block-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  margin-top: 16px;
  border: 2px dashed var(--border);
  border-radius: 8px;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.add-block-button:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}

.add-icon {
  font-size: 1.2rem;
  font-weight: 600;
}

@media (max-width: 900px) {
  .editor-content-area {
    padding: 16px;
  }

  .document-title {
    font-size: 2rem;
  }

  .block-comment-badge {
    right: 8px;
    top: 8px;
  }
}
</style>
