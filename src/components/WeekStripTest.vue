<template>
  <div class="week-strip" role="list">
    <button
      v-for="item in week"
      :key="item.key"
      class="day"
      :class="[`st-${item.status}`, { today: item.isToday }]"
    >
      <span class="dow">{{ item.dow }}</span>
      <span class="date">{{ item.short }}</span>
      <span class="dot" aria-hidden="true"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Utilidades mínimas
function startOfISOWeek(d: Date): Date {
  const day = d.getDay() || 7
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (day - 1))
  return start
}
function addDays(d: Date, n: number): Date {
  const nd = new Date(d); nd.setDate(d.getDate() + n); return nd
}
function fmtShort(d: Date): string {
  let s = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  return s.replace('.', '').replace(/-(\p{L})/u, (_m, c: string) => `-${c.toUpperCase()}`)
}
function fmtDOW(d: Date): string {
  const map = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  return map[d.getDay()]
}
function isSameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

const week = computed(() => {
  const today = new Date()
  const start = startOfISOWeek(today)
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(start, i)
    const isToday = isSameYMD(d, today)
    // Estados de prueba para que se vea color:
    const statuses = ['due', 'completed', 'rest', 'missed', 'none', 'due', 'completed'] as const
    const status = statuses[i]
    return {
      key: d.toISOString().slice(0,10),
      short: fmtShort(d),
      dow: fmtDOW(d),
      isToday,
      status
    }
  })
})
</script>

<style scoped>
.week-strip { display:flex; gap:8px; overflow-x:auto; padding:8px 4px; }
.day {
  --bg:#1f2937; --fg:#e5e7eb; display:inline-flex; flex-direction:column; align-items:center;
  min-width:68px; padding:10px 8px; border-radius:12px; background:var(--bg); color:var(--fg);
  border:1px solid rgba(255,255,255,0.08);
}
.day .dow{ font-size:.75rem; opacity:.8; line-height:1; }
.day .date{ font-weight:700; font-size:.95rem; line-height:1.2; margin-top:2px; }
.day .dot{ width:8px; height:8px; border-radius:999px; margin-top:8px; background:currentColor; }

/* Colores de estado */
.day.st-due{ color:#3b82f6; }
.day.st-completed{ color:#22c55e; }
.day.st-rest{ color:#9ca3af; }
.day.st-missed{ color:#ef4444; }
.day.st-none{ color:#6b7280; }

/* Hoy */
.day.today { outline:2px solid currentColor; }
</style>
