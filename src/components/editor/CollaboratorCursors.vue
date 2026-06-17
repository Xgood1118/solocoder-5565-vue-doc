<script setup lang="ts">
import { computed } from 'vue'
import type { Collaborator, Block } from '@/types'

const props = defineProps<{
  collaborators: Collaborator[]
  blocks: Block[]
}>()

const activeCollaborators = computed(() => 
  props.collaborators.filter(c => c.cursorPosition)
)

const getInitial = (name: string) => {
  return name.charAt(0).toUpperCase()
}

const getCursorPosition = (collaborator: Collaborator) => {
  if (!collaborator.cursorPosition) return { left: 0, top: 0 }
  const blockEl = document.querySelector(`[data-block-id="${collaborator.cursorPosition.blockId}"]`)
  if (!blockEl) return { left: 0, top: 0 }
  const rect = blockEl.getBoundingClientRect()
  const parentRect = blockEl.parentElement?.getBoundingClientRect()
  if (!parentRect) return { left: 0, top: 0 }
  return {
    left: rect.left - parentRect.left + Math.min(collaborator.cursorPosition.offset * 8, rect.width - 20),
    top: rect.top - parentRect.top
  }
}

const getSelectionStyle = (collaborator: Collaborator) => {
  if (!collaborator.selection) return {}
  const startEl = document.querySelector(`[data-block-id="${collaborator.selection.start.blockId}"]`)
  const endEl = document.querySelector(`[data-block-id="${collaborator.selection.end.blockId}"]`)
  if (!startEl || !endEl) return {}
  const parentRect = startEl.parentElement?.getBoundingClientRect()
  if (!parentRect) return {}
  const startRect = startEl.getBoundingClientRect()
  const endRect = endEl.getBoundingClientRect()
  return {
    left: (startRect.left - parentRect.left) + 'px',
    top: (startRect.top - parentRect.top) + 'px',
    width: Math.max(100, endRect.right - startRect.left) + 'px',
    height: Math.max(20, endRect.bottom - startRect.top) + 'px',
    backgroundColor: collaborator.user.color + '30',
    borderColor: collaborator.user.color
  }
}
</script>

<template>
  <div class="collaborator-cursors">
    <div
      v-for="collaborator in activeCollaborators"
      :key="collaborator.tabId"
      class="collaborator-cursor"
      :style="{
        left: getCursorPosition(collaborator).left + 'px',
        top: getCursorPosition(collaborator).top + 'px',
        '--cursor-color': collaborator.user.color
      }"
    >
      <div class="cursor-line"></div>
      <div 
        class="cursor-label"
        :style="{ backgroundColor: collaborator.user.color }"
      >
        {{ getInitial(collaborator.user.name) }}
        <span class="cursor-name">{{ collaborator.user.name }}</span>
      </div>
      
      <div 
        v-if="collaborator.selection"
        class="cursor-selection"
        :style="getSelectionStyle(collaborator)"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.collaborator-cursors {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
}

.collaborator-cursor {
  position: absolute;
  pointer-events: none;
}

.cursor-line {
  width: 2px;
  height: 20px;
  background: var(--cursor-color);
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.cursor-label {
  position: absolute;
  top: -24px;
  left: 0;
  padding: 2px 6px;
  border-radius: 4px 4px 4px 0;
  color: white;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  transform: translateX(-1px);
}

.cursor-name {
  display: none;
  font-size: 11px;
  opacity: 0.9;
}

.collaborator-cursor:hover .cursor-name {
  display: inline;
}

.cursor-selection {
  position: absolute;
  border: 1px solid;
  border-radius: 2px;
  pointer-events: none;
}
</style>
