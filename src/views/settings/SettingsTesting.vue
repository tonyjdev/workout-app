<!-- src/views/settings/SettingsTesting.vue -->
<template>
  <div class="container py-3">
    <BackHeader title="Testing" @back="emit('back')" />

    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex align-items-start justify-content-between gap-3 flex-column flex-md-row">
          <div>
            <h2 class="h6 mb-1">Mantener pantalla encendida</h2>
            <p class="text-muted small mb-0">
              Evita que el movil entre en reposo durante las pruebas manuales.
            </p>
          </div>
          <div class="form-check form-switch ms-md-auto">
            <input
              id="keep-screen-on-switch"
              class="form-check-input"
              type="checkbox"
              role="switch"
              :checked="keepScreenOn"
              :disabled="isToggleDisabled"
              @change="onToggleKeepScreen"
            />
          </div>
        </div>
        <p v-if="keepAwakeSupported === false" class="text-muted small mt-2 mb-0">
          Este dispositivo no admite controlar el estado de la pantalla desde la aplicacion.
        </p>
        <p v-else-if="keepError" class="text-danger small mt-2 mb-0">
          {{ keepError }}
        </p>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <h2 class="h6 mb-2">Notificacion de prueba</h2>
        <p class="text-muted small">
          Lanza una notificacion local inmediata para verificar que el movil las recibe correctamente.
        </p>

        <button
          type="button"
          class="btn btn-primary"
          :disabled="notificationBusy"
          @click="onSendNotification"
        >
          <span
            v-if="notificationBusy"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          Enviar notificacion
        </button>
        <p v-if="notificationError" class="text-danger small mt-2 mb-0">
          {{ notificationError }}
        </p>
        <p v-else-if="notificationSuccess" class="text-success small mt-2 mb-0">
          Notificacion programada correctamente.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BackHeader from '@/components/BackHeader.vue'

import {
  getKeepScreenAwakeState,
  isKeepScreenAwakeSupported,
  sendTestNotification,
  setKeepScreenAwake
} from '@/services/deviceTesting'

const emit = defineEmits<{ (e: 'back'): void }>()

const keepAwakeSupported = ref<boolean | null>(null)
const keepScreenOn = ref(false)
const keepToggleBusy = ref(false)
const keepError = ref('')

const notificationBusy = ref(false)
const notificationSuccess = ref(false)
const notificationError = ref('')

const isToggleDisabled = computed(
  () => keepAwakeSupported.value !== true || keepToggleBusy.value
)

async function loadKeepAwakeState() {
  keepAwakeSupported.value = await isKeepScreenAwakeSupported()
  if (keepAwakeSupported.value) {
    keepScreenOn.value = await getKeepScreenAwakeState()
  } else {
    keepScreenOn.value = false
  }
}

async function onToggleKeepScreen(event: Event) {
  if (keepAwakeSupported.value !== true) {
    return
  }

  const input = event.target as HTMLInputElement
  const desiredState = input.checked
  keepToggleBusy.value = true
  keepError.value = ''

  const result = await setKeepScreenAwake(desiredState)

  keepToggleBusy.value = false
  keepScreenOn.value = result.isEnabled

  if (!result.success) {
    keepError.value = result.error ?? 'No se pudo actualizar el estado de la pantalla.'
    input.checked = result.isEnabled
  }
}

async function onSendNotification() {
  notificationBusy.value = true
  notificationError.value = ''
  notificationSuccess.value = false

  const result = await sendTestNotification()

  notificationBusy.value = false

  if (result.success) {
    notificationSuccess.value = true
    return
  }

  notificationError.value = result.error ?? 'No se pudo enviar la notificacion en el dispositivo.'
}

onMounted(() => {
  loadKeepAwakeState()
})
</script>
