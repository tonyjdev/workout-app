<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Ajustes</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content fullscreen>
            <ion-list inset>
                <ion-item button detail :router-link="{ name: 'settings-about' }">
                    <ion-label>About</ion-label>
                </ion-item>

                <!-- Aquí irán más apartados de ajustes en el futuro -->
            </ion-list>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import {
    IonPage, IonHeader, IonToolbar, IonTitle,
    IonContent, IonList, IonItem, IonLabel
} from "@ionic/vue";
</script>
