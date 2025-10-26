<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" />
        </ion-buttons>
        <ion-title>Lab (Testing)</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" fullscreen>
      <ion-list inset>
        <ion-item>
          <ion-label>Keep Awake</ion-label>
          <ion-toggle :checked="isAwake" @ionChange="toggleKeepAwake" />
        </ion-item>

        <ion-item button detail @click="notifyNow">
          <ion-label>Notificación local</ion-label>
        </ion-item>
      </ion-list>

      <ion-note class="ion-margin-top">
        En web estos botones no hacen nada (Capacitor corre sólo en nativo).
      </ion-note>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonToggle, IonNote
} from "@ionic/vue";
import { useNative } from "@/composables/useNative";

const { isAwake, toggleKeepAwake, notifyNow } = useNative();
</script>
