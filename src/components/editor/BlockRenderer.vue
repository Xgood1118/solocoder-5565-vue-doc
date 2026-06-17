<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import type { Block } from '@/types'
import CodeBlock from './CodeBlock.vue'
import TableBlock from './TableBlock.vue'
import ImageBlock from './ImageBlock.vue'
import TodoBlock from './TodoBlock.vue'
import AttachmentBlock from './AttachmentBlock.vue'
import BlockMenu from './BlockMenu.vue'

const props = defineProps<{
  block: Block
  index: number
  editable?: boolean
  editorMode?: 'richtext' | 'markdown'
}>()

const emit = defineEmits<{
  contentUpdate: [blockId: string, content: string]
  addBlock: [afterBlockId: string | null, type?: Block['type']]
  removeBlock: [blockId: string]
  addComment: [blockId: string]
}>()

const documentsStore = useDocumentsStore()
const contentRef = ref<HTMLElement | null>(null)
const showBlockMenu = ref(false)
const blockMenuPosition = ref({ x: 0, y: 0 })
const isDragging = ref(false)

const markdownContent = computed(() => {
  if (props.block.type === 'code') {
    return `\`\`\`${props.block.language || ''}\n${props.block.content}\n\`\`\``
  }
  if (props.block.type === 'h1') return `# ${props.block.content}`
  if (props.block.type === 'h2') return `## ${props.block.content}`
  if (props.block.type === 'h3') return `### ${props.block.content}`
  if (props.block.type === 'h4') return `#### ${props.block.content}`
  if (props.block.type === 'h5') return `##### ${props.block.content}`
  if (props.block.type === 'h6') return `###### ${props.block.content}`
  if (props.block.type === 'quote') return `> ${props.block.content}`
  if (props.block.type === 'todo') return `- [${props.block.checked ? 'x' : ' '}] ${props.block.content}`
  if (props.block.type === 'bulleted-list') {
    const items = props.block.content.split('\n').filter(i => i.trim())
    return items.map(item => `- ${item.replace(/^- /, '')}`).join('\n')
  }
  if (props.block.type === 'numbered-list') {
    const items = props.block.content.split('\n').filter(i => i.trim())
    return items.map((item, i) => `${i + 1}. ${item.replace(/^\d+\. /, '')}`).join('\n')
  }
  if (props.block.type === 'divider') return '---'
  if (props.block.type === 'image') {
    const name = props.block.imageName || 'image'
    return `![${name}](${props.block.imageData ? '(embedded image)' : 'image'})`
  }
  if (props.block.type === 'attachment') {
    const name = props.block.attachmentName || 'file'
    return `[${name}](attachment)`
  }
  return props.block.content || ''
})

const listItems = computed(() => {
  if (props.block.type !== 'bulleted-list' && props.block.type !== 'numbered-list') {
    return []
  }
  return props.block.content.split('\n').filter(i => i.trim()).map(item => {
    if (props.block.type === 'bulleted-list') {
      return item.replace(/^- /, '')
    }
    return item.replace(/^\d+\. /, '')
  })
})

const handleContentInput = (e: Event) => {
  if (!props.editable) return
  const target = e.target as HTMLElement
  const content = target.innerText
  documentsStore.updateBlock(props.block.id, { content })
  emit('contentUpdate', props.block.id, content)
}

const handleListInput = (e: Event, itemIndex: number) => {
  if (!props.editable) return
  const target = e.target as HTMLElement
  const items = [...listItems.value]
  items[itemIndex] = target.innerText
  
  let newContent = ''
  if (props.block.type === 'bulleted-list') {
    newContent = items.map(item => `- ${item}`).join('\n')
  } else {
    newContent = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
  }
  
  documentsStore.updateBlock(props.block.id, { content: newContent })
  emit('contentUpdate', props.block.id, newContent)
}

const addListItem = () => {
  if (!props.editable) return
  const items = [...listItems.value, '']
  let newContent = ''
  if (props.block.type === 'bulleted-list') {
    newContent = items.map(item => `- ${item}`).join('\n')
  } else {
    newContent = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
  }
  documentsStore.updateBlock(props.block.id, { content: newContent })
}

