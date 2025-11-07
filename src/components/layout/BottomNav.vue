<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="navbar bg-light border-top fixed-bottom bottomnav-fixed">
    <div class="container-fluid d-flex justify-content-around">
      <RouterLink class="nav-link text-center" :to="{ name: 'training' }" title="Entrenar">
        <i class="bi bi-play-circle fs-5"></i>
        <div class="small">Entrenar</div>
      </RouterLink>
      <RouterLink class="nav-link text-center" :to="{ name: 'stats' }" title="Estadísticas">
        <i class="bi bi-graph-up fs-5"></i>
        <div class="small">Estadísticas</div>
      </RouterLink>
      <RouterLink class="nav-link text-center" :to="{ name: 'achievements' }" title="Logros">
        <i class="bi bi-trophy fs-5"></i>
        <div class="small">Logros</div>
      </RouterLink>
      <RouterLink class="nav-link text-center" :to="{ name: 'customize' }" title="Personalizar">
        <i class="bi bi-person-gear fs-5"></i>
        <div class="small">Personalizar</div>
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.nav-link {
  color: #6c757d;
}
.router-link-active {
  color: #0d6efd;
}
</style>
