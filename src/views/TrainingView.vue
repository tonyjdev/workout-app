<script setup lang="ts">
import WeekStrip from '@/components/WeekStrip.vue'

type DayStatus = 'due' | 'completed' | 'rest' | 'missed' | 'none'

// demo: alterna estados por día de la semana (0..6)
const demoStatus: DayStatus[] = ['due','completed','rest','missed','none','due','completed']

function getDayStatus(iso: string): DayStatus {
  const d = new Date(iso)
  return demoStatus[d.getDay()]
}

function onSelectDay(p: { date: string, status: DayStatus }) {
  console.log('Día seleccionado:', p)
}
</script>

<template>
  <section class="py-3">
    <h1 class="h5 mb-3">Pantalla de Entrenamiento</h1>
    <WeekStrip :get-day-status="getDayStatus" :show-legend="true" @select="onSelectDay" />
  </section>
</template>
