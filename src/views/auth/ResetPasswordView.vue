<template>
  <div class="auth-screen">
    <div class="auth-modal">
      <div class="auth-modal-inner card shadow-lg border-0">
        <div class="auth-modal-body card-body p-4">
          <h1 class="h4 text-center mb-3">Restablecer contrasena</h1>

          <div v-if="!token" class="alert alert-warning py-2">
            El enlace de restablecimiento es invalido o ha caducado. Solicita uno nuevo.
          </div>

          <div v-if="feedback" :class="['alert', feedbackClass, 'py-2']">
            {{ feedback }}
          </div>

          <form autocomplete="off" novalidate @submit.prevent="handleSubmit">
            <div class="mb-3">
              <label for="reset-email" class="form-label">Correo electronico</label>
              <input
                id="reset-email"
                v-model="form.email"
                type="email"
                class="form-control"
                :class="{ 'is-invalid': fieldError('email') }"
                placeholder="tu-correo@ejemplo.com"
                required
                :readonly="!!prefilledEmail"
              />
              <div v-if="fieldError('email')" class="invalid-feedback">
                {{ fieldError('email') }}
              </div>
            </div>

            <div class="mb-3">
              <label for="reset-password" class="form-label">Nueva contrasena</label>
              <input
                id="reset-password"
                v-model="form.password"
                type="password"
                class="form-control"
                :class="{ 'is-invalid': fieldError('password') }"
                placeholder="Minimo 8 caracteres"
                required
              />
              <div v-if="fieldError('password')" class="invalid-feedback">
                {{ fieldError('password') }}
              </div>
            </div>

            <div class="mb-4">
              <label for="reset-password-confirmation" class="form-label">Confirmar contrasena</label>
              <input
                id="reset-password-confirmation"
                v-model="form.password_confirmation"
                type="password"
                class="form-control"
                :class="{ 'is-invalid': fieldError('password_confirmation') }"
                placeholder="Repite la contrasena"
                required
              />
              <div v-if="fieldError('password_confirmation')" class="invalid-feedback">
                {{ fieldError('password_confirmation') }}
              </div>
            </div>

            <div class="d-grid gap-3">
              <button type="submit" class="btn btn-primary" :disabled="submitting || !token">
                <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status" />
                Guardar nueva contrasena
              </button>
              <RouterLink :to="{ name: 'login' }" class="btn btn-outline-secondary">
                Volver al inicio de sesion
              </RouterLink>
            </div>
          </form>
        </div>
        <div class="auth-modal-footer text-center py-3">
          <span class="auth-note small">
            Manten tu cuenta segura utilizando una contrasena unica y dificil de adivinar.
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

type FormErrors = Record<string, string[]>

const props = defineProps<{
  token?: string
  email?: string
}>()

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const prefilledEmail = computed(() => props.email ?? (typeof route.query.email === 'string' ? route.query.email : ''))

const token = computed(() => props.token ?? (typeof route.query.token === 'string' ? route.query.token : ''))

const form = reactive({
  email: prefilledEmail.value,
  password: '',
  password_confirmation: '',
})

const submitting = ref(false)
const feedback = ref<string | null>(null)
const feedbackClass = ref<'alert-success' | 'alert-danger'>('alert-success')
const errors = ref<FormErrors>({})

watchEffect(() => {
  if (prefilledEmail.value) {
    form.email = prefilledEmail.value
  }
})

function resetErrors() {
  errors.value = {}
  feedback.value = null
  feedbackClass.value = 'alert-success'
}

function fieldError(field: string) {
  return errors.value[field]?.[0] ?? null
}

async function handleSubmit() {
  if (submitting.value || !token.value) {
    return
  }
  submitting.value = true
  resetErrors()

  const result = await auth.resetPassword({
    token: token.value,
    email: form.email,
    password: form.password,
    password_confirmation: form.password_confirmation,
  })

  submitting.value = false

  if (result.success) {
    feedbackClass.value = 'alert-success'
    feedback.value = result.message ?? 'Tu contrasena ha sido actualizada.'
    await auth.init(true)
    await router.replace({ name: 'login' })
    return
  }

  errors.value = result.errors ?? {}
  feedbackClass.value = 'alert-danger'
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
  width: min(440px, calc(100% - 2rem));
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
    width: 440px;
  }
}
</style>
