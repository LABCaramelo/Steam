<script setup>
import { computed, ref, watch } from 'vue'
import { APPS } from '@trama/services/apps'
import { db } from '@trama/services/api'
const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'select'])
const search = ref('')
const selectedCustom = ref(null)
const componentKeys = ['requester', 'for_each', 'delay', 'return', 'filter', 'set_variables', 'ai_agent', 'router', 'code', 'accumulator', 'filter_log']
const aliases = { for_each: 'foreach', code: 'javascript' }
const components = computed(() => componentKeys.map(key => ({ key: APPS[key] ? key : aliases[key] ?? key, ...(APPS[key] ?? APPS[aliases[key]] ?? { title: key, icon: 'mdi-puzzle-outline', bg: '#E4A3FF' }) })))
const apps = computed(() => [...Object.entries(APPS).filter(([, app]) => !app.trigger && !app.middleware).map(([key, app]) => ({ key, ...app })), ...db.apps.map(app => ({ key: app.key, title: app.name, description: app.modules.map(module => module.name).join(' '), icon: 'mdi-puzzle-outline', bg: '#FFFFFF', definition: app }))].sort((a,b) => a.title.localeCompare(b.title, 'pt-BR')))
const matches = (items) => items.filter(item => `${item.title} ${item.description ?? ''}`.toLocaleLowerCase().includes(search.value.toLocaleLowerCase().trim()))
function choose(item) {
  if (item.definition) { selectedCustom.value = item.definition; search.value = ''; return }
  emit('select', item.key); emit('update:modelValue', false); search.value = ''
}
function chooseModule(module) {
  emit('select', { app: selectedCustom.value.key, module, appDefinition: selectedCustom.value })
  emit('update:modelValue', false)
}
const visibleModules = computed(() => selectedCustom.value?.modules.filter(module => `${module.name} ${module.description ?? ''}`.toLowerCase().includes(search.value.toLowerCase().trim())) ?? [])
watch(() => props.modelValue, open => { if (!open) { selectedCustom.value = null; search.value = '' } })
</script>

<template>
  <v-dialog :model-value="modelValue" width="640" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card class="node-picker" rounded="lg">
      <header><div class="d-flex align-center ga-2"><v-btn v-if="selectedCustom" icon="mdi-arrow-left" variant="text" size="small" aria-label="Voltar aos aplicativos" @click="selectedCustom = null; search = ''" /><h3>{{ selectedCustom?.name ?? 'Nova ação' }}</h3></div><v-btn icon="mdi-close" variant="text" size="small" aria-label="Fechar seleção de ação" @click="emit('update:modelValue', false)" /></header>
      <v-text-field v-model="search" autofocus placeholder="Pesquisar..." prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details class="picker-search" />
      <div class="picker-scroll">
        <template v-if="selectedCustom">
          <h4>Selecione um módulo</h4>
          <v-list v-if="visibleModules.length"><v-list-item v-for="module in visibleModules" :key="module.id" :title="module.name" :subtitle="module.description" prepend-icon="mdi-puzzle-outline" @click="chooseModule(module)" /></v-list>
          <p v-else class="empty-search">Nenhum módulo disponível para esta busca.</p>
        </template>
        <template v-else>
        <h4>Componentes</h4>
        <div class="picker-grid"><button v-for="item in matches(components)" :key="item.key" type="button" class="picker-item" :data-app="item.key" @click="choose(item)"><span class="picker-logo" :style="{background:item.bg}"><v-icon :icon="item.icon" :color="item.fg || '#40204b'" size="29" /></span><strong>{{ item.title }}</strong><small v-if="item.description">{{ item.description }}</small></button></div>
        <h4>Aplicativos</h4>
        <div class="picker-grid"><button v-for="item in matches(apps)" :key="item.key" type="button" class="picker-item" :data-app="item.key" @click="choose(item)"><span class="picker-logo" :style="{background:item.bg}"><img v-if="item.logo || item.image_url" :src="item.logo || item.image_url" alt="" /><v-icon v-else :icon="item.icon" :color="item.fg || '#AB3B00'" size="29" /></span><strong>{{ item.title }}</strong></button></div>
        <p v-if="!matches(components).length && !matches(apps).length" class="empty-search">Nenhuma ação encontrada.</p>
        </template>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.node-picker{font-family:'Inter',sans-serif;border:1px solid #4b5c514d;max-height:85vh}.node-picker header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #647b6c35}.node-picker h3{font-size:18px}.picker-search{flex:0;padding:14px 16px 0}.picker-scroll{overflow:auto;padding:0 16px 20px}.picker-scroll h4{font-size:14px;margin:22px 0 14px}.picker-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.picker-item{border:1px solid transparent;border-radius:5px;display:flex;align-items:center;flex-direction:column;padding:13px 7px;gap:8px;min-height:103px;color:inherit;cursor:pointer}.picker-item:hover,.picker-item:focus-visible{background:rgb(var(--cm-accent-soft));border-color:rgb(var(--cm-accent-ink))}.picker-logo{width:49px;height:49px;border-radius:6px;display:grid;place-items:center}.picker-logo img{width:33px;height:33px;object-fit:contain}.picker-item strong{font-size:12px;font-weight:700;text-align:center}.picker-item small{font-size:10px;opacity:.65;text-align:center}.empty-search{padding:30px;text-align:center;opacity:.65}@media(max-width:550px){.picker-grid{grid-template-columns:repeat(2,1fr)}}
</style>
