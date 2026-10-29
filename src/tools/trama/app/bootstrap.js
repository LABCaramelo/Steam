import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { initializeApi, resetSessionState } from './services/api'
import { installCarameloInteractions } from './composables/useCarameloInteractions'
import '@mdi/font/css/materialdesignicons.css'
import './styles/main.css'
import './styles/caramelo.css'
import './styles/showcase.css'

let generation = 0
export async function mountTrama(element, userId) {
  const current = ++generation
  resetSessionState(userId)
  await initializeApi()
  if (current !== generation) return () => {}
  const app = createApp(App).use(router).use(vuetify)
  const syncTheme = () => { vuetify.theme.global.name.value = document.documentElement.dataset.carameloTheme === 'light' ? 'light' : 'dark' }
  syncTheme()
  const observer = new MutationObserver(syncTheme)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-caramelo-theme'] })
  app.mount(element)
  const cleanupInteractions = installCarameloInteractions(element)
  return () => { cleanupInteractions(); observer.disconnect(); app.unmount(); if (current === generation) { generation++; resetSessionState(null) } }
}
