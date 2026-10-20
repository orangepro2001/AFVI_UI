import type { RouteRecordRaw } from 'vue-router'

/** Extra data a route carries; the shell reads it to build the navigation. */
declare module 'vue-router' {
  interface RouteMeta {
    /** Label of the page tab in the top navigation. Routes without one are not in the nav. */
    tab?: string
  }
}

/**
 * The pages of the application, in tab order. Adding a page = adding a record here (and its
 * view under pages/); the top navigation follows. Views are lazy: a page costs nothing until visited.
 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { tab: 'HOME' },
  },
  {
    path: '/teach',
    name: 'teach',
    component: () => import('@/pages/TeachPage.vue'),
    meta: { tab: 'TEACH' },
  },
  {
    path: '/review',
    name: 'review',
    component: () => import('@/pages/ReviewPage.vue'),
    meta: { tab: 'REVIEW' },
  },
  {
    path: '/calibrate',
    name: 'calibrate',
    component: () => import('@/pages/CalibratePage.vue'),
    meta: { tab: 'CALIBRATE' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: { tab: 'SETTINGS' },
  },
]

export interface PageTab {
  name: string
  label: string
  to: string
}

export const pageTabs: PageTab[] = routes
  .filter((route) => route.meta?.tab)
  .map((route) => ({
    name: String(route.name),
    label: route.meta!.tab!,
    to: route.path,
  }))
