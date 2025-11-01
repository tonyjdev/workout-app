<script setup lang="ts">
const props = withDefaults(defineProps<{ variant?: string }>(), {
  variant: 'primary'
})
</script>

<template>
  <div :class="['alert', `alert-${props.variant}`]" role="alert">
    <slot />
  </div>
</template>
