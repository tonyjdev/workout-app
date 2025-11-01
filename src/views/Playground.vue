<template>
  <div class="container py-4">
    <h1 class="h4 mb-4">Playground de componentes</h1>

    <section class="mb-5">
      <h2 class="h6 mb-3">Botones</h2>
      <BaseButton class="me-2" variant="primary">Primary</BaseButton>
      <BaseButton class="me-2" variant="secondary">Secondary</BaseButton>
      <BaseButton class="me-2" variant="success">Success</BaseButton>
      <BaseButton class="me-2" variant="danger" :disabled="true">Disabled</BaseButton>
    </section>

    <section class="mb-5">
      <h2 class="h6 mb-3">Modal</h2>
      <BaseButton variant="primary" @click="open = true">Abrir modal</BaseButton>
      <BaseModal v-model="open">
        <template #title>Ejemplo de modal</template>
        <p>Este es un ejemplo básico de modal con Vue + Bootstrap.</p>
      </BaseModal>
    </section>

    <section class="mb-5">
      <h2 class="h6 mb-3">Alertas</h2>
      <BaseAlert variant="success">¡Operación realizada con éxito!</BaseAlert>
      <BaseAlert variant="danger">Error al guardar los datos.</BaseAlert>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const open = ref(false)
</script>
