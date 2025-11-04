<template>
  <div class="auth-screen">
    <Transition name="auth-slide" mode="out-in" appear>
      <div class="auth-modal" key="forgot">
        <div class="auth-modal-inner card shadow-lg border-0">
          <div class="auth-modal-body card-body p-4">
            <h1 class="h4 text-center mb-3">Recuperar contrasena</h1>
            <p class="text-muted text-center mb-4">
              Introduce tu correo electronico y te enviaremos un enlace para restablecer tu contrasena.
            </p>

            <div v-if="statusMessage" class="alert alert-success py-2">
              {{ statusMessage }}
            </div>
            <div v-if="feedback" class="alert alert-danger py-2">
              {{ feedback }}
            </div>

            <form autocomplete="on" novalidate @submit.prevent="handleSubmit">
              <div class="mb-4">
                <label for="forgot-email" class="form-label">Correo electronico</label>
                <input
                  id="forgot-email"
                  v-model="email"
                  type="email"
                  class="form-control"
                  :class="{ 'is-invalid': fieldError('email') }"
                  placeholder="tu-correo@ejemplo.com"
                  required
                />
                <div v-if="fieldError('email')" class="invalid-feedback">
                  {{ fieldError('email') }}
                </div>
              </div>

              <div class="d-grid gap-3">
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                  <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status" />
                  Enviar enlace
                </button>
                <RouterLink :to="{ name: 'login' }" class="btn btn-outline-secondary">
                  Volver a iniciar sesion
                </RouterLink>
              </div>
            </form>
          </div>
          <div class="auth-modal-footer text-center py-3">
            <span class="auth-note small">
              Si no recibes el correo revisa tu carpeta de spam o vuelve a intentarlo en unos minutos.
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

type FormErrors = Record<string, string[]>

const auth = useAuthStore()

const email = ref('')
const errors = reactive<FormErrors>({})
const feedback = ref<string | null>(null)
const statusMessage = ref<string | null>(null)
const submitting = ref(false)

function resetState() {
  Object.keys(errors).forEach(key => delete errors[key])
  feedback.value = null
  statusMessage.value = null
}

function fieldError(field: string) {
  return errors[field]?.[0] ?? null
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }
  submitting.value = true
  resetState()

  const result = await auth.requestPasswordReset(email.value)

  submitting.value = false

  if (result.success) {
    statusMessage.value = result.status ?? result.message ?? 'Te enviamos un enlace para continuar.'
    return
  }

  const nextErrors = result.errors ?? {}
  Object.assign(errors, nextErrors)
  if (result.message) {
    feedback.value = result.message
  }
}
</script>

<style scoped>
.auth-screen {
  min-height: 100vh;
  padding: 2rem 1rem;
  background: linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.75)), url('/splash-bg.jpg') center/cover no-repeat fixed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-modal {
  width: min(420px, calc(100% - 2rem));
  max-height: calc(100vh - 3rem);
  display: flex;
  flex-direction: column;
}

.auth-modal-inner {
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
}

.auth-modal-body {
  flex: 1;
  overflow-y: auto;
}

.auth-note {
  color: rgba(255, 255, 255, 0.72);
}

.auth-modal-footer {
  background: rgba(15, 23, 42, 0.6);
  color: rgba(255, 255, 255, 0.85);
}

@media (min-width: 992px) {
  .auth-screen {
    padding: 4rem 1rem;
  }
  .auth-modal {
    width: 420px;
  }
}
</style>
