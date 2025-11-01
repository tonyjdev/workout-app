import { createApp } from 'vue'
import App from './App.vue'
import router from './router'


// Bootstrap CSS + JS (bundle incluye Popper para tooltips, dropdowns, etc.)
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'

createApp(App)
  .use(router)
  .mount('#app')
