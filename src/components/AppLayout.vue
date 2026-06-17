<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useDocumentsStore } from '@/stores/documents'
import { storeToRefs } from 'pinia'
import Sidebar from '@/components/Sidebar.vue'
import Header from '@/components/Header.vue'
import SearchModal from '@/components/SearchModal.vue'
import TemplatePickerModal from '@/components/TemplatePickerModal.vue'
import ShareModal from '@/components/ShareModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import NotificationsPanel from '@/components/NotificationsPanel.vue'

const uiStore = useUiStore()
const authStore = useAuthStore()
const documentsStore = useDocumentsStore()
const router = useRouter()
const route = useRoute()

const { sidebarOpen, modals, activeTab } = storeToRefs(uiStore)
const { currentUser } = storeToRefs(authStore)

const showHeader = computed(() => {
  return route.name !== 'DocumentEditor'
})
</script>

<template>
  <div class="app-layout">
    <Sidebar v-if="sidebarOpen" class="animate-fade-in" />
    <div class="main-content" :class="{ 'sidebar-collapsed': !sidebarOpen }">
      <Header v-if="showHeader" />
      <div class="content-area">
        <slot />
      </div>
    </div>
    <SearchModal v-if="modals.search" />
    <TemplatePickerModal v-if="modals.templatePicker" />
    <ShareModal v-if="modals.share" />
    <SettingsModal v-if="modals.settings" />
    <NotificationsPanel v-if="modals.notifications" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100%;
  width: 100%;
  background-color: var(--bg-primary);
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: margin-left 0.3s ease;
}

.sidebar-collapsed {
  margin-left: 0;
}

.content-area {
  flex: 1;
  overflow: auto;
}
</style>
