<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { getApp } from '@trama/services/apps'
import { displayNodeId } from './graphModel'
const props = defineProps({ step: { type: Object, required: true }, index: { type: Number, default: 0 }, selected: Boolean, status: { type: String, default: null }, readonly: Boolean })
const emit = defineEmits(['copy-id', 'select'])
const app = computed(() => getApp(props.step.app))
const trigger = computed(() => !!app.value.trigger || ['webhook', 'scheduler', 'activator'].includes(props.step.app))
const identifier = computed(() => displayNodeId(props.step, props.index))
const sourceHandles = computed(() => props.step.app === 'return' ? [] : props.step.app === 'router' ? Array.from({ length: Math.max(2, Math.min(20, Number(props.step.config?.branches) || 2)) }, (_, index) => `branch-${index + 1}`) : ['foreach', 'for_each', 'for', 'while'].includes(props.step.app) ? ['body', 'done'] : ['out'])
const configured = computed(() => Object.keys(props.step.config ?? {}).length > 0)
const title = computed(() => props.step.title || app.value.title)
const subtitle = computed(() => props.step.action || app.value.description || (trigger.value ? 'Inicie sua integração' : 'Configurar ação'))
const category = computed(() => trigger.value ? 'Entrada do fluxo' : props.step.app === 'return' ? 'Resposta' : ['router', 'filter', 'for_each', 'foreach', 'for', 'while'].includes(props.step.app) ? 'Controle' : 'Ação')
const state = computed(() => {
  if (props.status === 'running') return { icon: 'mdi-loading', text: 'Em execução' }
  if (props.status === 'error') return { icon: 'mdi-alert-circle-outline', text: 'Falhou' }
  if (props.status === 'skipped') return { icon: 'mdi-minus-circle-outline', text: 'Ignorado' }
  if (props.status === 'cancelled' || props.status === 'interrupted') return { icon: 'mdi-pause-circle-outline', text: 'Interrompido' }
  if (props.status === 'success') return { icon: 'mdi-check-circle-outline', text: 'Concluído' }
  if (props.status === 'queued') return { icon: 'mdi-clock-outline', text: 'Na fila' }
  return { icon: configured.value ? 'mdi-check' : 'mdi-tune-variant', text: configured.value ? 'Configurado' : 'Configurar' }
})
const nodeHeight = computed(() => Math.max(132, sourceHandles.value.length * 22 + 44))
const handleTitle = handle => handle === 'body' ? 'Corpo do laço' : handle === 'done' ? 'Após o laço' : handle.startsWith('branch-') ? 'Ramo ' + handle.slice(7) : 'Saída'
</script>

<template>
  <div class="flux-node" :class="[{ selected, trigger, 'is-configured': configured }, status && `status-${status}`]" :data-node-app="step.app" :style="{ minHeight: `${nodeHeight}px` }">
    <Handle v-if="!trigger" type="target" :position="Position.Left" :connectable="!readonly" class="node-target" aria-label="Entrada do módulo" />
    <button type="button" class="node-body" :aria-label="`Configurar ${title}`" :tabindex="readonly ? -1 : 0" @click.stop="!readonly && emit('select')">
      <span class="node-icon-plate" :class="{ 'has-logo': app.logo || app.image_url }">
        <img v-if="app.logo || app.image_url" class="node-logo" :src="app.logo || app.image_url" alt="" draggable="false" />
        <v-icon v-else :icon="app.icon || 'mdi-puzzle-outline'" size="25" aria-hidden="true" />
      </span>
      <span class="node-caption"><span class="node-category">{{ category }}</span><strong :title="title">{{ title }}</strong><span class="node-subtitle" :title="subtitle">{{ subtitle }}</span></span>
    </button>
    <div class="node-footer">
      <button type="button" class="node-id nodrag nopan" :aria-label="`Copiar ID ${identifier}`" @click.stop="emit('copy-id', identifier)"><span aria-hidden="true">#</span>{{ identifier }}</button>
      <span class="node-state" :class="{ 'is-running': status === 'running' }"><v-icon :icon="state.icon" size="14" aria-hidden="true" />{{ state.text }}</span>
    </div>
    <template v-for="(handle, i) in sourceHandles" :key="handle">
      <Handle :id="handle" type="source" :position="Position.Right" :connectable="!readonly" class="node-source" :style="{ top: `${(nodeHeight / 2) + (i - (sourceHandles.length - 1) / 2) * 22}px` }" :aria-label="handleTitle(handle)" />
      <span v-if="sourceHandles.length > 1" class="node-port-label" :style="{ top: `${(nodeHeight / 2) + (i - (sourceHandles.length - 1) / 2) * 22 - 7}px` }">{{ handle === 'body' ? 'itens' : handle === 'done' ? 'fim' : i + 1 }}</span>
    </template>
  </div>
</template>