const removeListItem = (index: number) => {
  if (!props.editable || listItems.value.length <= 1) return
  const items = listItems.value.filter((_, i) => i !== index)
  let newContent = ''
  if (props.block.type === 'bulleted-list') {
    newContent = items.map(item => `- ${item}`).join('\n')
  } else {
    newContent = items.map((item, i) => `${i + 1}. ${item}`).join('\n')
  }
  documentsStore.updateBlock(props.block.id, { content: newContent })
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.editable) return
  
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    const nextType = props.block.type === 'paragraph' ? 'paragraph' : props.block.type
    emit('addBlock', props.block.id, nextType)
  }
  
  if (e.key === 'Backspace' && !props.block.content && props.block.type === 'paragraph') {
    e.preventDefault()
    if (props.index > 0) {
      emit('removeBlock', props.block.id)
    }
  }
}

const openBlockMenu = (e: MouseEvent) => {
  if (!props.editable) return
  e.stopPropagation()
  blockMenuPosition.value = { x: e.clientX, y: e.clientY }
  showBlockMenu.value = true
}

const handleDragStart = (e: DragEvent) => {
  if (!props.editable) return
  isDragging.value = true
  e.dataTransfer?.setData('text/plain', props.block.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

const handleDragEnd = () => {
  isDragging.value = false
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const draggedId = e.dataTransfer?.getData('text/plain')
  if (draggedId && draggedId !== props.block.id) {
    const fromIndex = documentsStore.currentDocument?.blocks.findIndex(b => b.id === draggedId) ?? -1
    if (fromIndex > -1) {
      documentsStore.reorderBlocks(fromIndex, props.index)
    }
  }
}

const handleTodoUpdate = (content: string) => {
  documentsStore.updateBlock(props.block.id, { content })
  emit('contentUpdate', props.block.id, content)
}

const handleTodoToggle = (checked: boolean) => {
  documentsStore.updateBlock(props.block.id, { checked })
}

const handleCodeUpdate = (content: string) => {
  documentsStore.updateBlock(props.block.id, { content })
  emit('contentUpdate', props.block.id, content)
}

const handleAddComment = () => {
  emit('addComment', props.block.id)
}
</script>

<template>
  <div
    class="block-wrapper"
    :class="[
      `block-type-${block.type}`,
      { dragging: isDragging }
    ]"
    :draggable="editable"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <div class="block-handle" v-if="editable">
      <button
        class="drag-handle"
        title="拖拽排序"
        @mousedown="(e) => e.stopPropagation()"
      >
        ⋮⋮
      </button>
      
      <button
        class="menu-handle"
        title="块操作"
        @click="openBlockMenu"
      >
        ⋯
      </button>
    </div>

    <div class="block-content-wrapper">
      <template v-if="editorMode === 'markdown'">
        <div
          v-if="block.type !== 'table' && block.type !== 'image' && block.type !== 'attachment'"
          class="markdown-block"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ markdownContent }}
        </div>
        <TableBlock v-else-if="block.type === 'table'" :block="block" :editable="editable" />
        <ImageBlock v-else-if="block.type === 'image'" :block="block" :editable="editable" />
        <AttachmentBlock v-else-if="block.type === 'attachment'" :block="block" :editable="editable" />
      </template>

      <template v-else>
        <h1
          v-if="block.type === 'h1'"
          class="block-heading block-h1"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ block.content }}
        </h1>

        <h2
          v-else-if="block.type === 'h2'"
          class="block-heading block-h2"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ block.content }}
        </h2>

        <h3
          v-else-if="block.type === 'h3'"
          class="block-heading block-h3"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ block.content }}
        </h3>

        <h4
          v-else-if="block.type === 'h4'"
          class="block-heading block-h4"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ block.content }}
        </h4>

        <h5
          v-else-if="block.type === 'h5'"
          class="block-heading block-h5"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ block.content }}
        </h5>

        <h6
          v-else-if="block.type === 'h6'"
          class="block-heading block-h6"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ block.content }}
        </h6>

        <p
          v-else-if="block.type === 'paragraph'"
          class="block-paragraph"
          ref="contentRef"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ block.content }}
        </p>

        <ul
          v-else-if="block.type === 'bulleted-list'"
          class="block-list block-bullet-list"
        >
          <li
            v-for="(item, idx) in listItems"
            :key="idx"
            :contenteditable="editable"
            @input="handleListInput($event, idx)"
            @keydown="(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !item.trim()) {
                e.preventDefault()
                addListItem()
              }
            }"
          >
            {{ item }}
          </li>
          <button
            v-if="editable"
            class="add-item-btn"
            @click="addListItem"
          >
            + 添加项目
          </button>
        </ul>

        <ol
          v-else-if="block.type === 'numbered-list'"
          class="block-list block-numbered-list"
        >
          <li
            v-for="(item, idx) in listItems"
            :key="idx"
            :contenteditable="editable"
            @input="handleListInput($event, idx)"
            @keydown="(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !item.trim()) {
                e.preventDefault()
                addListItem()
              }
            }"
          >
            {{ item }}
          </li>
          <button
            v-if="editable"
            class="add-item-btn"
            @click="addListItem"
          >
            + 添加项目
          </button>
        </ol>

        <blockquote
          v-else-if="block.type === 'quote'"
          class="block-quote"
          :contenteditable="editable"
          @input="handleContentInput"
          @keydown="handleKeydown"
        >
          {{ block.content }}
        </blockquote>

        <CodeBlock
          v-else-if="block.type === 'code'"
          :block="block"
          :editable="editable"
          @update="handleCodeUpdate"
        />

        <TableBlock
          v-else-if="block.type === 'table'"
          :block="block"
          :editable="editable"
        />

        <ImageBlock
          v-else-if="block.type === 'image'"
          :block="block"
          :editable="editable"
        />

        <TodoBlock
          v-else-if="block.type === 'todo'"
          :block="block"
          :editable="editable"
          @update="handleTodoUpdate"
          @toggle="handleTodoToggle"
        />

        <AttachmentBlock
          v-else-if="block.type === 'attachment'"
          :block="block"
          :editable="editable"
        />

        <hr v-else-if="block.type === 'divider'" class="block-divider" />
      </template>
    </div>

    <button
      v-if="editable && block.comments && block.comments.filter(c => !c.resolved).length > 0"
      class="comment-indicator"
      @click="handleAddComment"
      title="查看评论"
    >
      💬 {{ block.comments.filter(c => !c.resolved).length }}
    </button>

    <BlockMenu
      :block="block"
      :show="showBlockMenu"
      :position="blockMenuPosition"
      @close="showBlockMenu = false"
      @add-comment="handleAddComment"
    />
  </div>
