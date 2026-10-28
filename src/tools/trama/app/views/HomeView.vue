<script setup>
import { computed } from 'vue'
import FluxButtonCreateNew from '@trama/components/home/FluxButtonCreateNew.vue'
import HorizontalFluxList from '@trama/components/home/HorizontalFluxList.vue'
import { db, orgFluxes } from '@trama/services/api'
const count = computed(() => orgFluxes().length)
const executions = computed(() => db.subscription?.quantity_used || 0)
</script>
<template>
  <main class="trama-home">
    <header class="trama-home-header"><div><p class="trama-eyebrow">LAB / AUTOMAÇÃO VISUAL</p><h1>Uma ideia.<br/><span>Vários caminhos.</span></h1><p class="trama-home-description">Conecte dados e aplicativos, desenhe a lógica e acompanhe cada ação do seu fluxo.</p></div><FluxButtonCreateNew/></header>
    <div class="trama-overview"><span><strong>{{ count }}</strong> fluxos no seu espaço</span><span><strong>{{ executions }}</strong> operações registradas</span><span><v-icon icon="mdi-lock-outline" size="16"/> Espaço privado</span></div>
    <v-alert variant="tonal" color="info" class="trama-runtime-note" density="compact" icon="mdi-information-outline">As execuções manuais acionam serviços reais e têm limite de 30 segundos. Webhooks externos, agendamentos e execução de JavaScript ainda não estão disponíveis. Conexões com IA utilizam sua chave e podem gerar custos no provedor.</v-alert>
    <section aria-label="Integrações e conexões"><HorizontalFluxList/></section>
  </main>
</template>
