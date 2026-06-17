<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import BlockEditor from '@/components/editor/BlockEditor.vue'
import ShareModal from '@/components/ShareModal.vue'
import SearchModal from '@/components/SearchModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import NotificationsPanel from '@/components/NotificationsPanel.vue'

const route = useRoute()
const router = useRouter()
const documentsStore = useDocumentsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const documentId = computed(() => route.params.id as string)

const handleBack = () => {
  router.push('/')
}

const handleShare = () => {
  uiStore.openModal('share')
}

onMounted(() => {
  if (!authStore.currentUser) {
    authStore.restoreSession()
  }
  uiStore.loadTags()
  if (authStore.currentUser) {
    uiStore.loadNotifications(authStore.currentUser.id)
  }
  documentsStore.loadAllDocuments()
})

onUnmounted(() => {
  documentsStore.closeDocument()
})

watch(() => route.params.id, () => {
  // 当文档 ID 变化时，BlockEditor 会自动处理
}, { immediate: true })
</script>

<template>
  <div class="document-editor-page">
    <BlockEditor
      v-if="documentId"
      :document-id="documentId"
      @back="handleBack"
    />

    <ShareModal
      v-if="uiStore.modals.share && documentsStore.currentDocument"
      :document="documentsStore.currentDocument"
      :show="uiStore.modals.share"
      @close="uiStore.closeModal('share')"
    />

    <SearchModal
      :show="uiStore.modals.search"
      @close="uiStore.closeModal('search')"
    />

    <SettingsModal
      :show="uiStore.modals.settings"
      @close="uiStore.closeModal('settings')"
    />

    <NotificationsPanel
      :show="uiStore.modals.notifications"
      @close="uiStore.closeModal('notifications')"
    />
  </div>
</template>

<style scoped>
.document-editor-page {
  height: 100vh;
  overflow: hidden;
}
</style>
