<template>
  <ion-page>
    <!-- Header global -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start" v-if="showBack">
          <!-- Vuelve al root de la tab activa si no hay historial -->
          <ion-back-button :default-href="activeTabRoot" />
        </ion-buttons>

        <ion-title>{{ currentTitle }}</ion-title>

        <ion-buttons slot="end" v-if="!showBack">
          <!-- Info (ocúltalo si YA estás en /tabs/info) -->
          <ion-button v-if="route.path !== routes.info" router-direction="forward" :router-link="routes.info">
            <ion-icon aria-hidden="true" name="information-circle-outline" />
          </ion-button>

          <!-- Ajustes (ocúltalo si YA estás en /tabs/settings o subpantallas) -->
          <ion-button
            v-if="!route.path.startsWith(routes.settings)"
            router-direction="forward"
            :router-link="routes.settings"
          >
            <ion-icon aria-hidden="true" name="settings-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="train" href="/tabs/train" router-direction="root">
          <ion-icon aria-hidden="true" name="barbell-outline" />
          <ion-label>Entrenar</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="achievements" href="/tabs/achievements" router-direction="root">
          <ion-icon aria-hidden="true" name="trophy-outline" />
          <ion-label>Logros</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="me" href="/tabs/me" router-direction="root">
          <ion-icon aria-hidden="true" name="person-circle-outline" />
          <ion-label>Yo</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle,
  IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel, IonButton
} from '@ionic/vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const routes = {
  train: '/tabs/train',
  achievements: '/tabs/achievements',
  me: '/tabs/me',
  settings: '/tabs/settings',
  info: '/tabs/info',
};

const tabRoots = [routes.train, routes.achievements, routes.me];

// ¿Estamos en una subpantalla? (no root de tab)
const showBack = computed(() => !tabRoots.includes(route.path));

// Root de la tab “actual” para default-href del back
const activeTabRoot = computed(() => {
  if (route.path.startsWith('/tabs/achievements')) return routes.achievements;
  if (route.path.startsWith('/tabs/me'))           return routes.me;
  return routes.train; // por defecto
});

// Título dinámico según ruta
const currentTitle = computed(() => {
  if (route.path.startsWith('/tabs/achievements')) return 'Logros';
  if (route.path.startsWith('/tabs/me'))           return 'Yo';
  if (route.path.startsWith('/tabs/info'))         return 'Información';
  if (route.path.startsWith('/tabs/settings/lab'))   return 'Lab';
  if (route.path.startsWith('/tabs/settings/about')) return 'About';
  if (route.path.startsWith('/tabs/settings'))       return 'Ajustes';
  return 'Entrenar';
});
</script>
