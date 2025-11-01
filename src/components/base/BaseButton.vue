<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: string
  size?: 'sm' | 'lg' | null
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'primary',
  size: null,
  disabled: false,
  type: 'button'
})
</script>

<template>
  <button
    :class="['btn', `btn-${props.variant}`, props.size ? `btn-${props.size}` : '']"
    :disabled="props.disabled"
    :type="props.type"
  >
    <slot />
  </button>
</template>
