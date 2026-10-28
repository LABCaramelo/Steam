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
.variable-tree{padding:0 0 10px}.variable-group{margin-bottom:5px}.variable-group__header{display:flex;align-items:center;gap:6px;width:100%;text-align:left;padding:2px 0;font-size:12px;min-height:23px;color:rgb(var(--v-theme-on-surface))}.variable-group__header:hover b{color:rgb(var(--v-theme-primary))}.variable-group__app{height:20px;width:20px;display:grid;place-items:center;border:1px solid rgba(var(--v-theme-on-surface),.5);border-radius:2px}.variable-group__id{height:20px;min-width:20px;padding:0 3px;display:grid;place-items:center;border:1px solid rgba(var(--v-theme-on-surface),.5);border-radius:2px;font-size:10px;font-weight:400}.variable-group__body{padding:5px 0 7px 19px;min-width:0}.variable-group__empty{font-size:11px;line-height:1.6;opacity:.5;padding:8px 5px}
</style>
