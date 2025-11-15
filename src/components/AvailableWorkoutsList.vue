<template>
  <section class="px-3 available-list" role="list">
    <article
      v-for="w in itemsComputed"
      :key="w.id"
      class="workout-card card text-white"
      role="listitem"
    >
      <!-- Fondo -->
      <div
        class="bg"
        :style="{ backgroundImage: `url('${w.imageUrl || fallbackBg}')` }"
        aria-hidden="true"
      ></div>
      <div class="scrim" aria-hidden="true"></div>

      <!-- Contenido -->
      <div class="card-body content">
        <div class="d-flex align-items-start justify-content-between">
          <h3 class="h5 mb-1 text-shadow me-2">{{ w.title }}</h3>
        </div>

        <p class="mb-3 small text-shadow opacity-90">
          <i class="bi bi-calendar-range me-1"></i>{{ w.days }} días
          <span class="mx-2">•</span>
          <i class="bi bi-clock me-1"></i>≈ {{ w.minutesPerDay }} min/día
        </p>

        <div class="mt-auto d-flex justify-content-end">
          <button
            type="button"
            class="btn btn-start-light btn-sm fw-semibold"
            :title="`Empezar '${w.title}'`"
            @click="$emit('start', w.id)"
          >
            Empezar <i class="bi bi-arrow-right-short ms-1"></i>
          </button>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type AvailableWorkout = {
  id: string | number
  title: string
  days: number
  minutesPerDay: number
  imageUrl?: string
}

const props = defineProps<{ items: AvailableWorkout[] }>()
defineEmits<{ (e: 'start', id: AvailableWorkout['id']): void }>()

/** Fondo neutro (SVG tonos medios) si no se pasa imageUrl */
const fallbackBg =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 600'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#7a8596'/>
      <stop offset='100%' stop-color='#525d6b'/>
    </linearGradient>
    <pattern id='p' width='48' height='48' patternUnits='userSpaceOnUse' patternTransform='rotate(12)'>
      <rect width='48' height='48' fill='url(#g)'/>
      <path d='M0 24H48 M24 0V48' stroke='rgba(255,255,255,0.08)' stroke-width='1'/>
    </pattern>
  </defs>
  <rect width='1200' height='600' fill='url(#p)'/>
</svg>`)

/** Normalización (por si luego añadimos campos opcionales) */
const itemsComputed = computed(() => props.items ?? [])
</script>

<style scoped>
.available-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Card vertical */
.workout-card {
  position: relative;
  min-height: 160px;
  border: 0;
  border-radius: 16px;
  overflow: hidden;
  background: #0f172a;
}

/* Fondo con imagen */
.workout-card .bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  filter: brightness(0.62) saturate(0.95);
}

/* Oscurecedor suave para legibilidad */
.workout-card .scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0.58) 100%);
}

/* Contenido */
.workout-card .content {
  position: relative; z-index: 1;
  display: flex; flex-direction: column;
  height: 100%;
  padding: 14px;
  text-shadow: 0 1px 2px rgba(0,0,0,.55);
}
.text-shadow { text-shadow: 0 1px 2px rgba(0,0,0,.55); }

/* Botón “Empezar” estilo claro (como en los activos) */
.btn-start-light {
  background-color: #f8fafc;        /* gris muy claro */
  color: #111 !important;
  border-color: rgba(0,0,0,.08);
}
.btn-start-light:hover {
  background-color: #eef2f7;
  color: #000 !important;
}
</style>
