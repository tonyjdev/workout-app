<template>
  <div class="settings-panel">
    <Transition name="settings-slide" mode="out-in">
      <div v-if="currentView === 'list'" key="settings-list">
        <div class="list-group">
          <button
            v-for="option in options"
            :key="option.key"
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            type="button"
            @click="open(option.key)"
          >
            <span>{{ option.title }}</span>
            <span class="text-muted">&rarr;</span>
          </button>
        </div>
        <button
          type="button"
          class="btn btn-outline-danger w-100 mt-3"
          :disabled="loggingOut"
          @click="handleLogout"
        >
          <span
            v-if="loggingOut"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          />
          Cerrar sesion
        </button>
        <div class="text-center text-muted small mt-3">
          Version {{ appVersion }}
        </div>
      </div>
      <component
        v-else
        :is="activeComponent"
        :key="currentView"
        @back="backToList"
        @panel:set-title="emit('panel:set-title', $event)"
        @panel:register-back="emit('panel:register-back', $event)"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SettingsView',
})
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import packageJson from '../../package.json'
import buildInfo from '../../build-info.json'
import SettingsGeneral from '@/views/settings/SettingsGeneral.vue'
import SettingsVoice from '@/views/settings/SettingsVoice.vue'
import SettingsSound from '@/views/settings/SettingsSound.vue'
import SettingsTraining from '@/views/settings/SettingsTraining.vue'
import SettingsTesting from '@/views/settings/SettingsTesting.vue'
import { useAuthStore } from '@/stores/authStore'

type SettingsChild = 'general' | 'voice' | 'sound' | 'training' | 'testing'
type SettingsView = 'list' | SettingsChild

const emit = defineEmits<{
  (e: 'panel:set-title', title: string): void
  (e: 'panel:reset-title'): void
  (e: 'panel:register-back', handler: (() => void) | null): void
}>()

const options: Array<{ key: SettingsChild; title: string }> = [
  { key: 'general', title: 'Ajustes generales' },
  { key: 'voice', title: 'Opciones de voz (TTS)' },
  { key: 'sound', title: 'Opciones de sonido' },
  { key: 'training', title: 'Configuracion de entrenamiento' },
  { key: 'testing', title: 'Testing' },
]

const childViews: Record<SettingsChild, { title: string; component: any }> = {
  general: { title: 'Ajustes generales', component: SettingsGeneral },
  voice: { title: 'Opciones de voz (TTS)', component: SettingsVoice },
  sound: { title: 'Opciones de sonido', component: SettingsSound },
  training: { title: 'Configuracion de entrenamiento', component: SettingsTraining },
  testing: { title: 'Testing', component: SettingsTesting },
}

const router = useRouter()
const auth = useAuthStore()

const loggingOut = computed(() => auth.pending)

const info = buildInfo as { base?: string; build?: number | string }
const pkg = packageJson as { version?: string }
const baseVersion = info?.base ?? pkg?.version ?? '0.0.0'
const buildNumber = Number(info?.build ?? 0) || 0
const appVersion = buildNumber > 0 ? `v${baseVersion}+${buildNumber}` : `v${baseVersion}`

const currentView = ref<SettingsView>('list')

const activeComponent = computed(() => {
  if (currentView.value === 'list') {
    return null
  }
  return childViews[currentView.value].component
})

watch(
  currentView,
  (next) => {
    if (next === 'list') {
      emit('panel:reset-title')
      emit('panel:register-back', null)
    } else {
      emit('panel:set-title', childViews[next].title)
      emit('panel:register-back', backToList)
    }
  },
  { immediate: true },
)

function open(next: SettingsChild) {
  currentView.value = next
}

function backToList() {
  currentView.value = 'list'
}

async function handleLogout() {
  if (loggingOut.value) {
    return
  }
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<style scoped>
.settings-panel {
  min-height: 100%;
}

.settings-slide-enter-active,
.settings-slide-leave-active {
  transition: opacity 0.2s ease;
}

.settings-slide-enter-from,
.settings-slide-leave-to {
  opacity: 0;
}
</style>
