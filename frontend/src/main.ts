import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { apiKey, createApi } from '@/api'
import { startOperationJournal } from '@/journal/start'
import { router } from '@/router'
import App from './App.vue'
import './styles/generated.css'

const api = createApi()
const app = createApp(App).provide(apiKey, api).use(createPinia()).use(router)
app.mount('#app')
startOperationJournal(app, api, router)

// Design overlay (?design=...) and presets (?tool=...): development only, absent from production builds.
if (import.meta.env.DEV) {
  const params = new URLSearchParams(location.search)
  void import('./dev/overlay').then(({ mountDesignOverlay }) => mountDesignOverlay(params))
  void import('./dev/preset').then(({ applyPreset }) => applyPreset(params, app))
}