<style scoped>
.flux-node{position:relative;width:224px;display:flex;flex-direction:column;justify-content:space-between;user-select:none;color:rgb(var(--cm-fg));background:rgb(var(--cm-surface-1));border:1px solid rgb(var(--cm-line-strong));border-radius:var(--trama-radius-lg,12px);box-shadow:0 4px 14px rgb(0 0 0/.12),inset 0 1px 0 rgb(var(--cm-fg)/.035);transition:border-color var(--trama-duration-hover,160ms),box-shadow var(--trama-duration-hover,160ms);isolation:isolate}
.flux-node::before{content:"";position:absolute;left:18px;top:-1px;width:28px;height:2px;border-radius:2px;background:rgb(var(--cm-fg-dim));transition:width var(--trama-duration-hover,160ms),background-color var(--trama-duration-hover,160ms)}
.flux-node.trigger::before{background:rgb(var(--cm-accent));width:44px}.flux-node:hover{border-color:rgb(var(--cm-fg-dim));box-shadow:0 8px 22px rgb(0 0 0/.16)}.flux-node.selected{border-color:rgb(var(--cm-accent-ink));box-shadow:0 0 0 2px rgb(var(--cm-accent)/.15),0 8px 24px rgb(0 0 0/.2)}.flux-node.selected::before{background:rgb(var(--cm-accent));width:calc(100% - 36px)}
.node-body{width:100%;flex:1;display:flex;gap:12px;align-items:center;text-align:left;border:0;border-radius:inherit;padding:18px 16px 14px;background:transparent;color:inherit;cursor:pointer;font-family:var(--trama-font-ui,'Inter',sans-serif);min-height:83px}
.node-body:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:4px}.node-icon-plate{width:40px;height:40px;display:grid;place-items:center;flex-shrink:0;border:1px solid rgb(var(--cm-line));border-radius:11px;background:rgb(var(--cm-surface-2));color:rgb(var(--cm-fg-2))}.trigger .node-icon-plate{background:rgb(var(--cm-accent-soft));color:rgb(var(--cm-accent-ink));border-color:rgb(var(--cm-accent-ink)/.3)}.node-icon-plate.has-logo{background:#FFF4E8;border-color:#E8D2BB}.node-logo{width:25px;height:25px;object-fit:contain;pointer-events:none}
.node-caption{display:flex;flex-direction:column;min-width:0;gap:4px}.node-category{font-size:12px;line-height:1.25;font-weight:650;letter-spacing:.1em;text-transform:uppercase;color:rgb(var(--cm-fg-muted))}.trigger .node-category{color:rgb(var(--cm-accent-ink))}.node-caption strong{font-family:var(--trama-font-display,'Montserrat',sans-serif);font-size:14px;line-height:1.25;letter-spacing:-.035em;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.node-subtitle{font-size:12px;line-height:1.4;color:rgb(var(--cm-fg-muted));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px}
.node-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:36px;padding:0 13px;border-top:1px solid rgb(var(--cm-line));border-radius:0 0 calc(var(--trama-radius-lg,12px) - 1px) calc(var(--trama-radius-lg,12px) - 1px);background:rgb(var(--cm-surface-2)/.55)}.node-id{display:inline-flex;gap:4px;align-items:center;justify-content:center;min-width:28px;min-height:26px;padding:2px 5px;font:500 11px/1.2 var(--trama-font-code,Consolas,monospace);color:rgb(var(--cm-fg-2));border:0;border-radius:4px;cursor:copy;background:transparent}.node-id span{color:rgb(var(--cm-fg-dim))}.node-id:hover{background:rgb(var(--cm-surface-3));color:rgb(var(--cm-accent-ink))}.node-state{display:inline-flex;align-items:center;gap:4px;font-size:12px;line-height:1.4;color:rgb(var(--cm-fg-muted));font-weight:500}.status-running .node-state{color:rgb(var(--cm-info))}.status-error .node-state{color:rgb(var(--cm-danger))}.status-success .node-state{color:rgb(var(--cm-success))}.status-skipped .node-state,.status-cancelled .node-state,.status-interrupted .node-state{color:rgb(var(--cm-warning))}.status-error{border-color:rgb(var(--cm-danger)/.65)}.status-success{border-color:rgb(var(--cm-success)/.45)}.status-running{border-color:rgb(var(--cm-info))}.is-running :deep(.v-icon){animation:node-running 1s linear infinite}
.flux-node :deep(.vue-flow__handle){width:10px;height:10px;min-width:10px;min-height:10px;border:2px solid rgb(var(--cm-fg-dim));background:rgb(var(--cm-surface-1));z-index:4;transition:background-color 160ms,border-color 160ms,box-shadow 160ms}.node-target{left:-1px!important;top:50%!important}.node-source{right:-1px!important}.flux-node :deep(.vue-flow__handle:hover),.flux-node :deep(.vue-flow__handle.connecting){border-color:rgb(var(--cm-accent-ink));background:rgb(var(--cm-accent));box-shadow:0 0 0 5px rgb(var(--cm-accent)/.14)}.node-port-label{position:absolute;left:calc(100% + 10px);pointer-events:none;font:500 12px/14px var(--trama-font-code,Consolas,monospace);color:rgb(var(--cm-fg-muted));background:rgb(var(--cm-stage));padding:0 3px;border-radius:3px;white-space:nowrap}
@keyframes node-running{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.flux-node,.flux-node::before,.flux-node :deep(.vue-flow__handle){transition:none}.is-running :deep(.v-icon){animation:none}}
</style>
