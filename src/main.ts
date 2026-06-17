import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'
import { useDocumentsStore } from './stores/documents'
import './styles/main.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)

  const authStore = useAuthStore()
  const uiStore = useUiStore()
  const documentsStore = useDocumentsStore()

  authStore.restoreSession()
  uiStore.initTheme()
  uiStore.initShortcuts()
  uiStore.initTemplates()

  if (authStore.currentUser) {
    await documentsStore.loadAllDocuments()
    await uiStore.loadTags()
    await uiStore.loadNotifications(authStore.currentUser.id)
  }

  app.mount('#app')
}

bootstrap()
