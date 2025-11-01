<template>
  <nav class="navbar bg-light border-top fixed-bottom bottomnav-fixed">
    <div class="container-fluid d-flex justify-content-around">
      <RouterLink class="nav-link text-center" to="/" title="Entrenar">
        <i class="bi bi-play-circle fs-5"></i>
        <div class="small">Entrenar</div>
      </RouterLink>
      <RouterLink class="nav-link text-center" to="/stats" title="Estadísticas">
        <i class="bi bi-graph-up fs-5"></i>
        <div class="small">Estadísticas</div>
      </RouterLink>
      <RouterLink class="nav-link text-center" to="/achievements" title="Logros">
        <i class="bi bi-trophy fs-5"></i>
        <div class="small">Logros</div>
      </RouterLink>
      <RouterLink class="nav-link text-center" to="/customize" title="Personalizar">
        <i class="bi bi-person-gear fs-5"></i>
        <div class="small">Personalizar</div>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
</script>

<style scoped>
nav {
  height: 64px;
  z-index: 1050;
}
.nav-link {
  color: #6c757d;
}
.router-link-active {
  color: #0d6efd;
}
</style>
