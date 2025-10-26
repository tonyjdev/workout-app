<template>
  <ion-page>
    <ion-content class="ion-padding">
      <ion-segment v-model="selected">
        <ion-segment-button value="exercises">
          <ion-label>Ejercicios</ion-label>
        </ion-segment-button>
        <ion-segment-button value="muscles">
          <ion-label>Músculos</ion-label>
        </ion-segment-button>
        <ion-segment-button value="equipment">
          <ion-label>Equipamiento</ion-label>
        </ion-segment-button>
      </ion-segment>

      <div v-if="selected === 'exercises'">
        <ion-accordion-group>
          <template v-for="ex in exercises" :key="ex.exercise_id">
            <ion-accordion :value="ex.exercise_id">
              <ion-item slot="header" color="light">
                <ion-label>{{ ex.name }}</ion-label>
              </ion-item>

              <ion-content class="ion-padding" slot="content">
                <p><strong>Descripción:</strong> {{ ex.description }}</p>
                <!--
                <p><strong>Dificultad:</strong> {{ ex.difficulty }}</p>
                <p><strong>Equipamiento:</strong> {{ (ex.equipment || []).join(', ') }}</p>
                <p><strong>Músculos:</strong> {{ (ex.primary_muscles || []).join(', ') }}</p>
                <p><strong>Etiquetas:</strong> {{ (ex.tags || []).join(', ') }}</p>
                -->

                <div v-if="ex.media?.images?.length">
                  <strong>Imágenes:</strong>
                  <div class="images">
                    <img
                      v-for="img in ex.media.images"
                      :key="img"
                      :src="img"
                      alt="Imagen del ejercicio"
                      style="max-width: 100%; margin-bottom: 8px;"
                    />
                  </div>
                </div>

                <div v-if="ex.media?.videos?.length">
                  <strong>Videos:</strong>
                  <ul>
                    <li v-for="vid in ex.media.videos" :key="vid">
                      <a :href="vid" target="_blank">{{ vid }}</a>
                    </li>
                  </ul>
                </div>
              </ion-content>
            </ion-accordion>
          </template>
        </ion-accordion-group>
      </div>


      <div v-else class="ion-padding ion-text-center">
        <p>(Aún no disponible)</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonSegment, IonSegmentButton, IonLabel,
  IonAccordionGroup, IonAccordion, IonItem
} from '@ionic/vue';
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useExercisesStore } from '@/stores/exercisesStore';

const selected = ref('exercises');
const store = useExercisesStore();
const { exercises, isLoaded } = storeToRefs(store);

onMounted(() => {
  if (!isLoaded.value) store.fetchExercises();
});
</script>
