<template>
  <div class="week-strip" role="list">
    <button
      v-for="item in week"
      :key="item.key"
      class="day"
      :class="[
        `st-${item.status}`,
        { today: item.isToday }
      ]"
      role="listitem"
      @click="handleSelect(item.date)"
      :aria-pressed="item.isToday ? 'true' : 'false'"
      :title="item.aria"
    >
      <span class="dow">{{ item.dow }}</span>
      <span class="date">{{ item.short }}</span>
      <span class="dot" aria-hidden="true"></span>
      <span class="sr-only">{{ item.aria }}</span>
    </button>
  </div>

  <!-- (Opcional) Leyenda compacta -->
  <div class="legend">
    <span><i class="dot lg st-due"></i> Toca entrenar</span>
    <span><i class="dot lg st-completed"></i> Completado</span>
    <span><i class="dot lg st-rest"></i> Descanso</span>
    <span><i class="dot lg st-missed"></i> No realizado</span>
    <span><i class="dot lg st-none"></i> Sin estado</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type DayStatus = 'due' | 'completed' | 'rest' | 'missed' | 'none'

const props = defineProps<{
  /**
   * Función que devuelve el estado para una fecha (YYYY-MM-DD).
   * Si no se proporciona, todo irá a 'none'.
   */
  getDayStatus?: (isoDate: string) => DayStatus
  /**
   * Fecha de referencia; por defecto, hoy (según dispositivo).
   */
  currentDate?: Date
}>()

const emit = defineEmits<{
  (e: 'select', payload: { date: string, status: DayStatus }): void
}>()

// Utilidades de fecha (sin librerías)
function toLocalDate(d?: Date): Date {
  return d ? new Date(d) : new Date()
}

function startOfISOWeek(d: Date): Date {
  const day = d.getDay() || 7 // domingo=0 → 7
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  // restar (day-1) días para llegar al lunes
  start.setDate(start.getDate() - (day - 1))
  return start
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d)
  nd.setDate(d.getDate() + n)
  return nd
}

function fmtISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtShort(d: Date): string {
  // 01-nov → 01-Nov
  let s = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  s = s.replace('.', '') // algunos navegadores ponen punto tras mes abreviado
  // capitalizar primera letra del mes
  return s.replace(/-(\p{L})/u, (_m, c: string) => `-${c.toUpperCase()}`)
}

function fmtDOW(d: Date): string {
  // L, M, X, J, V, S, D
  const map = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] // getDay(): 0..6
  return map[d.getDay()]
}

function isSameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

const week = computed(() => {
  const today = toLocalDate(props.currentDate)
  const start = startOfISOWeek(today)

  return Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(start, i)
    const iso = fmtISO(date)
    const status: DayStatus = props.getDayStatus ? props.getDayStatus(iso) : 'none'
    const short = fmtShort(date) // 01-Nov
    const dow = fmtDOW(date)
    const isToday = isSameYMD(date, today)
    const aria = `${dow} ${short}: ${labelStatus(status)}${isToday ? ' (hoy)' : ''}`

    return {
      key: iso,
      date: iso,
      short,
      dow,
      status,
      isToday,
      aria
    }
  })
})

function labelStatus(s: DayStatus): string {
  switch (s) {
    case 'due': return 'toca entrenar'
    case 'completed': return 'entrenamiento completado'
    case 'rest': return 'día de descanso'
    case 'missed': return 'entrenamiento no realizado'
    default: return 'sin estado'
  }
}

function handleSelect(isoDate: string) {
  const found = week.value.find(w => w.date === isoDate)
  if (!found) return
  emit('select', { date: found.date, status: found.status })
}
</script>

<style scoped>
.week-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 4px;
  -webkit-overflow-scrolling: touch;
}

.day {
  --bg: #1f2937;      /* base (gris oscuro) */
  --fg: #e5e7eb;      /* texto (gris claro) */
  --ring: transparent;

  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  min-width: 68px;
  padding: 10px 8px;
  border-radius: 12px;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  position: relative;
  outline: none;
  transition: transform .05s ease, box-shadow .15s ease, border-color .15s ease;
}

.day .dow {
  font-size: 0.75rem;
  opacity: 0.8;
  line-height: 1;
}

.day .date {
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;
  margin-top: 2px;
}

.day .dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-top: 8px;
  background: currentColor;
  opacity: 0.9;
}

/* Estados (colores del “dot” y acentos del card) */
.day.st-due      { --accent: #3b82f6; }  /* azul */
.day.st-completed{ --accent: #22c55e; }  /* verde */
.day.st-rest     { --accent: #9ca3af; }  /* gris */
.day.st-missed   { --accent: #ef4444; }  /* rojo */
.day.st-none     { --accent: #6b7280; }  /* gris medio */

.day.st-due .dot,
.day.st-completed .dot,
.day.st-rest .dot,
.day.st-missed .dot,
.day.st-none .dot {
  color: var(--accent);
}

/* Hoy: anillo */
.day.today {
  box-shadow:
    0 0 0 2px rgba(255,255,255,0.05) inset,
    0 0 0 2px var(--accent);
  border-color: var(--accent);
}

/* Hover / active */
.day:active {
  transform: scale(0.98);
}

/* Leyenda */
.legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  padding: 6px 6px 0;
  font-size: 0.85rem;
  color: #cbd5e1;
  user-select: none;
}

.legend .dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  vertical-align: -1px;
  margin-right: 6px;
}
.legend .lg { width: 12px; height: 12px; }

.legend .st-due      { background: #3b82f6; }
.legend .st-completed{ background: #22c55e; }
.legend .st-rest     { background: #9ca3af; }
.legend .st-missed   { background: #ef4444; }
.legend .st-none     { background: #6b7280; }

/* Accesibilidad */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
</style>
