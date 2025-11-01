import { createRouter, createWebHistory } from 'vue-router'
import SplashScreen from '@/views/SplashScreen.vue'
import TrainingView from '@/views/TrainingView.vue'
import StatsView from '@/views/StatsView.vue'
import AchievementsView from '@/views/AchievementsView.vue'
import CustomizeView from '@/views/CustomizeView.vue'

const routes = [
  { path: '/splash', component: SplashScreen, meta: { title: 'Cargando...' } },
  { path: '/', component: TrainingView, meta: { title: 'Entrenar' } },
  { path: '/stats', component: StatsView, meta: { title: 'Estadísticas' } },
  { path: '/achievements', component: AchievementsView, meta: { title: 'Logros' } },
  { path: '/customize', component: CustomizeView, meta: { title: 'Personalizar' } },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
