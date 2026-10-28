import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@trama/views/HomeView.vue'), meta: { title: 'Seus fluxos', refresh_on_org_change: true } },
    { path: '/flux/:fluxId?', name: 'flux', component: () => import('@trama/views/FluxEditorView.vue'), meta: { title: 'Integração', full_bleed: true } },
    { path: '/dashboard/:fluxId?', name: 'flux-dashboard', component: () => import('@trama/views/FluxDashboardView.vue'), meta: { title: 'Execuções', refresh_on_org_change: true } },
    { path: '/:catchAll(.*)', redirect: { name: 'home' } },
  ],
})

router.afterEach(to => { document.title = 'Trama · ' + (to.meta.title || 'LAB Caramelo') })

export default router
