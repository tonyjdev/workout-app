<template>
  <ion-page>
    <!-- Header global con iconos -->
    <ion-header>
      <ion-toolbar>
        <ion-title>Workout</ion-title>

        <ion-buttons slot="end">
          <!-- Info -->
          <ion-button router-direction="forward" :router-link="routes.info">
            <ion-icon aria-hidden="true" name="information-circle-outline" />
          </ion-button>

          <!-- Ajustes -->
          <ion-button router-direction="forward" :router-link="routes.settings">
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
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonIcon, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonLabel
} from '@ionic/vue';

const routes = {
  settings: '/tabs/settings',
  info: '/tabs/info',
};
</script>
