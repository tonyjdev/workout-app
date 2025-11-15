/**
 * Store de autenticación que centraliza el estado del usuario y las acciones
 * necesarias para hablar con la API (login, registro y recuperación de contraseñas).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchWithJsonResponse, setAuthToken } from '@/services/api'

type User = {
  id: number
  name: string
  email: string
  [key: string]: unknown
} | null

type CredentialsPayload = {
  email: string
  password: string
  remember?: boolean
}

type RegisterPayload = {
  name: string
  email: string
  password: string
  password_confirmation: string
}

type ResetPasswordPayload = {
  email: string
  token: string
  password: string
  password_confirmation: string
}

type AuthResult = {
  success: boolean
  message?: string
  errors?: Record<string, string[]>
}

type PasswordResetResult = AuthResult & { status?: string }

/**
 * Instancia el store de autenticación y expone el estado, getters y acciones.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User>(null)
  const status = ref<'idle' | 'checking' | 'authenticated' | 'guest'>('idle')
  const initialized = ref(false)
  const pending = ref(false)
  const token = ref<string | null>(null)

  if (typeof window !== 'undefined') {
    const storedToken = window.localStorage.getItem('auth_token')
    if (storedToken) {
      token.value = storedToken
      setAuthToken(storedToken)
    }
  }

  /**
   * Mantiene sincronizado el token con el header global, el estado y el almacenamiento local.
   */
  function updateToken(value: string | null) {
    token.value = value
    setAuthToken(value)
    if (typeof window === 'undefined') {
      return
    }
    if (value) {
      window.localStorage.setItem('auth_token', value)
    } else {
      window.localStorage.removeItem('auth_token')
    }
  }

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isChecking = computed(() => status.value === 'checking')

  /**
   * Consulta el endpoint de usuario actual y actualiza el estado del store con la respuesta.
   */
  async function fetchUser() {
    if (!token.value) {
      user.value = null
      status.value = 'guest'
      return false
    }
    try {
      const { response, data } = await fetchWithJsonResponse('/api/user', {
        method: 'GET',
        omitCredentials: true,
      })
      if (response.ok) {
        user.value = (data ?? null) as User
        status.value = 'authenticated'
        return true
      }
      if (response.status === 401) {
        updateToken(null)
        user.value = null
        status.value = 'guest'
        return false
      }
      user.value = null
      status.value = 'guest'
      return false
    } catch {
      user.value = null
      status.value = 'guest'
      return false
    }
  }

  /**
   * Arranca el store determinando si ya hay sesión válida y evita inicializaciones redundantes.
   */
  async function init(force = false) {
    if (initialized.value && !force) {
      return
    }
    if (token.value) {
      status.value = 'checking'
      await fetchUser()
      if (status.value === 'checking') {
        status.value = 'guest'
      }
    } else {
      status.value = 'guest'
    }
    initialized.value = true
  }

  /**
   * Unifica la forma de retornar mensajes de error independientemente del backend.
   */
  function normalizeError(data: any, fallback: string): AuthResult {
    if (!data) {
      return { success: false, message: fallback }
    }
    const errors = data.errors as Record<string, string[]> | undefined
    const message = data.message as string | undefined
    return {
      success: false,
      message: message ?? fallback,
      errors,
    }
  }

  /**
   * Envía las credenciales del usuario a la API y gestiona el estado tras iniciar sesión.
   * Usa autenticación por token, por lo que omite credenciales/cookies en la petición.
   */
  async function login(payload: CredentialsPayload): Promise<AuthResult> {
    pending.value = true
    try {
      const deviceName = typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'web'
      const { response, data } = await fetchWithJsonResponse('/auth/login', {
        method: 'POST',
        omitCredentials: true,
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          device_name: deviceName,
        }),
      })
      if (response.ok) {
        const accessToken = typeof (data as any)?.token === 'string' ? ((data as any).token as string) : null
        if (accessToken) {
          updateToken(accessToken)
        }
        const userData = (data as any)?.user
        if (userData) {
          user.value = userData as User
          status.value = 'authenticated'
        } else {
          await fetchUser()
        }
        return { success: true }
      }
      if (response.status === 422 || response.status === 401) {
        return normalizeError(data, 'Revisa los datos e intentalo de nuevo.')
      }
      return normalizeError(data, 'No se pudo iniciar sesion. Intentalo mas tarde.')
    } catch {
      return {
        success: false,
        message: 'No se pudo contactar con el servidor.',
      }
    } finally {
      pending.value = false
    }
  }

  /**
   * Cierra la sesión actual eliminando el token y notificando al backend.
   */
  async function logout(): Promise<void> {
    pending.value = true
    try {
      await fetchWithJsonResponse('/logout', { method: 'POST', omitCredentials: true })
    } finally {
      updateToken(null)
      user.value = null
      status.value = 'guest'
      pending.value = false
    }
  }

  /**
   * Registra un nuevo usuario y, si tiene éxito, carga el estado autenticado en la app.
   */
  async function register(payload: RegisterPayload): Promise<AuthResult> {
    pending.value = true
    try {
      const { response, data } = await fetchWithJsonResponse('/auth/register', {
        method: 'POST',
        omitCredentials: true,
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        const accessToken = typeof (data as any)?.token === 'string' ? ((data as any).token as string) : null
        if (accessToken) {
          updateToken(accessToken)
        }
        const userData = (data as any)?.user
        if (userData) {
          user.value = userData as User
          status.value = 'authenticated'
        } else {
          await fetchUser()
        }
        return { success: true }
      }
      if (response.status === 422) {
        return normalizeError(data, 'Revisa los campos del formulario.')
      }
      return normalizeError(data, 'No se pudo completar el registro.')
    } catch {
      return {
        success: false,
        message: 'No se pudo contactar con el servidor.',
      }
    } finally {
      pending.value = false
    }
  }

  /**
   * Solicita el correo con instrucciones para restablecer la contraseña del usuario.
   */
  async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
    pending.value = true
    try {
      const { response, data } = await fetchWithJsonResponse('/auth/forgot-password', {
        method: 'POST',
        omitCredentials: true,
        body: JSON.stringify({ email }),
      })
      if (response.ok) {
        const statusMessage = (data?.status as string | undefined) ?? 'Te hemos enviado un enlace para restablecer la contrasena.'
        return { success: true, status: statusMessage, message: statusMessage }
      }
      if (response.status === 422) {
        return normalizeError(data, 'Revisa el correo electronico e intentalo de nuevo.')
      }
      return normalizeError(data, 'No se pudo procesar la solicitud.')
    } catch {
      return {
        success: false,
        message: 'No se pudo contactar con el servidor.',
      }
    } finally {
      pending.value = false
    }
  }

  /**
   * Envía el token de restablecimiento y la nueva contraseña para cerrar el proceso.
   */
  async function resetPassword(payload: ResetPasswordPayload): Promise<AuthResult> {
    pending.value = true
    try {
      const { response, data } = await fetchWithJsonResponse('/auth/reset-password', {
        method: 'POST',
        omitCredentials: true,
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        return {
          success: true,
          message: (data?.status as string | undefined) ?? 'Tu contrasena se actualizo correctamente.',
        }
      }
      if (response.status === 422) {
        return normalizeError(data, 'Revisa los datos del formulario.')
      }
      return normalizeError(data, 'No se pudo restablecer la contrasena.')
    } catch {
      return {
        success: false,
        message: 'No se pudo contactar con el servidor.',
      }
    } finally {
      pending.value = false
    }
  }

  return {
    user,
    token,
    status,
    pending,
    initialized,
    isAuthenticated,
    isChecking,
    init,
    login,
    logout,
    register,
    requestPasswordReset,
    resetPassword,
  }
})
