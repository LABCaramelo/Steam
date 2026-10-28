import { createRouter, createWebHashHistory } from 'vue-router'
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@trama/views/HomeView.vue'), meta: { title: 'Seus fluxos', refresh_on_org_change: true } },
    { path: '/marketplace', name: 'marketplace', component: () => import('@trama/views/MarketplaceView.vue'), meta: { title: 'Templates' } },
    { path: '/apps', name: 'apps', component: () => import('@trama/views/AppsView.vue'), meta: { title: 'Aplicativos' } },
    { path: '/app/edit/:appId?', name: 'app-builder', component: () => import('@trama/views/AppBuilderView.vue'), meta: { title: 'Construtor de aplicativos' } },
    { path: '/flux/:fluxId?', name: 'flux', component: () => import('@trama/views/FluxEditorView.vue'), meta: { title: 'Integração', full_bleed: true } },
    { path: '/dashboard/:fluxId?', name: 'flux-dashboard', component: () => import('@trama/views/FluxDashboardView.vue'), meta: { title: 'Execuções', refresh_on_org_change: true } },
    { path: '/files', name: 'files', component: () => import('@trama/views/FilesView.vue'), meta: { title: 'Arquivos' } },
    { path: '/:catchAll(.*)', redirect: { name: 'home' } },
  ],
})
router.afterEach(to => { document.title = 'Trama · ' + (to.meta.title || 'LAB Caramelo') })
export default router
