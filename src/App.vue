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

const isSplash = computed(() => route.name === 'splash')
const hideChrome = computed(() => route.meta?.hideChrome === true)
const showTopBar = computed(() => !isTrainingActive.value && !isSplash.value && !hideChrome.value)
const showBottomNav = computed(() => !hideChrome.value && !isSplash.value)

// OffCanvas
const offcanvasPanel = ref<InstanceType<typeof OffcanvasPanel> | null>(null)
const isPanelOpen = computed({
  get: () => route.matched.some(r => r.components && 'panel' in r.components),
  set: (val: boolean) => {
    if (!val && route.matched.some(r => r.components && 'panel' in r.components)) {
      if (history.state?.back) {
        history.back()
      } else {
        window.location.assign('#')
      }
    }
  },
})

const panelTitle = computed(() => {
  switch (route.name) {
    case 'settings': return 'Configuracion'
    case 'settings-voice': return 'Opciones de voz (TTS)'
    case 'settings-sound': return 'Opciones de sonido'
    case 'settings-training': return 'Configuracion de entrenamiento'
    case 'settings-testing': return 'Testing'
    default: return 'Panel'
  }
})

function toggleOffcanvas(panel: string) {
  offcanvasPanel.value?.open(panel as 'catalog' | 'help' | 'settings')
}

const topBarEl = ref<InstanceType<typeof TopBar> | null>(null)
const bottomNavEl = ref<InstanceType<typeof BottomNav> | null>(null)
const padTop = ref(0)
const padBottom = ref(0)

async function measureChrome() {
  await nextTick()

  const DEFAULT_TOP = 56
  const DEFAULT_BOTTOM = 64

  if (showTopBar.value) {
    const topHost = (topBarEl.value as any)?.$el as HTMLElement | undefined
    padTop.value = Math.round(topHost?.getBoundingClientRect().height ?? DEFAULT_TOP)
  } else {
    padTop.value = 0
  }

  if (showBottomNav.value) {
    const bottomHost = (bottomNavEl.value as any)?.$el as HTMLElement | undefined
    padBottom.value = Math.round(bottomHost?.getBoundingClientRect().height ?? DEFAULT_BOTTOM)
  } else {
    padBottom.value = 0
  }
}

watch([showTopBar, showBottomNav, () => route.fullPath], () => measureChrome())
onMounted(() => {
  measureChrome()
  window.addEventListener('resize', measureChrome)
})
onUnmounted(() => {
  window.removeEventListener('resize', measureChrome)
})

const mainStyle = computed(() => ({
  paddingTop: `calc(${padTop.value}px + env(safe-area-inset-top, 0px))`,
  paddingBottom: `calc(${padBottom.value}px + env(safe-area-inset-bottom, 0px))`,
  minHeight: '100vh',
}) as Record<string, string>)

function cleanupOffcanvasBackdrop() {
  document.body.classList.remove('offcanvas-open')
  const backdrop = document.querySelector('.offcanvas-backdrop')
  backdrop?.parentElement?.removeChild(backdrop)
}

function closeOffcanvas() {
  if (offcanvasPanel.value) {
    offcanvasPanel.value.close()
  }
  cleanupOffcanvasBackdrop()
}

watch(
  hideChrome,
  value => {
    if (value) {
      closeOffcanvas()
    }
  },
  { immediate: true },
)

const mainClasses = computed(() => ({
  'flex-fill': true,
  'position-relative': true,
  'overflow-auto': true,
  'px-3': !hideChrome.value,
  'pt-5': showTopBar.value,
}))

console.log(
  '%c[route] rutas registradas:',
  'color:#0a0;font-weight:bold',
  router.getRoutes().map((r: { name: unknown; path: unknown }) => ({ name: r.name, path: r.path })),
)
</script>

<template>
  <div id="app" class="d-flex flex-column vh-100">
    <TopBar
      v-if="showTopBar"
      ref="topBarEl"
      :title="pageTitle"
      :showBack="showBack"
      @toggleOffcanvas="toggleOffcanvas"
    />

    <main :class="mainClasses" :style="mainStyle">
      <RouterView v-slot="{ Component, route: activeRoute }">
        <Transition
          v-if="hideChrome && Component"
          name="auth-modal-route"
          mode="out-in"
          appear
        >
          <component :is="Component" :key="activeRoute.fullPath" />
        </Transition>
        <component v-else :is="Component" :key="activeRoute.fullPath" />
      </RouterView>
    </main>

    <BottomNav v-if="showBottomNav" ref="bottomNavEl" />

    <OffcanvasPanel
      v-if="!hideChrome"
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
.auth-modal-route-enter-active,
.auth-modal-route-leave-active {
  position: relative;
}

.auth-modal-route-enter-active .auth-modal,
.auth-modal-route-leave-active .auth-modal {
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.auth-modal-route-enter-from .auth-modal,
.auth-modal-route-leave-to .auth-modal {
  transform: translateY(35px);
  opacity: 0;
}

.auth-modal-route-leave-from .auth-modal,
.auth-modal-route-enter-to .auth-modal {
  transform: translateY(0);
  opacity: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
