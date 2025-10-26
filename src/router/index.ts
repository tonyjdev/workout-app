// src/router/index.ts
import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import TabsPage from '../views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/tab1',
  },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      // redirect por defecto dentro de /tabs
      {
        path: '',
        redirect: '/tabs/tab1',
      },

      // Tab 1, 2, 3 (formato plano del starter)
      {
        path: 'tab1',
        component: () => import('@/views/Tab1Page.vue'),
      },
      {
        path: 'tab2',
        component: () => import('@/views/Tab2Page.vue'),
      },
      {
        path: 'tab3',
        component: () => import('@/views/Tab3Page.vue'),
      },

      // ---- NUEVA TAB: Settings (raíz) ----
      {
        path: 'settings',
        name: "settings",
        component: () => import('@/views/TabSettingsPage.vue'),
      },
      // Subpantalla About
      {
        path: 'settings/about',
        name: "settings-about",
        component: () => import('@/views/SettingsAboutPage.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
