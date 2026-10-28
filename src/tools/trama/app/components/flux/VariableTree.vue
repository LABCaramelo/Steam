<script setup>
import { computed, ref } from 'vue'
import JsonTree from './JsonTree.vue'
import { getApp } from '@trama/services/apps'
const props = defineProps({ groups: { type: Array, default: () => [] }, search: { type: String, default: '' } })
const emit = defineEmits(['select'])
const expanded = ref({})
const shown = computed(() => props.groups.filter(g => !props.search || `${g.title} ${g.id} ${JSON.stringify(g.output)}`.toLowerCase().includes(props.search.toLowerCase())))
function toggle(id) { expanded.value = { ...expanded.value, [id]: !expanded.value[id] } }
</script>

<template>
  <div class="variable-tree">
    <div v-for="group in shown" :key="group.id" class="variable-group">
      <button class="variable-group__header" :aria-expanded="!!expanded[group.id]" @click="toggle(group.id)">
        <v-icon :icon="expanded[group.id] ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="14" />
        <span class="variable-group__app" :style="{ background: getApp(group.app).bg, color: getApp(group.app).fg }"><v-icon :icon="getApp(group.app).icon" size="12" /></span>
        <span class="variable-group__id">{{ group.id === 'IN' ? 'IN' : group.displayId }}</span>
        <b>{{ group.title }}</b>
      </button>
      <div v-if="expanded[group.id]" class="variable-group__body">
        <JsonTree v-if="group.output !== undefined && group.output !== null" :value="group.output" :path="`$${group.id}`" :search="search" selectable @select="emit('select', $event)" />
        <p v-else class="variable-group__empty">Execute este componente para gerar as variáveis de saída.</p>
      </div>
    </div>
    <p v-if="!shown.length" class="variable-group__empty">Nenhuma variável encontrada.</p>
  </div>
</template>

<style scoped>
.variable-tree{padding:0 0 12px}.variable-group{margin-bottom:8px}.variable-group__header{display:flex;align-items:center;gap:7px;width:100%;text-align:left;padding:8px 4px;font-size:12px;min-height:40px;color:rgb(var(--cm-fg));border-radius:7px;transition:background-color 160ms,color 160ms}.variable-group__header:hover{background:rgb(var(--cm-surface-3))}.variable-group__header:hover b{color:rgb(var(--cm-accent-ink))}.variable-group__header b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.variable-group__header:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:2px}.variable-group__app{height:24px;width:24px;flex:none;display:grid;place-items:center;border:1px solid rgb(var(--cm-line-strong));border-radius:6px;background:rgb(var(--cm-accent-soft))!important;color:rgb(var(--cm-accent-ink))!important}.variable-group__id{height:24px;min-width:24px;flex:none;padding:0 5px;display:grid;place-items:center;border:1px solid rgb(var(--cm-line-strong));background:rgb(var(--cm-surface-1));border-radius:5px;font:500 11px var(--trama-font-code,monospace);color:rgb(var(--cm-fg-muted))}.variable-group__body{padding:6px 0 12px 14px;min-width:0;border-left:1px solid rgb(var(--cm-line));margin-left:10px}.variable-group__empty{font-size:12px;line-height:1.65;color:rgb(var(--cm-fg-muted));padding:10px 5px}@media(max-width:600px){.variable-group__header{min-height:44px;font-size:14px}.variable-group__empty{font-size:14px}}
</style>
