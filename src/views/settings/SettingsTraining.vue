<!-- src/views/settings/SettingsTraining.vue -->
<template>
  <div class="container py-3">
    <BackHeader title="Configuracion de entrenamiento" @back="emit('back')" />
    <div class="card">
      <div class="card-body">
        <p class="text-muted mb-0">Sin contenido todavia.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BackHeader from '@/components/BackHeader.vue'

const emit = defineEmits<{ (e: 'back'): void }>()
</script>

