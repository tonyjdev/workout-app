<script setup lang="ts">
import WeekStrip from '@/components/WeekStrip.vue'
import ActiveWorkoutsStrip from '@/components/ActiveWorkoutsStrip.vue'
import AvailableWorkoutsList from '@/components/AvailableWorkoutsList.vue'


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

const activos = [
  {
    id: 1,
    title: 'Full Body 28d',
    imageUrl: '/images/workouts/workout-001.jpeg',
    estimatedMinutes: 42,
    dayNumber: 15,
    totalDays: 28,        // progress se calcula si no lo pasas
  },
  {
    id: 2,
    title: 'Piernas Power',
    imageUrl: '/images/workouts/workout-002.jpeg',
    estimatedMinutes: 35,
    dayNumber: 3,
    totalDays: 14,
    // progress: 20,      // opcional: si lo pasas, respeta este valor
  },
]
function handleStart(id:number){ console.log('start', id) }
function handleRemove(id:number){ console.log('remove', id) }

// ================================
const disponibles = [
  {
    id: 'w1',
    title: 'Full Body 42d',
    days: 28,
    minutesPerDay: 40,
    imageUrl: '/images/workouts/workout-003.jpeg', // (public/images/workouts/..)
  },
  {
    id: 'w2',
    title: 'Piernas Power',
    days: 14,
    minutesPerDay: 35,
    imageUrl: '/images/workouts/workout-004.jpeg',
  },
  {
    id: 'w3',
    title: 'Core & Mobility',
    days: 21,
    minutesPerDay: 25,
    imageUrl: '/images/workouts/workout-006.jpeg',
    // sin imageUrl → usa fallback neutro
  },
]

function onStart(id: string) {
  console.log('Empezar/Activar plan:', id)
  // aquí luego activarás el plan y lo moverás a “activos”
}

</script>

<template>
  <section class="py-3">
    <h1 class="h5 mb-3">Pantalla de Entrenamiento</h1>
    <WeekStrip :get-day-status="getDayStatus" :show-legend="true" @select="onSelectDay" />
  </section>

  <ActiveWorkoutsStrip
    :items="activos"
    @start="handleStart"
    @remove="handleRemove"
  />

  <AvailableWorkoutsList :items="disponibles" @start="onStart" />

</template>
