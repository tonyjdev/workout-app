<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TopBar from '@/components/layout/TopBar.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import OffcanvasPanel from '@/components/layout/OffcanvasPanel.vue'

const route = useRoute()
const router = useRouter()
const isTrainingActive = ref(false)

const pageTitle = computed(() => (route?.meta?.title as string) ?? 'Workout App')
const showBack = computed(() => !!route?.meta?.back)

// Oculta TopBar y BottomNav solo en splash
const isSplash = computed(() => route.path === '/')

// OffCanvas
const offcanvasPanel = ref<InstanceType<typeof OffcanvasPanel> | null>(null)
// Abre el offcanvas si la ruta actual tiene componente en la named view 'panel'
const isPanelOpen = computed({
  get: () => route.matched.some(r => r.components && 'panel' in r.components),
  set: (val: boolean) => {
    // Cerrar manualmente: volvemos atrás si había panel abierto
    if (!val && route.matched.some(r => r.components && 'panel' in r.components)) {
      history.state?.back ? history.back() : window.location.assign('#') // o router.push({ name: 'training' })
    }
  }
})

// Título del panel según la ruta
const panelTitle = computed(() => {
  switch (route.name) {
    case 'settings': return 'Configuración'
    case 'settings-voice': return 'Opciones de voz (TTS)'
    case 'settings-sound': return 'Opciones de sonido'
    case 'settings-training': return 'Configuración de entrenamiento'
    case 'settings-testing': return 'Testing'
    default: return 'Panel'
  }
})
// (Opcional) si quieres animar la apertura/cierre cuando cambia la ruta:
watch(() => isPanelOpen.value, open => {
  if (open) offcanvasPanel.value?.open?.()
  else offcanvasPanel.value?.close?.()
})

function toggleOffcanvas(panel: string) {
  offcanvasPanel.value?.open(panel as 'catalog' | 'help' | 'settings')
}

/** refs a las barras para medir su alto real */
const topBarEl = ref<InstanceType<typeof TopBar> | null>(null)
const bottomNavEl = ref<InstanceType<typeof BottomNav> | null>(null)
/** padding dinámico en px */
const padTop = ref(0)
const padBottom = ref(0)

/** cuando las barras no están ocultas */
const chromeVisible = computed(() => !isTrainingActive.value)

async function measureChrome() {
  // si las barras están ocultas, no añadimos padding
  if (!chromeVisible.value) {
    padTop.value = 0
    padBottom.value = 0
    return
  }

  await nextTick() // asegura que los nodos existen/renderizados

  // fallback por si aún no existen (valores típicos)
  const DEFAULT_TOP = 56
  const DEFAULT_BOTTOM = 64

  const topHost = (topBarEl.value as any)?.$el as HTMLElement | undefined
  const bottomHost = (bottomNavEl.value as any)?.$el as HTMLElement | undefined

  padTop.value = Math.round(topHost?.getBoundingClientRect().height ?? DEFAULT_TOP)
  padBottom.value = Math.round(bottomHost?.getBoundingClientRect().height ?? DEFAULT_BOTTOM)
}
/** recalcula en cambios de visibilidad, resize y cambios de ruta */
watch([chromeVisible, () => route.fullPath], () => measureChrome())
onMounted(() => {
  measureChrome()
  window.addEventListener('resize', measureChrome)
})
onUnmounted(() => {
  window.removeEventListener('resize', measureChrome)
})

/** estilo aplicado al <main> */
const mainStyle = computed(() => {
  // añadimos también safe-areas iOS por si acaso
  return {
    paddingTop: `calc(${padTop.value}px + env(safe-area-inset-top, 0px))`,
    paddingBottom: `calc(${padBottom.value}px + env(safe-area-inset-bottom, 0px))`,
    minHeight: '100vh',
  } as Record<string,string>
})


console.log(
  '%c[route] rutas registradas:',
  'color:#0a0;font-weight:bold',
  router.getRoutes().map((r: { name: any; path: any }) => ({ name: r.name, path: r.path }))
)
</script>

<template>
  <div id="app" class="d-flex flex-column vh-100">
    <!-- Barra superior -->
    <TopBar
      v-if="!isTrainingActive && !isSplash"
      ref="topBarEl"
      :title="pageTitle"
      :showBack="showBack"
      @toggleOffcanvas="toggleOffcanvas"
    />

    <!-- Contenido principal -->
    <main class="flex-fill position-relative overflow-auto px-3" :class="{ 'pt-5': !isTrainingActive }"
          :style="mainStyle"
    >
      <RouterView v-slot="{ Component }">
        <component :is="Component" :key="route.path" />
      </RouterView>
    </main>

    <!-- Barra inferior -->
    <BottomNav />

    <!-- Offcanvas: renderiza la named view 'panel' -->
    <OffcanvasPanel
      v-model:show="isPanelOpen"
      :title="panelTitle"
      ref="offcanvasPanel"
      size="480px"
    >
      <RouterView name="panel" v-slot="{ Component }">
        <component :is="Component" v-if="Component" />
      </RouterView>
    </OffcanvasPanel>
  </div>
</template>

<style>
/* Transición suave entre vistas */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
