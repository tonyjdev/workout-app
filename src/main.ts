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
    await StatusBar.setOverlaysWebView({ overlay: false }) // ← clave
    // opcional: tema de la barra
    await StatusBar.setStyle({ style: Style.Dark })
  }

  await router.isReady()

  // Si entras por '/', muestra splash antes de montar
  if (router.currentRoute.value.path === '/') {
    await router.replace('/splash')
  }

  app.mount('#app')
})()
