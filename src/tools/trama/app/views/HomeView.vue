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
    <div class="trama-overview"><span><strong>{{ count }}</strong> fluxos no seu espaço</span><span><strong>{{ executions }}</strong> operações registradas</span></div>
    <section aria-label="Integrações e conexões"><HorizontalFluxList/></section>
  </main>
</template>
