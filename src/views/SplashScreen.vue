<template>
  <!-- Solo fade-out al ocultarse -->
  <transition name="fade">
    <div v-if="visible" class="splash-screen d-flex flex-column justify-content-between text-center text-white">
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
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const visible = ref(true)
const router = useRouter()

onMounted(() => {
  setTimeout(() => {
    visible.value = false
    // espera el fade-out antes de navegar
    setTimeout(() => router.replace('/'), 300)
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

/* Solo transiciones de salida (fade-out) */
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-leave-to { opacity: 0; }
</style>
