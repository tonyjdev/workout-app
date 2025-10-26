// src/composables/useNative.ts
import { Capacitor } from "@capacitor/core";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { LocalNotifications } from "@capacitor/local-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { ref } from "vue";

export function useNative() {
    const isNative = Capacitor.isNativePlatform();
    const isAwake = ref(false);

    async function enableKeepAwake() {
        if (!isNative) return;
        await KeepAwake.keepAwake();
        isAwake.value = true;
    }

    async function disableKeepAwake() {
        if (!isNative) return;
        await KeepAwake.allowSleep();
        isAwake.value = false;
    }

    async function toggleKeepAwake() {
        if (isAwake.value) return disableKeepAwake();
        return enableKeepAwake();
    }

    // Permisos y demo de notificación
    async function requestLocalNotificationPerms() {
        if (!isNative) return true;
        const perms = await LocalNotifications.checkPermissions();
        if (perms.display === "granted") return true;
        const req = await LocalNotifications.requestPermissions();
        return req.display === "granted";
    }
    async function notifyNow() {
        const granted = await requestLocalNotificationPerms();
        if (!granted) return;
        await LocalNotifications.schedule({
            notifications: [{
                id: Date.now() % 2147483647,
                title: "¡Hora de entrenar!",
                body: "Tu sesión está lista 💪",
                schedule: { at: new Date(Date.now() + 500) },
                smallIcon: "ic_stat_icon",
            }],
        });
    }

    // Llamar una vez al inicio de la app
    async function applyStatusBarDefaults() {
        if (!isNative) return;
        // Importante: mantenerla visible y SIN overlay
        await StatusBar.setOverlaysWebView({ overlay: false });
        // Estilo legible (ajústalo según tema claro/oscuro de tu app)
        await StatusBar.setStyle({ style: Style.Dark });
        // (Opcional Android) color de fondo a juego con tu primary
        // Nota: setBackgroundColor es Android-only
        try {
            await StatusBar.setBackgroundColor({ color: "#5b8def" });
        } catch (_) { /* empty */ }
    }

    return {
        isNative,
        isAwake,
        toggleKeepAwake,
        enableKeepAwake,
        disableKeepAwake,
        notifyNow,
        applyStatusBarDefaults,
    };
}
