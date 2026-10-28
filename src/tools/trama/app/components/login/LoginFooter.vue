<script setup>
import { computed, ref } from 'vue'
import { apiStatus } from '@trama/services/api'
import { SITE_LINKS } from '@trama/config'

const helpOpen = ref(false)
const serverAvailable = computed(() => apiStatus.ready && apiStatus.online)
</script>

<template>
  <v-footer color="surface" app>
    <v-row>
      <v-col class="d-flex align-center justify-start ml-4">
        <a :href="SITE_LINKS.instagram" target="_blank" rel="noopener" class="mr-4" aria-label="Instagram da Trama original" title="Instagram da Trama original">
          <v-icon icon="custom:instagram-icon" size="small" />
        </a>
        <a :href="SITE_LINKS.tiktok" target="_blank" rel="noopener" class="mr-4" aria-label="TikTok da Trama original" title="TikTok da Trama original">
          <v-icon icon="custom:tik-tok-icon" size="small" />
        </a>
        <a :href="SITE_LINKS.docs" target="_blank" rel="noopener" class="mr-4" aria-label="Documentação de referência da Trama original" title="Documentação de referência">
          <v-icon size="small">mdi-file-document-outline</v-icon>
        </a>
        <div class="d-flex ml-4">
          <router-link :to="{ name: 'terms-of-use' }" target="_blank" class="mr-4">Termos de uso</router-link>
          <router-link :to="{ name: 'privacy-policies' }" target="_blank" class="mr-4">Política de privacidade</router-link>
          <button type="button" @click="helpOpen = true">Ajuda</button>
        </div>
      </v-col>
      <v-col class="d-flex justify-end">
        <div class="local-server-status" :class="{ 'server-unavailable': !serverAvailable }" role="status" aria-live="polite">
          <span class="status-dot" aria-hidden="true" />
          {{ serverAvailable ? 'Servidor local disponível' : 'Servidor indisponível' }}
        </div>
      </v-col>
    </v-row>
  </v-footer>
  <v-dialog v-model="helpOpen" max-width="480">
    <v-card title="Ajuda desta instalação">
      <v-card-text>Esta instalação local não possui canal de suporte configurado. Consulte a documentação de referência ou o administrador da instalação.</v-card-text>
      <v-card-actions><v-btn :href="SITE_LINKS.docs" target="_blank" rel="noopener" variant="text">Documentação de referência</v-btn><v-spacer /><v-btn color="primary" @click="helpOpen = false">Fechar</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.local-server-status{display:flex;align-items:center;justify-content:center;gap:8px;width:200px;min-height:30px;font-size:11px;color:rgb(var(--v-theme-on-surface))}.status-dot{width:7px;height:7px;border-radius:50%;background:rgb(var(--v-theme-success));flex-shrink:0}.server-unavailable .status-dot{background:rgb(var(--v-theme-error))}
</style>
