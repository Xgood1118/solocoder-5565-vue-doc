<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import type { Block } from '@/types'

const props = defineProps<{
  block: Block
  editable?: boolean
}>()

const emit = defineEmits<{
  update: [content: string]
}>()

const documentsStore = useDocumentsStore()
const isEditing = ref(false)
const editRef = ref<HTMLElement | null>(null)

const toggleTodo = () => {
  if (!props.editable) return
  documentsStore.updateBlock(props.block.id, {
    checked: !props.block.checked
  })
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLElement
  emit('update', target.innerText)
}

const startEdit = () => {
  if (!props.editable) return
  isEditing.value = true
  setTimeout(() => {
    editRef.value?.focus()
    const range = document.createRange()
    const sel = window.getSelection()
    if (editRef.value && sel) {
      range.selectNodeContents(editRef.value)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }, 0)
}

const finishEdit = () => {
  isEditing.value = false
}
</script>

<template>
  <div class="todo-block" :class="{ checked: block.checked, editable }">
    <input
      type="checkbox"
      :checked="block.checked"
      @change="toggleTodo"
      :disabled="!editable"
      class="todo-checkbox"
    />
    
    <div
      v-if="isEditing"
      ref="editRef"
      class="todo-content editable"
      contenteditable="true"
      @input="handleInput"
      @blur="finishEdit"
      @keyup.enter="finishEdit"
    >{{ block.content }}</div>
    
    <div
      v-else
      class="todo-content"
      :class="{ checked: block.checked }"
      @dblclick="startEdit"
    >
      {{ block.content || (editable ? '点击添加待办事项...' : '') }}
    </div>
  </div>
</template>

<style scoped>
.todo-block {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0;
  transition: all 0.15s ease;
}

.todo-block.editable:hover {
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.todo-checkbox {
  width: 18px;
  height: 18px;
  margin-top: 3px;
  cursor: pointer;
  accent-color: var(--primary-500);
  flex-shrink: 0;
}

.todo-content {
  flex: 1;
  color: var(--text-primary);
  line-height: 1.6;
  outline: none;
  min-height: 24px;
}

.todo-content.checked {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.todo-content.editable {
  background: var(--bg-primary);
  border: 1px solid var(--primary-400);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-400) 20%, transparent);
}

.todo-block.checked .todo-content:not(.editable) {
  text-decoration: line-through;
  color: var(--text-tertiary);
}
</style>
