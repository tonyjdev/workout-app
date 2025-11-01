import { createRouter, createWebHistory } from 'vue-router'
import SplashScreen from '@/views/SplashScreen.vue'
import TrainingView from '@/views/TrainingView.vue'
import StatsView from '@/views/StatsView.vue'
import AchievementsView from '@/views/AchievementsView.vue'
import CustomizeView from '@/views/CustomizeView.vue'

const routes = [
  { path: '/', component: SplashScreen, meta: { title: 'Cargando...' } },
  { path: '/training', component: TrainingView, meta: { title: 'Entrenar' } },
  { path: '/stats', component: StatsView, meta: { title: 'Estadísticas' } },
  { path: '/achievements', component: AchievementsView, meta: { title: 'Logros' } },
  { path: '/customize', component: CustomizeView, meta: { title: 'Personalizar' } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
export default router
