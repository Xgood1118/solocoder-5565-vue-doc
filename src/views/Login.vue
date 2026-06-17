<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import LoginModal from '@/components/LoginModal.vue'

const authStore = useAuthStore()
const router = useRouter()

const handleLogin = (userId: string) => {
  authStore.loginAs(userId)
  router.push('/dashboard')
}
</script>

<template>
  <div class="login-page">
    <div class="login-header">
      <h1 class="logo">📝 SoloDoc</h1>
      <p class="subtitle">轻量级浏览器内协作文档工具</p>
    </div>
    <LoginModal :show="true" @login="handleLogin" @close="handleLogin('user-1')" />
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 2rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  font-size: 3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
}
</style>