</template>

<style scoped>
.block-wrapper {
  display: flex;
  gap: 0.5rem;
  margin: 0.25rem 0;
  padding: 0.25rem 0;
  position: relative;
  transition: background 0.15s ease;
}

.block-wrapper:hover {
  background: color-mix(in srgb, var(--accent) 3%, transparent);
  border-radius: 6px;
}

.block-wrapper.dragging {
  opacity: 0.5;
}

.block-handle {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  opacity: 0;
  transition: opacity 0.15s ease;
  flex-shrink: 0;
  padding-top: 0.375rem;
}

.block-wrapper:hover .block-handle {
  opacity: 1;
}

.drag-handle,
.menu-handle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s ease;
}

.drag-handle {
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle:hover,
.menu-handle:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.block-content-wrapper {
  flex: 1;
  min-width: 0;
}

.block-heading {
  margin: 0.5rem 0 0.25rem;
  color: var(--text-primary);
  outline: none;
  line-height: 1.3;
}

.block-h1 { font-size: 2rem; font-weight: 700; }
.block-h2 { font-size: 1.5rem; font-weight: 600; }
.block-h3 { font-size: 1.25rem; font-weight: 600; }
.block-h4 { font-size: 1.1rem; font-weight: 600; }
.block-h5 { font-size: 1rem; font-weight: 600; }
.block-h6 { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); }

.block-paragraph {
  margin: 0.25rem 0;
  color: var(--text-primary);
  line-height: 1.7;
  outline: none;
  min-height: 24px;
}

.block-paragraph:empty:before {
  content: "输入 '/' 查看命令...";
  color: var(--text-muted);
}

.block-list {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: var(--text-primary);
  line-height: 1.7;
}

.block-list li {
  outline: none;
  margin: 0.25rem 0;
}

.block-bullet-list {
  list-style-type: disc;
}

.block-numbered-list {
  list-style-type: decimal;
}

.add-item-btn {
  margin-left: -1.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.add-item-btn:hover {
  background: var(--bg-tertiary);
  color: var(--accent);
}

.block-quote {
  margin: 0.5rem 0;
  padding: 0.75rem 1rem;
  border-left: 4px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.7;
  outline: none;
  border-radius: 0 6px 6px 0;
}

.block-divider {
  margin: 1rem 0;
  border: none;
  height: 1px;
  background: var(--border);
}

.markdown-block {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9rem;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  outline: none;
  white-space: pre-wrap;
  line-height: 1.6;
  min-height: 24px;
}

.comment-indicator {
  position: absolute;
  right: -32px;
  top: 8px;
  padding: 4px 8px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.comment-indicator:hover {
  transform: scale(1.1);
}

[contenteditable="true"]:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (max-width: 900px) {
  .comment-indicator {
    right: 4px;
    top: 4px;
  }
}
</style>
