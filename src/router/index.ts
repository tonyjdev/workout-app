import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import SplashScreen from '@/views/SplashScreen.vue'
import TrainingView from '@/views/TrainingView.vue'
import StatsView from '@/views/StatsView.vue'
import AchievementsView from '@/views/AchievementsView.vue'
import CustomizeView from '@/views/CustomizeView.vue'
import LoginView from '@/views/auth/LoginView.vue'
import RegisterView from '@/views/auth/RegisterView.vue'
import ForgotPasswordView from '@/views/auth/ForgotPasswordView.vue'
import ResetPasswordView from '@/views/auth/ResetPasswordView.vue'

// ===== Offcanvas =========================
// Settings
import SettingsView from '@/views/Settings.vue'
import SettingsVoiceView from '@/views/settings/SettingsVoice.vue'
import SettingsSoundView from '@/views/settings/SettingsSound.vue'
import SettingsTrainingView from '@/views/settings/SettingsTraining.vue'
import SettingsTestingView from '@/views/settings/SettingsTesting.vue'

const routes: RouteRecordRaw[] = [
  // Main screens
  { path: '/', name: 'splash', component: SplashScreen, meta: { title: 'Cargando...', hideChrome: true } },
  { path: '/login', name: 'login', component: LoginView, meta: { title: 'Iniciar sesion', guestOnly: true, hideChrome: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { title: 'Registro', guestOnly: true, hideChrome: true } },
  { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordView, meta: { title: 'Recuperar contrasena', guestOnly: true, hideChrome: true } },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: ResetPasswordView,
    props: route => ({
      token: route.query.token,
      email: route.query.email,
    }),
    meta: { title: 'Restablecer contrasena', guestOnly: true, hideChrome: true },
  },
  { path: '/training', name: 'training', component: TrainingView, meta: { title: 'Entrenar', requiresAuth: true } },
  { path: '/stats', name: 'stats', component: StatsView, meta: { title: 'Estadisticas', requiresAuth: true } },
  { path: '/achievements', name: 'achievements', component: AchievementsView, meta: { title: 'Logros', requiresAuth: true } },
  { path: '/customize', name: 'customize', component: CustomizeView, meta: { title: 'Personalizar', requiresAuth: true } },

  // OFFCANVAS - Settings
  { path: '/settings', name: 'settings', components: { panel: SettingsView }, meta: { requiresAuth: true } },
  { path: '/settings/voice', name: 'settings-voice', components: { panel: SettingsVoiceView }, meta: { requiresAuth: true } },
  { path: '/settings/sound', name: 'settings-sound', components: { panel: SettingsSoundView }, meta: { requiresAuth: true } },
  { path: '/settings/training', name: 'settings-training', components: { panel: SettingsTrainingView }, meta: { requiresAuth: true } },
  { path: '/settings/testing', name: 'settings-testing', components: { panel: SettingsTestingView }, meta: { requiresAuth: true } },

  // 404
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes,
})

export default router
