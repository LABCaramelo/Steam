<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import TheSidebar from '@trama/components/TheSidebar.vue'
import ToastAlert from '@trama/components/ToastAlert.vue'
import { useSession } from '@trama/composables/useSession'
import { apiStatus, initializeApi } from '@trama/services/api'

const route = useRoute()
const { selectedOrgId } = useSession()
const sidebarWidth = ref('0px')
const showSidebar = computed(() => route.matched.length > 0 && route.meta.no_sidebar !== true)
// Como no original (meta.refresh_on_org_change), a página recarrega ao trocar de organização.
const viewKey = computed(() => (route.meta.refresh_on_org_change ? `${route.name}:${selectedOrgId.value}` : route.name))
</script>

<template>
  <v-app>
    <v-main>
      <div
        :class="[{ 'retracted-content': showSidebar }, 'h-100 d-flex flex-column']"
        :style="{ '--sidebar-width': sidebarWidth }"
      >
        <div v-if="apiStatus.error" class="trama-file-empty" role="alert"><h1>Seu espaço não carregou.</h1><p>{{ apiStatus.error }}</p><v-btn color="primary" @click="initializeApi">Tentar novamente</v-btn></div>
        <div v-else class="vue-app-view-container flex-grow-1">
          <router-view v-slot="{ Component }">
            <v-fade-transition mode="out-in">
              <component :is="Component" :key="viewKey" class="h-100" />
            </v-fade-transition>
          </router-view>
        </div>
        <ToastAlert />
      </div>
      <TheSidebar v-if="showSidebar" v-model="sidebarWidth" />
    </v-main>
  </v-app>
</template>

<style scoped>
.retracted-content {
  width: calc(100% - var(--sidebar-width));
  margin-left: auto;
  transition: width 0.3s;
}
</style>
