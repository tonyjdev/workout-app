<template>
  <nav class="navbar navbar-dark bg-dark px-3 py-2 fixed-top topbar-fixed">
    <div class="d-flex align-items-center w-100 justify-content-between">
      <div class="d-flex align-items-center">
        <button
          v-if="showBack"
          class="btn btn-dark me-2"
          @click="$router.back()"
        >
          <i class="bi bi-arrow-left"></i>
        </button>
        <h1 class="h6 mb-0 text-white">{{ title }}</h1>
      </div>
      <div class="d-flex align-items-center">
        <button class="btn btn-dark me-2" @click="$emit('toggleOffcanvas', 'catalog')">
          <i class="bi bi-list"></i>
        </button>
        <button class="btn btn-dark me-2" @click="$emit('toggleOffcanvas', 'help')">
          <i class="bi bi-question-circle"></i>
        </button>
        <button class="btn btn-dark" @click="$emit('toggleOffcanvas', 'settings')">
          <i class="bi bi-gear"></i>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineProps<{ title: string, showBack?: boolean }>()
</script>

<style scoped>
nav {
  height: 56px;
  z-index: 1050;
}
</style>
