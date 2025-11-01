<template>
  <div
    class="offcanvas offcanvas-end fullscreen-offcanvas"
    tabindex="-1"
    ref="offcanvasEl"
    aria-labelledby="offcanvasLabel"
  >
    <!-- Barra superior del panel -->
    <div class="offcanvas-header bg-dark text-white py-2 px-3 d-flex align-items-center">
      <h5 id="offcanvasLabel" class="mb-0 flex-fill">{{ title }}</h5>
      <button
        type="button"
        class="btn btn-dark d-flex align-items-center justify-content-center"
        @click="close"
        aria-label="Cerrar"
      >
        <i class="bi bi-x-lg fs-6"></i>
      </button>
    </div>

    <!-- Contenido dinámico -->
    <div class="offcanvas-body p-3">
      <component :is="currentComponent" />
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref } from 'vue'
import { Offcanvas } from 'bootstrap'

// vistas parciales
import CatalogView from '@/views/partials/CatalogView.vue'
import HelpView from '@/views/partials/HelpView.vue'
import SettingsView from '@/views/partials/SettingsView.vue'

// refs
const offcanvasEl = ref<HTMLElement | null>(null)
const instance = ref<Offcanvas | null>(null)
const title = ref('Catálogo de ejercicios')
const currentComponent = ref<any>(null)

const panels = {
  catalog: { component: CatalogView, title: 'Catálogo de ejercicios' },
  help: { component: HelpView, title: 'Ayuda' },
  settings: { component: SettingsView, title: 'Configuración' },
} as const

type PanelKey = keyof typeof panels

function open(panel: PanelKey) {
  const data = panels[panel] ?? panels.catalog
  title.value = data.title
  currentComponent.value = data.component

  if (!instance.value && offcanvasEl.value) {
    instance.value = new Offcanvas(offcanvasEl.value)
  }
  instance.value?.show()
}

function close() {
  instance.value?.hide()
}

defineExpose({ open, close })
</script>

<style scoped>
/* Hacer que ocupe toda la pantalla */
.fullscreen-offcanvas {
  width: 100vw !important;
  max-width: 100vw !important;
  height: 100vh;
  top: 0 !important;
  bottom: 0 !important;
  z-index: 2000; /* por encima de TopBar y BottomNav */
}

/* Oculta el borde redondeado del offcanvas */
.fullscreen-offcanvas.offcanvas {
  border-radius: 0 !important;
  border: none;
}

/* Forzar fondo blanco o personalizado */
.offcanvas-body {
  background-color: #fff;
}

/* Barra superior del panel */
.offcanvas-header {
  height: 56px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.fullscreen-offcanvas.offcanvas {
  transform: translateX(100%);
  transition: transform 0.25s ease-in-out;
}
</style>
