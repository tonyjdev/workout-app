<template>
  <div class="auth-screen">
    <Transition name="auth-slide" mode="out-in" appear>
      <div class="auth-modal" key="login">
        <div class="auth-modal-inner card shadow-lg border-0">
          <div class="auth-modal-body card-body p-4">
            <h1 class="h4 text-center mb-3">Iniciar sesion</h1>
            <p class="text-muted text-center mb-4">
              Accede a tu cuenta para continuar con tus entrenamientos.
            </p>

            <div v-if="feedback" class="alert alert-danger py-2">
              {{ feedback }}
            </div>

            <form autocomplete="on" novalidate @submit.prevent="handleSubmit">
              <div class="mb-3">
                <label for="login-email" class="form-label">Correo electronico</label>
                <input
                  id="login-email"
                  v-model="form.email"
                  type="email"
                  class="form-control"
                  :class="{ 'is-invalid': fieldError('email') }"
                  placeholder="tu-correo@ejemplo.com"
                  required
                  autofocus
                />
                <div v-if="fieldError('email')" class="invalid-feedback">
                  {{ fieldError('email') }}
                </div>
              </div>

              <div class="mb-3">
                <label for="login-password" class="form-label">Contrasena</label>
                <input
                  id="login-password"
                  v-model="form.password"
                  type="password"
                  class="form-control"
                  :class="{ 'is-invalid': fieldError('password') }"
                  placeholder="********"
                  required
                />
                <div v-if="fieldError('password')" class="invalid-feedback">
                  {{ fieldError('password') }}
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="form-check">
                  <input id="login-remember" v-model="form.remember" type="checkbox" class="form-check-input" />
                  <label class="form-check-label" for="login-remember">Mantener sesion iniciada</label>
                </div>

                <RouterLink :to="{ name: 'forgot-password' }" class="small">
                  Olvidaste la contrasena?
                </RouterLink>
              </div>

              <div class="d-grid gap-3">
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                  <span v-if="submitting" class="spinner-border spinner-border-sm me-2" role="status" />
                  Entrar
                </button>
                <RouterLink :to="{ name: 'register' }" class="btn btn-outline-secondary">
                  Crear nueva cuenta
                </RouterLink>
              </div>
            </form>
          </div>
          <div class="auth-modal-footer text-center py-3">
            <span class="auth-note small">Protegemos tu informacion usando Laravel Sanctum.</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

type FormErrors = Record<string, string[]>

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  email: '',
  password: '',
  remember: false,
})

const errors = ref<FormErrors>({})
const feedback = ref<string | null>(null)
const submitting = ref(false)

function resetErrors() {
  errors.value = {}
  feedback.value = null
}

function fieldError(field: string) {
  return errors.value[field]?.[0] ?? null
}

function redirectTarget() {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.trim().length > 0) {
    return redirect
  }
  return '/training'
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }
  submitting.value = true
  resetErrors()

  const result = await auth.login({
    email: form.email,
    password: form.password,
    remember: form.remember,
  })

  submitting.value = false

  if (result.success) {
    await router.replace(redirectTarget())
    return
  }

  errors.value = result.errors ?? {}
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
