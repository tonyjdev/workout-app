<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from '@/components/layout/TopBar.vue'
import BottomNav from '@/components/layout/BottomNav.vue'
import OffcanvasPanel from '@/components/layout/OffcanvasPanel.vue'

const route = useRoute()
const isTrainingActive = ref(false)

const pageTitle = computed(() => (route?.meta?.title as string) ?? 'Workout App')
const showBack = computed(() => !!route?.meta?.back)

// Oculta TopBar y BottomNav solo en splash
const isSplash = computed(() => route.path === '/')

const offcanvasPanel = ref<InstanceType<typeof OffcanvasPanel> | null>(null)
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
</script>

<template>
  <div id="app" class="d-flex flex-column vh-100">
    <TopBar
      v-if="!isTrainingActive && !isSplash"
      ref="topBarEl"
      :title="pageTitle"
      :showBack="showBack"
      @toggleOffcanvas="toggleOffcanvas"
    />

    <main
      class="flex-fill position-relative overflow-auto px-3" :class="{ 'pt-5': !isTrainingActive }"
      :style="mainStyle"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component
            :is="Component"
            :key="route.path"
            @training:start="isTrainingActive = true"
            @training:end="isTrainingActive = false"
          />
        </Transition>
      </RouterView>
    </main>

    <BottomNav v-if="!isTrainingActive && !isSplash" ref="bottomNavEl" />
    <OffcanvasPanel ref="offcanvasPanel" />
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
