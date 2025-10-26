import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import TabsPage from '@/views/TabsPage.vue';

// Import directo para mayor estabilidad
import TrainPage from '@/views/TrainPage.vue';
import AchievementsPage from '@/views/AchievementsPage.vue';
import MePage from '@/views/MePage.vue';
import TabSettingsPage from '@/views/TabSettingsPage.vue';      // Reutilizamos tu Ajustes
import SettingsAboutPage from '@/views/SettingsAboutPage.vue';  // Ya existente
import SettingsLabPage from '@/views/SettingsLabPage.vue';      // Ya existente
import InfoPage from '@/views/InfoPage.vue';                    // Nueva

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/tabs/train' },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/tabs/train' },

      // --- Tabs (menú inferior) ---
      { path: 'train',        name: 'train',        component: TrainPage },
      { path: 'achievements', name: 'achievements', component: AchievementsPage },
      { path: 'me',           name: 'me',           component: MePage },

      // --- Ajustes (pantalla abierta desde icono del header) ---
      { path: 'settings',          name: 'settings',          component: TabSettingsPage },
      { path: 'settings/about',    name: 'settings-about',    component: SettingsAboutPage },
      { path: 'settings/lab',      name: 'settings-lab',      component: SettingsLabPage },

      // --- Info (pantalla abierta desde icono del header) ---
      { path: 'info',              name: 'info',              component: InfoPage },
    ],
  },

  // Fallback global
  { path: '/:pathMatch(.*)*', redirect: '/tabs/train' },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
