<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { getApp } from '@trama/services/apps'
import { displayNodeId } from './graphModel'
const props = defineProps({ step: { type: Object, required: true }, index: { type: Number, default: 0 }, selected: Boolean, status: { type: String, default: null }, readonly: Boolean })
const emit = defineEmits(['copy-id'])
const app = computed(() => getApp(props.step.app))
const trigger = computed(() => !!app.value.trigger || ['webhook', 'scheduler', 'activator'].includes(props.step.app))
const identifier = computed(() => displayNodeId(props.step, props.index))
const sourceHandles = computed(() => props.step.app === 'return' ? [] : props.step.app === 'router' ? Array.from({length: Math.max(2, Math.min(20, Number(props.step.config?.branches) || 2))}, (_, index) => `branch-${index+1}`) : ['foreach', 'for_each', 'for', 'while'].includes(props.step.app) ? ['body', 'done'] : ['out'])
const configured = computed(() => Object.keys(props.step.config ?? {}).length > 0)
const hexColor = computed(() => trigger.value ? 'rgb(var(--cm-accent-soft))' : (app.value.bg ?? '#E4A3FF'))
const title = computed(() => props.step.title || app.value.title)
const subtitle = computed(() => props.step.action || app.value.description || (trigger.value ? 'Inicie sua integração' : 'Configurar ação'))
</script>

<template>
  <div class="flux-node" :class="[{ selected, trigger }, status && `status-${status}`]" :data-node-app="step.app">
    <Handle v-if="!trigger" type="target" :position="Position.Left" :connectable="!readonly" class="node-target" />
    <div class="hexagon-wrap">
      <svg class="node-hexagon" viewBox="0 0 130 148" aria-hidden="true"><path d="M61.25 1.74241C63.5705 .402669 66.4295 .402668 68.75 1.74241L125.702 34.6236C128.022 35.9634 129.452 38.4393 129.452 41.1188V106.881C129.452 109.561 128.022 112.037 125.702 113.376L68.75 146.258C66.4295 147.597 63.5705 147.597 61.25 146.258L4.2981 113.376C1.97759 112.037 .548096 109.561 .548096 106.881V41.1188C.548096 38.4393 1.97759 35.9634 4.2981 34.6236L61.25 1.74241Z" :fill="hexColor" :stroke="trigger ? 'rgb(var(--cm-accent-ink))' : 'rgba(255,255,255,.8)'" /></svg>
      <img v-if="app.logo || app.image_url" class="node-logo" :src="app.logo || app.image_url" :alt="title" draggable="false" />
      <v-icon v-else :icon="app.icon || 'mdi-puzzle-outline'" :color="trigger ? 'primary' : app.fg || '#351941'" size="52" class="node-icon" />
      <span v-if="status === 'running'" class="node-state running" title="Em execução"><v-progress-circular indeterminate color="primary" size="26" width="3" /></span>
      <span v-else-if="status === 'error'" class="node-state" title="Erro na execução"><v-icon icon="mdi-alert-circle" color="error" size="31" /></span>
      <span v-else-if="status === 'skipped'" class="node-state" title="Ignorado"><v-icon icon="mdi-minus-circle" color="grey" size="28" /></span>
      <span v-else-if="status === 'success' || configured" class="node-state" :title="status === 'success' ? 'Execução concluída' : 'Configurado'"><v-icon icon="mdi-check-circle" color="success" size="31" /></span>
    </div>
    <div class="node-caption"><div class="node-title"><button class="node-id nodrag nopan" :aria-label="`Copiar ID ${identifier}`" @click.stop="emit('copy-id', identifier)">{{ identifier }}</button><strong>{{ title }}</strong></div><div class="node-subtitle" :title="subtitle">{{ subtitle }}</div></div>
    <Handle v-for="(handle, i) in sourceHandles" :id="handle" :key="handle" type="source" :position="Position.Right" :connectable="!readonly" class="node-source" :style="{ top: `${74 + (i-(sourceHandles.length-1)/2)*24}px` }" />
    <span v-if="['foreach', 'for_each', 'for', 'while'].includes(step.app)" class="loop-label">itens / fim</span>
  </div>
</template>

<style scoped>
.flux-node{position:relative;width:170px;min-height:192px;display:flex;flex-direction:column;align-items:center;user-select:none;color:rgb(var(--v-theme-on-surface));outline:none}
.hexagon-wrap{position:relative;width:130px;height:148px;display:grid;place-items:center;filter:drop-shadow(0 2px 3px #0002);transition:filter .15s}.node-hexagon{position:absolute;width:130px;height:148px;overflow:visible}.node-icon,.node-logo{z-index:1;pointer-events:none}.node-logo{width:62px;height:62px;object-fit:contain}
.selected .hexagon-wrap{filter:drop-shadow(0 0 5px rgb(var(--v-theme-primary)))}.selected .node-hexagon path{stroke:rgb(var(--v-theme-primary));stroke-width:2.5px}
.node-state{position:absolute;right:-4px;top:0;z-index:2;border-radius:50%;background:rgb(var(--v-theme-surface));height:31px;width:31px}.node-state.running{padding:2px}.status-skipped{opacity:.5}
.node-caption{width:210px;margin-top:9px;line-height:1.25;text-align:center}.node-title{display:flex;justify-content:center;gap:4px;align-items:center;font-family:'Inter',sans-serif;font-size:16px;white-space:nowrap}.node-title strong{font-weight:700;max-width:180px;overflow:hidden;text-overflow:ellipsis}.node-id{padding:0 3px;height:19px;min-width:19px;border:1px solid #93aaa48c;border-radius:3px;font-size:11px;line-height:17px;color:inherit;cursor:copy;background:transparent}.node-subtitle{font-family:'Inter',sans-serif;font-size:11px;opacity:.82;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;margin-top:3px}
.node-target{left:17px!important;top:74px!important}.node-source{right:17px!important}.flux-node :deep(.vue-flow__handle){width:7px;height:7px;border:1px solid #bcd6c9;background:#1a211e;z-index:4;min-width:7px;min-height:7px}.flux-node :deep(.vue-flow__handle:hover){background:rgb(var(--v-theme-primary));width:12px;height:12px}.loop-label{position:absolute;left:141px;top:107px;font-size:8px;color:rgb(var(--v-theme-muted));white-space:nowrap}
</style>
