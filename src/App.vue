<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useDocumentsStore } from '@/stores/documents'
import AppLayout from '@/components/AppLayout.vue'
import LoginModal from '@/components/LoginModal.vue'
import { storeToRefs } from 'pinia'

const authStore = useAuthStore()
const uiStore = useUiStore()
const documentsStore = useDocumentsStore()
const { isLoggedIn, currentUser } = storeToRefs(authStore)
const { shortcuts } = storeToRefs(uiStore)

function matchKey(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+')
  const ctrl = event.ctrlKey || event.metaKey
  const shift = event.shiftKey
  const alt = event.altKey

  for (const part of parts) {
    if (part === 'ctrl') {
      if (!ctrl) return false
    } else if (part === 'shift') {
      if (!shift) return false
    } else if (part === 'alt') {
      if (!alt) return false
    } else {
      if (event.key.toLowerCase() !== part) return false
    }
  }

  const needsModifier = shortcut.includes('Ctrl') || shortcut.includes('Shift') || shortcut.includes('Alt')
  if (needsModifier) {
    return ctrl || shift || alt
  }
  return event.key.toLowerCase() === shortcut.toLowerCase()
}

function handleKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

  for (const shortcut of shortcuts.value) {
    if (matchKey(event, shortcut.currentKey)) {
      if (isInput && !['escape', 'save', 'undo', 'redo', 'bold', 'italic', 'underline', 'toggle-mode'].includes(shortcut.action)) {
        continue
      }

      if (['save', 'undo', 'redo', 'bold', 'italic', 'underline', 'search'].includes(shortcut.action)) {
        event.preventDefault()
      }

      switch (shortcut.action) {
        case 'save':
          documentsStore.forceSave()
          break
        case 'undo':
          documentsStore.undo()
          break
        case 'redo':
          documentsStore.redo()
          break
        case 'search':
          uiStore.openModal('search')
          break
        case 'new-doc':
          uiStore.openModal('templatePicker')
          break
        case 'toggle-mode':
          documentsStore.toggleEditorMode()
          break
        case 'escape':
          uiStore.closeAllModals()
          uiStore.closeBlockMenu()
          break
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(currentUser, async (user) => {
  if (user) {
    await documentsStore.loadAllDocuments()
    await uiStore.loadTags()
    await uiStore.loadNotifications(user.id)
  }
})
</script>

<template>
  <div class="app">
    <LoginModal v-if="!isLoggedIn" />
    <AppLayout v-else>
      <RouterView />
    </AppLayout>
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  width: 100%;
}
</style>
