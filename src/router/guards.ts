import type { Router } from 'vue-router'
import type { Pinia } from 'pinia'
import { useAuthStore } from '@/stores/authStore'

export function setupAuthGuards(router: Router, pinia: Pinia) {
  router.beforeEach(async (to, from, next) => {
    const auth = useAuthStore(pinia)

    if (!auth.initialized) {
      await auth.init()
    }

    if (to.meta?.requiresAuth && !auth.isAuthenticated) {
      const redirect = typeof to.fullPath === 'string' ? to.fullPath : to.path
      next({ name: 'login', query: { redirect } })
      return
    }

    if (to.meta?.guestOnly && auth.isAuthenticated) {
      next({ name: 'training' })
      return
    }

    next()
  })
}
