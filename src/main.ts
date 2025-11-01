
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

// Bootstrap CSS + JS (bundle incluye Popper para tooltips, dropdowns, etc.)
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'

(async () => {
  const app = createApp(App)
  app.use(router)

  if (Capacitor.isNativePlatform()) {
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setStyle({ style: Style.Dark })
  }

  // 🔧 DEV: limpia SW y Cache Storage (evita "pantallas viejas" por caché)
  if (import.meta.env.DEV) {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }

      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
    } catch (e) {
      console.warn('No se pudo limpiar cache/SW en DEV:', e);
    }
  }

  await router.isReady()

  app.mount('#app')
  console.log('App version:', import.meta.env.VITE_APP_VERSION);
})()
