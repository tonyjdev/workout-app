// src/services/deviceTesting.ts
import { Capacitor } from '@capacitor/core'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { LocalNotifications } from '@capacitor/local-notifications'

type PermissionState = 'prompt' | 'prompt-with-rationale' | 'denied' | 'granted'

export interface KeepScreenAwakeResult {
  success: boolean
  isEnabled: boolean
  error?: string
}

export interface TestNotificationResult {
  success: boolean
  error?: string
}

let keepAwakeSupportedCache: boolean | null = null
let keepAwakeEnabledCache: boolean | null = null

let notificationPermissionCache: PermissionState | null = null
let notificationChannelPrepared = false

async function detectKeepAwakeSupport(): Promise<boolean> {
  if (keepAwakeSupportedCache !== null) {
    return keepAwakeSupportedCache
  }

  if (Capacitor.getPlatform() === 'web') {
    keepAwakeSupportedCache = false
    return keepAwakeSupportedCache
  }

  try {
    const { isSupported } = await KeepAwake.isSupported()
    keepAwakeSupportedCache = isSupported
  } catch (error) {
    console.warn('[deviceTesting] No se pudo comprobar KeepAwake.isSupported()', error)
    keepAwakeSupportedCache = false
  }

  return keepAwakeSupportedCache
}

async function refreshKeepAwakeState(): Promise<boolean> {
  if (!(await detectKeepAwakeSupport())) {
    keepAwakeEnabledCache = false
    return keepAwakeEnabledCache
  }

  try {
    const { isKeptAwake } = await KeepAwake.isKeptAwake()
    keepAwakeEnabledCache = isKeptAwake
  } catch (error) {
    console.warn('[deviceTesting] No se pudo comprobar KeepAwake.isKeptAwake()', error)
    keepAwakeEnabledCache = false
  }

  return keepAwakeEnabledCache
}

export async function isKeepScreenAwakeSupported(): Promise<boolean> {
  return detectKeepAwakeSupport()
}

export async function getKeepScreenAwakeState(): Promise<boolean> {
  if (keepAwakeEnabledCache !== null) {
    return keepAwakeEnabledCache
  }

  return refreshKeepAwakeState()
}

export async function setKeepScreenAwake(enabled: boolean): Promise<KeepScreenAwakeResult> {
  const supported = await detectKeepAwakeSupport()
  if (!supported) {
    keepAwakeEnabledCache = false
    return {
      success: false,
      isEnabled: false,
      error: 'El dispositivo no permite mantener la pantalla encendida desde la app.'
    }
  }

  try {
    if (enabled) {
      await KeepAwake.keepAwake()
    } else {
      await KeepAwake.allowSleep()
    }
  } catch (error) {
    console.warn('[deviceTesting] Error al cambiar el estado de KeepAwake', error)
    const currentState = await refreshKeepAwakeState()
    return {
      success: false,
      isEnabled: currentState,
      error: 'No se pudo actualizar el estado de la pantalla. Intentalo de nuevo.'
    }
  }

  const newState = await refreshKeepAwakeState()
  return {
    success: newState === enabled,
    isEnabled: newState,
    error: newState === enabled
      ? undefined
      : 'No se pudo confirmar el estado de la pantalla. Comprueba manualmente el dispositivo.'
  }
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (notificationPermissionCache === 'granted') {
    return true
  }

  try {
    const { display } = await LocalNotifications.checkPermissions()
    notificationPermissionCache = display as PermissionState
  } catch (error) {
    console.warn('[deviceTesting] No se pudo comprobar los permisos de notificaciones', error)
    notificationPermissionCache = 'denied'
  }

  if (notificationPermissionCache === 'granted') {
    return true
  }

  try {
    const result = await LocalNotifications.requestPermissions()
    notificationPermissionCache = result.display as PermissionState
  } catch (error) {
    console.warn('[deviceTesting] No se pudo solicitar permisos de notificaciones', error)
    notificationPermissionCache = 'denied'
  }

  return notificationPermissionCache === 'granted'
}

async function ensureNotificationChannel(): Promise<void> {
  if (notificationChannelPrepared || Capacitor.getPlatform() !== 'android') {
    notificationChannelPrepared = true
    return
  }

  try {
    await LocalNotifications.createChannel({
      id: 'testing',
      name: 'Testing',
      description: 'Canal para notificaciones de prueba',
      importance: 3
    })
    notificationChannelPrepared = true
  } catch (error) {
    console.warn('[deviceTesting] No se pudo crear el canal de notificaciones de prueba', error)
  }
}

export async function sendTestNotification(
  options: { title?: string; body?: string } = {}
): Promise<TestNotificationResult> {
  const platform = Capacitor.getPlatform()
  if (platform === 'web') {
    return {
      success: false,
      error: 'Las notificaciones locales solo estan disponibles en aplicaciones instaladas.'
    }
  }

  const hasPermission = await ensureNotificationPermission()
  if (!hasPermission) {
    return {
      success: false,
      error: 'No se otorgaron permisos de notificaciones en el dispositivo.'
    }
  }

  await ensureNotificationChannel()

  const title = options.title ?? 'Notificacion de prueba'
  const body = options.body ?? 'Esta es una notificacion generada desde la seccion de Testing.'

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now() % 2147483647,
          title,
          body,
          schedule: { at: new Date(Date.now() + 1000) },
          channelId: platform === 'android' ? 'testing' : undefined
        }
      ]
    })

    return { success: true }
  } catch (error) {
    console.warn('[deviceTesting] Error al programar notificacion de prueba', error)
    return {
      success: false,
      error: 'No se pudo enviar la notificacion en el dispositivo.'
    }
  }
}
