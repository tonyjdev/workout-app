// src/stores/exercisesStore.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useExercisesStore = defineStore('exercises', () => {
  const exercises = ref<any[]>([]);
  const meta = ref({});
  const isLoaded = ref(false);

  async function fetchExercises() {
    if (isLoaded.value) return; // evita recargar
    try {
      const response = await fetch('http://workout-api.test/api/exercises');
      const data = await response.json();
      exercises.value = data.exercises || data || [];
      meta.value = data.meta || {};
      isLoaded.value = true;
    } catch (err) {
      console.error('Error cargando ejercicios:', err);
    }
  }

  return { exercises, meta, isLoaded, fetchExercises };
});
