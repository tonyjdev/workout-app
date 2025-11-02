import { createRouter, createWebHistory } from 'vue-router'
import SplashScreen from '@/views/SplashScreen.vue'
import TrainingView from '@/views/TrainingView.vue'
import StatsView from '@/views/StatsView.vue'
import AchievementsView from '@/views/AchievementsView.vue'
import CustomizeView from '@/views/CustomizeView.vue'

// ===== Offcanvas =========================
// Settings
import SettingsView from '@/views/Settings.vue'
import SettingsVoiceView from '@/views/settings/SettingsVoice.vue'
import SettingsSoundView from '@/views/settings/SettingsSound.vue'
import SettingsTrainingView from '@/views/settings/SettingsTraining.vue'
import SettingsTestingView from '@/views/settings/SettingsTesting.vue'

const routes = [
  // Main Screens
  { path: '/',                      name: 'splash',               component: SplashScreen,      meta: { title: 'Cargando...' } },
  { path: '/training',              name: 'training',             component: TrainingView,      meta: { title: 'Entrenar' } },
  { path: '/stats',                 name: 'stats',                component: StatsView,         meta: { title: 'Estadísticas' } },
  { path: '/achievements',          name: 'achievements',         component: AchievementsView,  meta: { title: 'Logros' } },
  { path: '/customize',             name: 'customize',            component: CustomizeView,     meta: { title: 'Personalizar' } },

  // OFFCANVAS - Settings
  { path: '/settings',              name: 'settings',             components: { panel: SettingsView } },
  { path: '/settings/voice',        name: 'settings-voice',       components: { panel: SettingsVoiceView } },
  { path: '/settings/sound',        name: 'settings-sound',       components: { panel: SettingsSoundView } },
  { path: '/settings/training',     name: 'settings-training',    components: { panel: SettingsTrainingView } },
  { path: '/settings/testing',      name: 'settings-testing',     components: { panel: SettingsTestingView } },

  // 404
  { path: '/:pathMatch(.*)*', redirect: '/' },
  // Settings
  // { path: '/settings', name: 'settings', component: Settings, meta: { title: 'Configuracion' } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes,
})
export default router
