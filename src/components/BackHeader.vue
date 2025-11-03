<!-- src/components/BackHeader.vue -->
<template>
  <div class="d-flex align-items-center gap-2 mb-3">
    <button
      type="button"
      class="btn btn-link p-0 text-decoration-none d-flex align-items-center"
      @click="handleBack"
      aria-label="Volver"
    >
      <span aria-hidden="true" class="me-2">&larr;</span>
      <span class="fw-semibold">{{ backText }}</span>
    </button>
    <h1 class="h5 m-0">{{ title }}</h1>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  backLabel?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'back'): void }>()

const backText = computed(() => props.backLabel ?? 'Atras')

function handleBack() {
  emit('back')
}
</script>

