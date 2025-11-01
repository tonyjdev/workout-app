<script setup lang="ts">
import { ref, computed } from 'vue'
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
</script>

<template>
  <div id="app" class="d-flex flex-column vh-100">
    <TopBar
      v-if="!isTrainingActive && !isSplash"
      :title="pageTitle"
      :showBack="showBack"
      @toggleOffcanvas="toggleOffcanvas"
    />

    <main class="flex-fill position-relative overflow-auto" :class="{ 'pt-5': !isSplash }">
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

    <BottomNav v-if="!isTrainingActive && !isSplash" />
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
