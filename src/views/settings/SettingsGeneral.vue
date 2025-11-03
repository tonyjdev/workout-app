<template>
  <div class="card">
    <Transition name="settings-slide" mode="out-in">
      <div v-if="view === 'main'" key="general-main">
        <div class="card-body">
          <form class="vstack gap-3" @submit.prevent>
            <div>
              <label for="general-alarm" class="form-label mb-1">Alarma</label>
              <input
                id="general-alarm"
                v-model="alarmTime"
                type="time"
                class="form-control"
                min="00:00"
                max="23:59"
                inputmode="numeric"
              />
              <div class="form-text">Formato 24 horas (hh:mm).</div>
            </div>

            <div class="d-grid">
              <button type="button" class="btn btn-outline-secondary" @click="openPrivacy">
                Politica de privacidad
              </button>
            </div>
          </form>
        </div>
      </div>

      <div v-else key="general-privacy">
        <div class="card-body">
          <button
            type="button"
            class="btn btn-link text-decoration-none ps-0 mb-3"
            @click="closePrivacy"
          >
            &larr; Ajustes generales
          </button>
          <h2 class="h5 mb-3">Politica de privacidad</h2>
          <p class="text-muted mb-3">
            Esta es una politica de privacidad generica utilizada como marcador de posicion. Aqui se describe como se recopila,
            utiliza y protege la informacion personal de los usuarios de la aplicacion.
          </p>
          <p class="text-muted mb-0">
            Al utilizar la aplicacion, aceptas estas condiciones. Actualiza este texto cuando dispongas del contenido definitivo
            proporcionado por el equipo legal o de cumplimiento.
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'panel:set-title', title: string): void
  (e: 'panel:register-back', handler: (() => void) | null): void
}>()

const view = ref<'main' | 'privacy'>('main')
const alarmTime = ref('08:00')

function closePrivacy() {
  view.value = 'main'
}

function openPrivacy() {
  view.value = 'privacy'
}

watch(
  view,
  (next) => {
    if (next === 'main') {
      emit('panel:set-title', 'Ajustes generales')
      emit('panel:register-back', () => emit('back'))
    } else {
      emit('panel:set-title', 'Politica de privacidad')
      emit('panel:register-back', closePrivacy)
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.card-body {
  min-height: 220px;
}
</style>
