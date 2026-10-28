<script setup>
import { computed, ref, watch } from 'vue'
import { APPS } from '@trama/services/apps'
import { db } from '@trama/services/api'
import AppIcon from '@trama/components/AppIcon.vue'
const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'select'])
const search = ref('')
const selectedCustom = ref(null)
const selection = ref(null)
const selectionTitle = ref('')
const componentKeys = ['requester', 'for_each', 'delay', 'return', 'filter', 'set_variables', 'ai_agent', 'router', 'code', 'accumulator', 'filter_log']
const aliases = { for_each: 'foreach', code: 'javascript' }
const components = computed(() => componentKeys.map(key => ({ key: APPS[key] ? key : aliases[key] ?? key, ...(APPS[key] ?? APPS[aliases[key]] ?? { title: key, icon: 'mdi-puzzle-outline', bg: '#E4A3FF' }) })))
const apps = computed(() => [...Object.entries(APPS).filter(([, app]) => !app.trigger && !app.middleware).map(([key, app]) => ({ key, ...app })), ...db.apps.map(app => ({ key: app.key, title: app.name, description: app.modules.map(module => module.name).join(' '), icon: 'mdi-puzzle-outline', bg: '#FFFFFF', definition: app }))].sort((a,b) => a.title.localeCompare(b.title, 'pt-BR')))
const matches = (items) => items.filter(item => `${item.title} ${item.description ?? ''}`.toLocaleLowerCase().includes(search.value.toLocaleLowerCase().trim()))
function choose(item) {
  if (item.definition) { selectedCustom.value = item.definition; search.value = ''; selection.value = null; selectionTitle.value = ''; return }
  selection.value = item.key; selectionTitle.value = item.title
}
function chooseModule(module) {
  selection.value = { app: selectedCustom.value.key, module, appDefinition: selectedCustom.value }
  selectionTitle.value = module.name
}
function confirmSelection() {
  if (!selection.value) return
  emit('select', selection.value)
  emit('update:modelValue', false)
}
const visibleModules = computed(() => selectedCustom.value?.modules.filter(module => `${module.name} ${module.description ?? ''}`.toLowerCase().includes(search.value.toLowerCase().trim())) ?? [])
watch(() => props.modelValue, open => { if (!open) { selectedCustom.value = null; search.value = ''; selection.value = null; selectionTitle.value = '' } })
</script>

