/**
 * Utilidades para consumir la API REST del backend y adjuntar autenticación/cabeceras.
 */
const DEFAULT_API_BASE = 'http://localhost:8000'

/**
 * Normaliza la URL base garantizando que no termina con una barra duplicada.
 */
function normalizeBaseUrl(baseUrl: string | undefined) {
  if (!baseUrl) {
    return DEFAULT_API_BASE
  }
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL)

let bearerToken: string | null = null

/**
 * Permite actualizar el token Bearer que se inyecta automáticamente en las peticiones.
 */
export function setAuthToken(token: string | null) {
  bearerToken = token
}

type ApiFetchOptions = RequestInit & {
  rawResponse?: boolean
  skipApiPrefix?: boolean
  omitCredentials?: boolean
}

/**
 * Envuelve a `fetch` agregando cabeceras comunes, prefijos y manejo de token/CSRF.
 */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { rawResponse, skipApiPrefix, omitCredentials, ...init } = options
  const isAbsoluteUrl = /^https?:\/\//i.test(path)
  const normalizedPath = isAbsoluteUrl ? path : path.startsWith('/') ? path : `/${path}`
  const isSanctumRequest = !isAbsoluteUrl && normalizedPath.startsWith('/sanctum/')
  const hasApiPrefix = !isAbsoluteUrl && normalizedPath.startsWith('/api/')
  const shouldSkipApiPrefix = skipApiPrefix || isSanctumRequest || hasApiPrefix
  const url = isAbsoluteUrl
    ? normalizedPath
    : `${API_BASE_URL}${shouldSkipApiPrefix ? normalizedPath : `/api${normalizedPath}`}`

  const headers = new Headers(init.headers ?? {})
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  const isJsonPayload = init.body && !(init.body instanceof FormData)
  if (isJsonPayload && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (!isSanctumRequest && !headers.has('Authorization') && bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`)
  }

  if (!isSanctumRequest && !headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest')
  }

  if (!isSanctumRequest && !headers.has('X-XSRF-TOKEN') && typeof document !== 'undefined') {
    const match = document.cookie.split('; ').find((row) => row.startsWith('XSRF-TOKEN='))
    if (match) {
      const [, value] = match.split('=')
      headers.set('X-XSRF-TOKEN', decodeURIComponent(value))
    }
  }

  const credentials = init.credentials ?? (omitCredentials ? 'omit' : 'include')

  const response = await fetch(url, {
    ...init,
    headers,
    credentials,
  })

  if (rawResponse) {
    return response as unknown as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  const hasJson = contentType.includes('application/json')
  if (hasJson) {
    return (await response.json()) as T
  }

  const text = await response.text()
  return text as unknown as T
}

/**
 * Ejecuta `apiFetch` pero conserva la Response original y parsea el JSON si está presente.
 */
export async function fetchWithJsonResponse(path: string, options: ApiFetchOptions = {}) {
  const response = await apiFetch<Response>(path, { ...options, rawResponse: true })
  const contentType = response.headers.get('content-type') ?? ''
  const hasJson = contentType.includes('application/json')
  if (!hasJson) {
    return { response, data: null }
  }
  const data = await response.json()
  return { response, data }
}
