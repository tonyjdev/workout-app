<template>
  <div class="week-grid">
    <!-- Fila 1: L-J -->
    <div class="row g-2 mb-2">
      <div v-for="d in firstRow" :key="d.key" class="col-3">
        <button
          type="button"
          class="w-100 day-cal btn p-0"
          :class="colorClass(d)"
          :title="d.aria"
          @click="onSelect(d)"
        >
          <div class="cal">
            <div class="cal-head"></div>
            <div class="cal-rings">
              <span></span><span></span>
            </div>
            <div class="cal-body">
              <div class="cal-date">{{ d.short }}</div>
              <i :class="iconClass(d)" class="cal-icon"></i>
            </div>

            <!-- aro de HOY -->
            <div v-if="d.isToday" class="cal-today-ring"></div>
          </div>
          <span class="visually-hidden">{{ d.aria }}</span>
        </button>
      </div>
    </div>

    <!-- Fila 2: V-D + Trofeo -->
    <div class="row g-2">
      <div v-for="d in secondRow" :key="d.key" class="col-3">
        <button
          type="button"
          class="w-100 day-cal btn p-0"
          :class="colorClass(d)"
          :title="d.aria"
          @click="onSelect(d)"
        >
          <div class="cal">
            <div class="cal-head"></div>
            <div class="cal-rings">
              <span></span><span></span>
            </div>
            <div class="cal-body">
              <div class="cal-date">{{ d.short }}</div>
              <i :class="iconClass(d)" class="cal-icon"></i>
            </div>
            <div v-if="d.isToday" class="cal-today-ring"></div>
          </div>
          <span class="visually-hidden">{{ d.aria }}</span>
        </button>
      </div>

      <!-- Trofeo: ocupa enteramente la “hoja” -->
      <div class="col-3">
        <div class="w-100 day-cal btn p-0 c-gray-light">
          <div class="cal cal-trophy">
            <div class="cal-body only-icon">
              <i class="bi bi-trophy-fill cal-icon trophy-icon"></i>
            </div>
          </div>
          <span class="visually-hidden">Trofeo semanal</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type DayStatus = 'due' | 'completed' | 'rest' | 'missed' | 'none'

const props = defineProps<{
  getDayStatus?: (isoDate: string) => DayStatus
  currentDate?: Date | string
}>()

const emit = defineEmits<{
  (e: 'select', payload: { date: string; status: DayStatus }): void
}>()

// -------- fechas
function toDate(x?: Date | string): Date { return x ? new Date(x) : new Date() }
function startOfISOWeek(d: Date): Date {
  const day = d.getDay() || 7
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (day - 1))
  return start
}
function addDays(d: Date, n: number): Date { const nd = new Date(d); nd.setDate(d.getDate() + n); return nd }
function isSameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fmtISO(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}
function fmtShort(d: Date): string {
  let s = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  s = s.replace('.', '')
  return s.replace(/-(\p{L})/u, (_m, c: string) => `-${c.toUpperCase()}`)
}
function labelStatus(s: DayStatus): string {
  switch (s) { case 'due': return 'toca entrenar'
    case 'completed': return 'entrenamiento completado'
    case 'rest': return 'día de descanso'
    case 'missed': return 'entrenamiento no realizado'
    default: return 'sin estado' }
}

type DayItem = {
  key: string; date: string; short: string;
  status: DayStatus; isToday: boolean; isFuture: boolean; aria: string
}

const week = computed<DayItem[]>(() => {
  const today = toDate(props.currentDate)
  const start = startOfISOWeek(today)
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(start, i)
    const iso = fmtISO(d)
    const status: DayStatus = props.getDayStatus ? props.getDayStatus(iso) : 'none'
    const isToday = isSameYMD(d, today)
    const isFuture = d > today && !isToday
    const short = fmtShort(d)
    const aria = `${short}: ${labelStatus(status)}${isToday ? ' (hoy)' : ''}`
    return { key: iso, date: iso, short, status, isToday, isFuture, aria }
  })
})

const firstRow = computed(() => week.value.slice(0, 4)) // L-J
const secondRow = computed(() => week.value.slice(4, 7)) // V-D

// -------- iconos / color
function iconClass(d: DayItem): string[] {
  if (d.status === 'completed') return ['bi', 'bi-check-circle-fill']
  if (d.status === 'missed')    return ['bi', 'bi-x-circle-fill']
  if (d.status === 'rest')      return ['bi', 'bi-moon-stars']
  if (d.status === 'due')       return d.isFuture ? ['bi', 'bi-circle'] : ['bi', 'bi-dumbbell']
  return ['bi', 'bi-circle']
}
function colorClass(d: DayItem): string {
  if (d.status === 'completed') return 'c-green'
  if (d.status === 'missed')    return 'c-red'
  if (d.status === 'rest')      return 'c-gray'
  if (d.status === 'due')       return d.isFuture ? 'c-gray-light' : 'c-blue'
  return 'c-gray-mid'
}
function onSelect(d: DayItem) { emit('select', { date: d.date, status: d.status }) }
</script>

<style scoped>
/* Contenedor “hoja de calendario” */
.cal {
  position: relative;
  height: 90px;                 /* ↑ más alto para respirar */
  border-radius: .9rem;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,.25), 0 6px 14px rgba(0,0,0,.18);
  background: #fff;
}

/* Cabecera roja */
.cal-head {
  height: 30%;                   /* franja superior (roja) */
  background: #ef4444;
}

/* Anillas (simuladas con pseudo-elementos) */
.cal-rings {
  position: absolute; inset: 0;
  display: flex; justify-content: space-between;
  padding: 6px 18px; pointer-events: none;
}
.cal-rings span {
  width: 16px; height: 16px; border-radius: 50%;
  background: #111; box-shadow: inset 0 0 0 4px #ef4444;
  position: relative;
}
.cal-rings span::after {
  content: ""; position: absolute; inset: 4px;
  border-radius: 50%; background: #fff; opacity: .9;
}

/* Cuerpo blanco */
.cal-body {
  position: absolute; left: 0; right: 0; top: 25%; bottom: 0;
  display: grid; place-items: center;
  padding: .6rem .5rem;          /* ↑ más padding */
  color: #111;
}
.cal-body.only-icon { grid-template-rows: 1fr; }

/* Fecha corta (sin letra del día) */
.cal-date {
  font-weight: 700;
  font-size: .95rem;
  letter-spacing: .2px;
}

/* Icono */
.cal-icon {
  font-size: 1.5rem;             /* más grande */
  line-height: 1;
}

/* Aro de HOY: borde exterior del color activo */
.cal-today-ring {
  position: absolute; inset: -3px;
  border-radius: 1rem;
  box-shadow: 0 0 0 2px currentColor;
  pointer-events: none;
}

/* Paletas (afectan a icono y aro de HOY por currentColor) */
.c-blue       { color: #2563eb !important; }  /* due hoy */
.c-green      { color: #16a34a !important; }  /* completed */
.c-red        { color: #dc2626 !important; }  /* missed */
.c-gray       { color: #6b7280 !important; }  /* rest */
.c-gray-light { color: #cbd5e1 !important; }  /* due futuro */
.c-gray-mid   { color: #9ca3af !important; }  /* none */

/* Trofeo: ocupa toda la hoja, sin fecha */
.cal.cal-trophy .cal-body.only-icon {
  padding: 0;
  top: 5% !important;
}
.trophy-icon {
  font-size: 2rem;               /* un poco más grande */
  color: #d97706;                /* oro tostado */
}
</style>
