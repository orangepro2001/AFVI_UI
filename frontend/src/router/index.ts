import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'

// Hash history: works in the Wails window (no address bar, no history fallback on its asset
// server) and lets a browser open any page by URL (http://localhost:5173/#/teach).
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
