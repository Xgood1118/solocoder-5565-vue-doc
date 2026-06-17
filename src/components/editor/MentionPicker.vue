<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const props = defineProps<{
  show: boolean
  position: { x: number; y: number }
  searchQuery?: string
}>()

const emit = defineEmits<{
  select: [user: User]
  close: []
}>()

const authStore = useAuthStore()
const pickerRef = ref<HTMLDivElement | null>(null)
const selectedIndex = ref(0)

const filteredUsers = computed(() => {
  const query = props.searchQuery?.toLowerCase() || ''
  return authStore.searchUsers(query).slice(0, 8)
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedIndex.value = 0
    nextTick(() => {
      pickerRef.value?.focus()
    })
  }
})

watch(() => props.searchQuery, () => {
  selectedIndex.value = 0
})

const handleSelect = (user: User) => {
  emit('select', user)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.show) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, filteredUsers.value.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (filteredUsers.value[selectedIndex.value]) {
        handleSelect(filteredUsers.value[selectedIndex.value])
      }
      break
    case 'Escape':
      e.preventDefault()
      emit('close')
      break
  }
}

defineExpose({
  handleKeydown
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="pickerRef"
      class="mention-picker"
      tabindex="-1"
      @keydown="handleKeydown"
      :style="{
        left: position.x + 'px',
        top: position.y + 'px'
      }"
    >
      <div class="mention-picker-header">
        选择要 @ 的同事
      </div>
      <div class="mention-picker-list">
        <div
          v-for="(user, index) in filteredUsers"
          :key="user.id"
          class="mention-item"
          :class="{ active: index === selectedIndex }"
          @click="handleSelect(user)"
          @mouseenter="selectedIndex = index"
        >
          <img :src="user.avatar" :alt="user.name" class="mention-avatar" />
          <div class="mention-info">
            <span class="mention-name">{{ user.name }}</span>
            <span class="mention-role">{{ user.role }}</span>
          </div>
        </div>
        <div v-if="filteredUsers.length === 0" class="mention-empty">
          没有找到匹配的用户
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mention-picker {
  position: fixed;
  z-index: 10000;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  min-width: 240px;
  max-height: 320px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mention-picker-header {
  padding: 8px 12px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.mention-picker-list {
  overflow-y: auto;
  flex: 1;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.mention-item:hover,
.mention-item.active {
  background: var(--bg-secondary);
}

.mention-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mention-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mention-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

.mention-role {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-transform: capitalize;
}

.mention-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}
</style>
