<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentsStore } from '@/stores/documents'
import type { Block, BlockType } from '@/types'

const props = defineProps<{
  block: Block
  show: boolean
  position: { x: number; y: number }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add-comment'): void
}>()

const documentsStore = useDocumentsStore()
const showTypeMenu = ref(false)

const blockTypes: { type: BlockType; label: string }[] = [
  { type: 'h1', label: '一级标题' },
  { type: 'h2', label: '二级标题' },
  { type: 'h3', label: '三级标题' },
  { type: 'paragraph', label: '段落' },
  { type: 'bulleted-list', label: '无序列表' },
  { type: 'numbered-list', label: '有序列表' },
  { type: 'todo', label: '待办' },
  { type: 'quote', label: '引用' },
  { type: 'code', label: '代码块' },
  { type: 'divider', label: '分割线' },
]

const changeType = (type: BlockType) => {
  documentsStore.changeBlockType(props.block.id, type)
  emit('close')
}

const duplicateBlock = () => {
  documentsStore.duplicateBlock(props.block.id)
  emit('close')
}

const moveUp = () => {
  const blocks = documentsStore.currentDocument?.blocks || []
  const currentIndex = blocks.findIndex(b => b.id === props.block.id)
  if (currentIndex > 0) {
    documentsStore.reorderBlocks(currentIndex, currentIndex - 1)
  }
  emit('close')
}

const moveDown = () => {
  const blocks = documentsStore.currentDocument?.blocks || []
  const currentIndex = blocks.findIndex(b => b.id === props.block.id)
  if (currentIndex >= 0 && currentIndex < blocks.length - 1) {
    documentsStore.reorderBlocks(currentIndex, currentIndex + 1)
  }
  emit('close')
}

const deleteBlock = () => {
  if (confirm('确定要删除这个块吗？')) {
    documentsStore.removeBlock(props.block.id)
    emit('close')
  }
}

const addComment = () => {
  emit('add-comment')
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="block-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div class="type-menu-wrapper">
      <button class="menu-item" @click="showTypeMenu = !showTypeMenu">
        <span>🔄 转换为</span>
        <span class="arrow">▶</span>
      </button>
      
      <div v-if="showTypeMenu" class="type-submenu">
        <button
          v-for="type in blockTypes"
          :key="type.type"
          class="submenu-item"
          :class="{ active: block.type === type.type }"
          @click="changeType(type.type)"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <button class="menu-item" @click="duplicateBlock">
      📋 复制块
    </button>
    
    <button class="menu-item" @click="moveUp">
      ⬆️ 上移
    </button>
    
    <button class="menu-item" @click="moveDown">
      ⬇️ 下移
    </button>

    <div class="menu-divider"></div>

    <button class="menu-item" @click="addComment">
      💬 添加评论
    </button>

    <div class="menu-divider"></div>

    <button class="menu-item danger" @click="deleteBlock">
      🗑️ 删除块
    </button>
  </div>
</template>

<style scoped>
.block-menu {
  position: absolute;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 160px;
  padding: 0.375rem;
  animation: fadeIn 0.1s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.type-menu-wrapper {
  position: relative;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  text-align: left;
  transition: all 0.15s ease;
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

.arrow {
  font-size: 0.7rem;
  opacity: 0.5;
}

.type-submenu {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 0.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  padding: 0.375rem;
  min-width: 140px;
}

.submenu-item {
  display: block;
  width: 100%;
  padding: 0.375rem 0.75rem;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.8rem;
  text-align: left;
  transition: all 0.15s ease;
}

.submenu-item:hover,
.submenu-item.active {
  background: var(--primary-100);
  color: var(--primary-600);
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.375rem -0.375rem;
}
</style>