<template>
  <v-dialog :model-value="modelValue" width="720" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card class="node-picker" rounded="lg">
      <header><div class="d-flex align-center ga-2"><v-btn v-if="selectedCustom" icon="mdi-arrow-left" variant="text" size="small" aria-label="Voltar aos aplicativos" @click="selectedCustom = null; search = ''; selection = null; selectionTitle = ''" /><div><p class="picker-eyebrow">TRAMA / ADICIONAR AO FLUXO</p><h3>{{ selectedCustom?.name ?? 'Nova ação' }}</h3></div></div><v-btn icon="mdi-close" variant="text" size="small" aria-label="Fechar seleção de ação" @click="emit('update:modelValue', false)" /></header>
      <v-text-field v-model="search" autofocus aria-label="Buscar ação ou aplicativo" placeholder="Buscar ação ou aplicativo" prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details class="picker-search" />
      <div class="picker-scroll">
        <template v-if="selectedCustom">
          <h4>Selecione um módulo</h4>
          <v-list v-if="visibleModules.length"><v-list-item v-for="module in visibleModules" :key="module.id" :title="module.name" :subtitle="module.description" :active="selection?.module?.id === module.id" prepend-icon="mdi-puzzle-outline" @click="chooseModule(module)" /></v-list>
          <p v-else class="empty-search">Nenhum módulo disponível para esta busca.</p>
        </template>
        <template v-else>
        <h4>Componentes</h4>
        <div class="picker-grid"><button v-for="item in matches(components)" :key="item.key" type="button" class="picker-item" :class="{ 'is-selected': selection === item.key }" :aria-pressed="selection === item.key" :data-app="item.key" @click="choose(item)"><span class="picker-logo"><v-icon :icon="item.icon" size="24" /></span><span class="picker-copy"><strong>{{ item.title }}</strong><small v-if="item.description">{{ item.description }}</small></span><v-icon v-if="selection === item.key" icon="mdi-check-circle" size="16" class="picker-check" /></button></div>
        <h4>Aplicativos</h4>
        <div class="picker-grid"><button v-for="item in matches(apps)" :key="item.key" type="button" class="picker-item" :class="{ 'is-selected': selection === item.key }" :aria-pressed="selection === item.key" :data-app="item.key" @click="choose(item)"><span class="picker-logo picker-logo--brand"><img v-if="item.logo || item.image_url" :src="item.logo || item.image_url" alt="" /><AppIcon v-else :app="item.key" :size="32" :rounded="7" /></span><span class="picker-copy"><strong>{{ item.title }}</strong></span><v-icon v-if="selection === item.key" icon="mdi-check-circle" size="16" class="picker-check" /></button></div>
        <p v-if="!matches(components).length && !matches(apps).length" class="empty-search">Nenhuma ação encontrada.</p>
        </template>
      </div>
      <footer class="picker-footer"><p aria-live="polite">{{ selectionTitle || 'Selecione uma ação para adicionar ao fluxo.' }}</p><button type="button" :disabled="!selection" class="picker-save" @click="confirmSelection"><v-icon icon="mdi-check" size="18" />Salvar</button></footer>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.node-picker{font-family:var(--trama-font-ui,Inter,sans-serif);max-height:min(840px,90dvh);background:rgb(var(--cm-surface-1));color:rgb(var(--cm-fg));border:1px solid rgb(var(--cm-line-strong));border-radius:16px!important;overflow:hidden;box-shadow:var(--trama-shadow-float,0 24px 60px -12px #000b)}.node-picker header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid rgb(var(--cm-line));background:rgb(var(--cm-surface-2));position:relative}.node-picker header:before{content:'';position:absolute;inset:0 0 auto;height:2px;background:var(--cm-spectrum-gradient)}.node-picker h3{font:800 24px/1.2 var(--trama-font-display,Montserrat,sans-serif);letter-spacing:-.045em}.picker-eyebrow{font:600 10px/1.4 var(--trama-font-code,monospace);letter-spacing:.12em;color:rgb(var(--cm-accent-ink));margin-bottom:5px}.picker-search{flex:0;padding:18px 22px 0}.picker-scroll{overflow:auto;padding:0 22px 24px}.picker-scroll h4{font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:rgb(var(--cm-fg-muted));margin:26px 0 14px}.picker-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.picker-item{display:flex;align-items:flex-start;flex-direction:column;gap:10px;min-width:0;min-height:142px;padding:15px;border:1px solid rgb(var(--cm-line));border-radius:12px;background:rgb(var(--cm-surface-2));color:rgb(var(--cm-fg));text-align:left;cursor:pointer;position:relative;transition:background-color 160ms,border-color 160ms,box-shadow 160ms,transform 80ms}.picker-item:hover{background:rgb(var(--cm-surface-3));border-color:rgb(var(--cm-accent-ink)/.6);box-shadow:inset 0 1px 0 rgb(var(--cm-fg)/.04)}.picker-item:active{transform:translateY(1px)}.picker-item:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:3px}.picker-logo{width:40px;height:40px;flex:none;border:1px solid rgb(var(--cm-line-strong));border-radius:10px;display:grid;place-items:center;background:rgb(var(--cm-surface-1))!important;color:rgb(var(--cm-accent-ink))}.picker-logo:not(.picker-logo--brand) :deep(.v-icon){color:rgb(var(--cm-accent-ink))!important}.picker-logo img{width:27px;height:27px;object-fit:contain}.picker-item strong{font-size:13px;line-height:1.35;font-weight:700}.picker-item small{font-size:12px;line-height:1.55;color:rgb(var(--cm-fg-muted));display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.empty-search{padding:40px 20px;text-align:center;font-size:14px;line-height:1.65;color:rgb(var(--cm-fg-muted))}.picker-scroll :deep(.v-list){background:transparent}.picker-scroll :deep(.v-list-item){border:1px solid rgb(var(--cm-line));border-radius:8px;margin-bottom:8px;min-height:60px}.picker-scroll :deep(.v-list-item:hover){background:rgb(var(--cm-accent-soft))}@media(max-width:600px){.node-picker header{padding:18px}.node-picker h3{font-size:22px}.picker-search{padding:16px 18px 0}.picker-scroll{padding:0 18px 20px}.picker-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.picker-item{padding:12px;min-height:136px}.picker-item strong{font-size:14px}.picker-item small{font-size:12px}}@media(prefers-reduced-motion:reduce){.picker-item{transition:none}}


.node-picker{display:flex;flex-direction:column}.picker-scroll{min-height:0;flex:1}.picker-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.picker-item{min-height:86px;flex-direction:row;align-items:center;gap:12px;padding:13px;position:relative}.picker-copy{display:flex;flex-direction:column;gap:5px;min-width:0}.picker-copy strong{font-size:13px;line-height:1.35}.picker-copy small{font-size:12px;line-height:1.55}.picker-item.is-selected{border-color:rgb(var(--cm-accent-ink));background:rgb(var(--cm-accent-soft));box-shadow:inset 0 0 0 1px rgb(var(--cm-accent-ink)/.2)}.picker-item.is-selected .picker-logo{background:rgb(var(--cm-surface-1))!important}.picker-check{position:absolute;right:7px;top:7px;color:rgb(var(--cm-accent-ink))}.picker-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 22px;border-top:1px solid rgb(var(--cm-line));background:rgb(var(--cm-surface-2));flex:none}.picker-footer p{font-size:12px;line-height:1.5;color:rgb(var(--cm-fg-muted));min-width:0}.picker-save{display:flex;align-items:center;justify-content:center;gap:7px;min-width:150px;height:44px;padding:0 20px;border-radius:8px;background:rgb(var(--cm-accent));color:rgb(var(--cm-accent-contrast));font-size:13px;font-weight:750;transition:box-shadow 160ms,transform 80ms}.picker-save:disabled{opacity:.4;cursor:default}.picker-save:hover:not(:disabled){box-shadow:0 0 0 3px rgb(var(--cm-accent)/.15)}.picker-save:active:not(:disabled){transform:translateY(1px)}.picker-save:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:3px}.picker-eyebrow{font-size:12px}@media(max-width:600px){.picker-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.picker-item{min-height:100px;gap:8px;padding:10px;align-items:flex-start;flex-direction:column}.picker-logo{width:34px;height:34px;border-radius:8px}.picker-copy strong{font-size:13px}.picker-copy small{font-size:12px}.picker-footer{padding:14px 18px;gap:12px}.picker-save{min-width:110px}.picker-footer p{font-size:12px}.picker-eyebrow{font-size:12px}}
</style>
