<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-buttons slot="start">
                    <!-- Muestra automáticamente “atrás” si hay una vista anterior en el stack -->
                  <ion-back-button default-href="/tabs/settings"></ion-back-button>
                </ion-buttons>
                <ion-title>About</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding" fullscreen>
            <ion-list inset>
                <ion-item>
                    <ion-label>
                        <h2>Nombre</h2>
                        <p>{{ appInfo.name || "—" }}</p>
                    </ion-label>
                </ion-item>
                <ion-item>
                    <ion-label>
                        <h2>App ID</h2>
                        <p>{{ appInfo.id || "—" }}</p>
                    </ion-label>
                </ion-item>
                <ion-item>
                    <ion-label>
                        <h2>Versión</h2>
                        <p>{{ appInfo.version || "—" }}</p>
                    </ion-label>
                </ion-item>
                <ion-item v-if="appInfo.build">
                    <ion-label>
                        <h2>Build</h2>
                        <p>{{ appInfo.build }}</p>
                    </ion-label>
                </ion-item>
            </ion-list>

            <ion-list inset class="ion-margin-top">
                <ion-item lines="none">
                    <ion-label>
                        <h2>Créditos</h2>
                        <p>Desarrollo: TonyJDev</p>
                        <p>UI: Ionic Framework · Vue 3</p>
                    </ion-label>
                </ion-item>
            </ion-list>
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonBackButton, IonList, IonItem, IonLabel
} from "@ionic/vue";
import { App } from "@capacitor/app";
import { onMounted, reactive } from "vue";

type AppInfo = { name?: string; id?: string; version?: string; build?: string; };
const appInfo = reactive<AppInfo>({});

onMounted(async () => {
    try {
        const info = await App.getInfo();
        appInfo.name = info.name;
        appInfo.id = info.id;
        appInfo.version = info.version;
        appInfo.build = info.build;
    } catch {
        // En web puede no devolver datos; no pasa nada.
    }
});
</script>
