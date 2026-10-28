<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ToastAlert from '@trama/components/ToastAlert.vue'
import TramaLogo from '@trama/components/TramaLogo.vue'
import { useSession } from '@trama/composables/useSession'
import { useAppTheme } from '@trama/composables/useAppTheme'
import { apiStatus, initializeApi } from '@trama/services/api'

const route = useRoute()
const { selectedOrgId } = useSession()
const { themeName, toggleTheme } = useAppTheme()

const showTopbar = computed(() => route.matched.length > 0 && route.meta.full_bleed !== true && route.name !== 'flux')
const viewKey = computed(() => (route.meta.refresh_on_org_change ? `${route.name}:${selectedOrgId.value}` : route.name))
</script>

<template>
  <v-app>
    <v-main>
      <div class="h-100 d-flex flex-column">
        <header v-if="showTopbar" class="trama-topbar">
          <div class="trama-topbar__brand">
            <router-link :to="{ name: 'home' }" class="trama-topbar__logo" aria-label="Trama · início">
              <TramaLogo />
            </router-link>
            <span class="store-badge store-badge--beta">Beta</span>
          </div>

          <nav class="trama-topbar__nav" aria-label="Navegação da Trama">
            <router-link :to="{ name: 'home' }" class="trama-topbar__link" :class="{ active: route.name === 'home' }">
              <v-icon icon="mdi-source-branch" size="18" />
              <span>Seus fluxos</span>
            </router-link>
            <router-link :to="{ name: 'flux-dashboard' }" class="trama-topbar__link" :class="{ active: route.name === 'flux-dashboard' }">
              <v-icon icon="mdi-chart-timeline-variant" size="18" />
              <span>Execuções</span>
            </router-link>
          </nav>

          <div class="trama-topbar__actions">
            <button
              class="trama-topbar__action"
              type="button"
              :aria-label="'Usar tema ' + (themeName === 'dark' ? 'claro' : 'escuro')"
              :title="'Usar tema ' + (themeName === 'dark' ? 'claro' : 'escuro')"
              @click="toggleTheme"
            >
              <v-icon :icon="themeName === 'dark' ? 'mdi-white-balance-sunny' : 'mdi-weather-night'" size="18" />
              <span>Tema {{ themeName === 'dark' ? 'claro' : 'escuro' }}</span>
            </button>
            <a href="/library/home" target="_top" class="trama-topbar__action trama-topbar__action--back" title="Voltar ao LAB">
              <v-icon icon="mdi-arrow-top-left" size="18" />
              <span>Voltar ao LAB</span>
            </a>
          </div>
        </header>

        <div v-if="apiStatus.error" class="trama-file-empty" role="alert">
          <h1>Seu espaço não carregou.</h1>
          <p>{{ apiStatus.error }}</p>
          <v-btn color="primary" @click="initializeApi">Tentar novamente</v-btn>
        </div>
        <div v-else class="vue-app-view-container flex-grow-1">
          <router-view v-slot="{ Component }">
            <v-fade-transition mode="out-in">
              <component :is="Component" :key="viewKey" class="h-100" />
            </v-fade-transition>
          </router-view>
        </div>
        <ToastAlert />
      </div>
    </v-main>
  </v-app>
</template>
