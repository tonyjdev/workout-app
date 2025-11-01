
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

const router = useRouter()

onMounted(() => {
  // Simula carga y navega sin transiciones complejas
  setTimeout(() => {
    router.replace('/training')
  }, 2000)
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
