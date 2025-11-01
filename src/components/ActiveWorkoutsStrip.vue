<template>
  <div class="active-strip" role="list">
    <article
      v-for="w in itemsComputed"
      :key="w.id"
      class="workout-card card text-white"
      role="listitem"
    >
      <!-- Fondo con imagen: item.imageUrl o fallback SVG neutro -->
      <div
        class="bg"
        :style="{ backgroundImage: `url('${w.imageUrl || fallbackBg}')` }"
        aria-hidden="true"
      ></div>
      <div class="scrim" aria-hidden="true"></div>

      <!-- Contenido -->
      <div class="card-body content">
        <!-- Título + papelera -->
        <div class="d-flex align-items-start justify-content-between mb-2">
          <h3 class="h6 mb-0 text-truncate text-shadow">{{ w.title }}</h3>
          <button
            type="button"
            class="btn btn-sm btn-outline-light btn-icon"
            :title="`Quitar '${w.title}' de activos`"
            @click="$emit('remove', w.id)"
          >
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>

        <!-- Meta -->
        <div class="d-flex flex-wrap gap-2 small mb-2">
          <span class="badge bg-light text-dark fw-semibold">
            <i class="bi bi-clock me-1"></i> ≈ {{ w.estimatedMinutes }} min
          </span>
          <span class="badge bg-light text-dark fw-semibold text-shadow">
            <i class="bi bi-calendar2-check me-1"></i> Día {{ w.dayNumber }}
          </span>
        </div>

        <!-- Progreso -->
        <div class="mb-2">
          <div class="progress" style="height: 12px;">
            <div
              class="progress-bar bg-success progress-bar-striped progress-bar-animated"
              role="progressbar"
              :style="{ width: w.progress + '%' }"
              :aria-valuenow="w.progress"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          <div class="d-flex justify-content-between mt-1 small">
            <span class="text-shadow">Progreso</span>
            <span class="fw-semibold text-shadow">{{ w.progress }}%</span>
          </div>
        </div>

        <!-- CTA: 20% / 80% -->
        <div class="cta-grid mt-auto">
          <button
            type="button"
            class="btn btn-warning btn-sm fw-semibold"
            @click="$emit('restart', w.id)"
            :title="`Reiniciar '${w.title}'`"
          >
            <i class="bi bi-arrow-counterclockwise me-1"></i>
          </button>

          <button
            type="button"
            class="btn btn-start-light btn-sm fw-semibold p-2"
            @click="$emit('start', w.id)"
          >
            <i class="bi bi-play-fill me-1"></i>
            Start
          </button>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ActiveWorkout = {
  id: string | number
  title: string
  imageUrl?: string
  estimatedMinutes: number
  dayNumber: number
  totalDays?: number
  progress?: number
}

const props = defineProps<{ items: ActiveWorkout[] }>()
defineEmits<{
  (e: 'start', id: ActiveWorkout['id']): void
  (e: 'remove', id: ActiveWorkout['id']): void
  (e: 'restart', id: ActiveWorkout['id']): void
}>()

/** Imagen fallback (SVG tonos medios, neutros) */
const fallbackBg =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#7a8596'/>
      <stop offset='100%' stop-color='#525d6b'/>
    </linearGradient>
    <pattern id='p' width='40' height='40' patternUnits='userSpaceOnUse' patternTransform='rotate(15)'>
      <rect width='40' height='40' fill='url(#g)'/>
      <circle cx='20' cy='20' r='2' fill='rgba(255,255,255,0.12)'/>
    </pattern>
  </defs>
  <rect width='1200' height='800' fill='url(#p)'/>
</svg>`)

/** Normalización de items (progress si falta) */
const itemsComputed = computed(() =>
  (props.items ?? []).map(w => {
    let progress = typeof w.progress === 'number'
      ? w.progress
      : (w.totalDays ? Math.round((Math.max(0, w.dayNumber - 1) / w.totalDays) * 100) : 0)
    progress = Math.max(0, Math.min(100, progress))
    return { ...w, progress }
  })
)
</script>

<style scoped>
.active-strip {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 6px 2px 2px;
  -webkit-overflow-scrolling: touch;
}

.workout-card {
  position: relative;
  width: 280px;                      /* un pelín más ancho */
  min-height: 190px;
  border: 0;
  border-radius: 16px;
  overflow: hidden;
  flex: 0 0 auto;
  background: #0f172a;
}

/* Fondo con imagen de tonos medios */
.workout-card .bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  filter: brightness(0.62) saturate(0.95);     /* atenuado */
}

.workout-card .scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.20) 55%, rgba(0,0,0,0.40) 100%);
}

/* Contenido */
.workout-card .content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  text-shadow: 0 1px 2px rgba(0,0,0,.55);
  padding: 12px;
}
.text-shadow { text-shadow: 0 1px 2px rgba(0,0,0,.55); }

.btn-icon {
  --bs-btn-padding-y: .15rem;
  --bs-btn-padding-x: .35rem;
  --bs-btn-border-radius: .5rem;
  backdrop-filter: blur(2px);
}

/* Progreso */
.progress { background-color: rgba(255,255,255,0.25); }
.progress-bar { transition: width .3s ease; }

/* CTA grid: 20% / 80% */
.cta-grid {
  display: grid;
  grid-template-columns: 1fr 4fr;   /* 20% / 80% */
  gap: .5rem;
}

/* Botón Start: fondo claro y texto negro */
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
