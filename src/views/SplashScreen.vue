
<template>
  <div class="splash-screen d-flex flex-column justify-content-between text-center text-white">
    <div class="flex-fill d-flex flex-column justify-content-center align-items-center">
      <img src="/logo.png" alt="Workout App" class="logo mb-3" />
      <h1 class="app-name">Workout App</h1>
    </div>
    <div class="pb-5">
      <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

onMounted(async () => {
  const MIN_SPLASH_TIME = 1200
  const startAt = performance.now()

  await auth.init()

  const elapsed = performance.now() - startAt
  if (elapsed < MIN_SPLASH_TIME) {
    await delay(MIN_SPLASH_TIME - elapsed)
  }

  const nextRoute = auth.isAuthenticated ? { name: 'training' } : { name: 'login' }
  router.replace(nextRoute)
})
</script>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  background: url('/splash-bg.jpg') center/cover no-repeat, #000;
  z-index: 3000;
}

.logo { width: 120px; height: auto; }
.app-name { font-size: 1.5rem; font-weight: 600; letter-spacing: 1px; }
</style>
