<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '@trama/services/api'
import { useSession } from '@trama/composables/useSession'
import { useAppTheme } from '@trama/composables/useAppTheme'
import TramaLogo from './TramaLogo.vue'
const width = defineModel({ type: String, required: true })
const route = useRoute()
const { selectedOrgId } = useSession()
const { themeName, toggleTheme } = useAppTheme()
const organization = computed(() => db.organizations.find(item => item.id === selectedOrgId.value))
const entries = [
  { name: 'home', label: 'Seus fluxos', icon: 'mdi-source-branch' },
  { name: 'flux-dashboard', label: 'Execuções', icon: 'mdi-chart-timeline-variant' },
  { name: 'marketplace', label: 'Templates', icon: 'mdi-shape-outline' },
  { name: 'apps', label: 'Aplicativos', icon: 'mdi-puzzle-outline' },
  { name: 'files', label: 'Arquivos', icon: 'mdi-folder-outline' },
]
const media = window.matchMedia('(max-width: 900px)')
const resize = () => { width.value = media.matches ? '64px' : '208px' }
onMounted(() => { resize(); media.addEventListener('change', resize) })
onUnmounted(() => media.removeEventListener('change', resize))
</script>
<template>
  <aside class="trama-sidebar" aria-label="Trama">
    <router-link :to="{ name: 'home' }" class="trama-sidebar-brand" aria-label="Trama · início"><TramaLogo/></router-link>
    <div class="trama-workspace"><v-icon icon="mdi-lock-outline" size="16"/><span>{{ organization?.name || 'Meu espaço privado' }}</span></div>
    <nav aria-label="Navegação da Trama">
      <router-link v-for="entry in entries" :key="entry.name" :to="{ name: entry.name }" :aria-label="entry.label" :title="entry.label" :aria-current="route.name === entry.name ? 'page' : undefined" class="trama-nav-link" :class="{ active: route.name === entry.name }"><v-icon :icon="entry.icon" size="21"/><span>{{ entry.label }}</span></router-link>
    </nav>
    <div class="trama-sidebar-bottom">
      <button class="trama-nav-link" type="button" :aria-label="'Usar tema ' + (themeName === 'dark' ? 'claro' : 'escuro')" @click="toggleTheme"><v-icon :icon="themeName === 'dark' ? 'mdi-white-balance-sunny' : 'mdi-weather-night'" size="21"/><span>Tema {{ themeName === 'dark' ? 'claro' : 'escuro' }}</span></button>
      <a href="/tools/automation/index.html?legacy=1" title="Planejamentos anteriores" class="trama-nav-link"><v-icon icon="mdi-history" size="21"/><span>Planejamentos anteriores</span></a>
      <a href="/library/home" target="_top" class="trama-nav-link" title="Voltar ao LAB"><v-icon icon="mdi-arrow-top-left" size="21"/><span>Voltar ao LAB</span></a>
      <small>UM CARA CARAMELO<br/>LABORATÓRIO DE INTERAÇÃO</small>
    </div>
  </aside>
</template>
