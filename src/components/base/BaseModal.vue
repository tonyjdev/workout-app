<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  titleId?: string
  size?: 'sm'|'lg'|'xl'|null
  staticBackdrop?: boolean
}>(), { titleId: 'modal-title', size: null, staticBackdrop: false })

const emit = defineEmits<{(e:'update:modelValue', v:boolean):void}>()
const dialogRef = ref<HTMLDivElement|null>(null)
let lastActive: Element | null = null

function open() {
  lastActive = document.activeElement
  document.documentElement.style.overflow = 'hidden'
  nextTick(() => dialogRef.value?.focus())
}
function close() {
  if (props.staticBackdrop) return
  emit('update:modelValue', false)
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  // foco cíclico (MVP): si Tab sale del modal, vuelve a él
  if (e.key === 'Tab' && dialogRef.value) {
    const focusables = dialogRef.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusables.length) { e.preventDefault(); return }
    const first = focusables[0], last = focusables[focusables.length - 1]
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  }
}

watch(() => props.modelValue, (v) => v ? open() : restore())
function restore() {
  document.documentElement.style.overflow = ''
  if (lastActive instanceof HTMLElement) lastActive.focus()
}

onBeforeUnmount(restore)
</script>

<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      class="modal fade show d-block"
      style="background: rgba(0,0,0,.5)"
      @click.self="!staticBackdrop && close()"
    >
      <div
        class="modal-dialog"
        :class="size ? `modal-${size}` : ''"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="props.titleId"
      >
        <div class="modal-content" ref="dialogRef" tabindex="-1" @keydown="onKeydown">
          <div class="modal-header">
            <h5 class="modal-title" :id="props.titleId"><slot name="title">Título</slot></h5>
            <button type="button" class="btn-close" aria-label="Cerrar" @click="close()"></button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div class="modal-footer">
            <slot name="footer">
              <button class="btn btn-secondary" @click="close()">Cerrar</button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>
