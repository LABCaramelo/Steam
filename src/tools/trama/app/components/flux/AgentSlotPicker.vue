<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '@trama/components/AppIcon.vue'
import NodePicker from '@trama/components/flux/NodePicker.vue'

const props = defineProps({
  modelValue: Boolean,
  slot: { type: String, default: 'model', validator: value => ['model', 'memory', 'tools'].includes(value) },
})
const emit = defineEmits(['update:modelValue', 'select'])
const selection = ref(null)
const content = computed(() => props.slot === 'memory' ? {
  title: 'Adicionar memória',
  description: 'Dê continuidade às conversas do agente com contexto por sessão.',
  empty: 'Selecione uma memória para conectar ao agente.',
  icon: 'mdi-database-outline',
} : {
  title: 'Adicionar modelo',
  description: 'Escolha o provedor que vai gerar as respostas do agente.',
  empty: 'Selecione um provedor para conectar ao agente.',
  icon: 'mdi-creation-outline',
})
const choices = computed(() => props.slot === 'memory' ? [{
  app: 'agent_memory',
  title: 'Memória de conversa',
  description: 'Mantém o histórico entre mensagens com o mesmo ID de sessão.',
  detail: 'Contexto por sessão',
  config: { type: 'history', session_id: '{{$IN.SESSION_ID}}' },
}] : [{
  app: 'chatgpt',
  title: 'OpenAI / compatível',
  description: 'Use uma conexão OpenAI ou outra API compatível para respostas e ferramentas.',
  detail: 'Respostas e ferramentas',
  config: { provider: 'openai' },
}, {
  app: 'anthropic',
  title: 'Anthropic Claude',
  description: 'Use os modelos Claude para gerar respostas. Ferramentas ainda não estão disponíveis com este provedor.',
  detail: 'Respostas',
  config: { provider: 'anthropic' },
}])
const selected = computed(() => choices.value.find(choice => choice.app === selection.value))
function close() { emit('update:modelValue', false) }
function confirmSelection() {
  if (!selected.value) return
  emit('select', { app: selected.value.app, agentRole: props.slot, config: { ...selected.value.config } })
  close()
}
function selectTool(choice) {
  emit('select', { ...(typeof choice === 'string' ? { app: choice } : choice), agentRole: 'tools' })
}
watch(() => [props.modelValue, props.slot], () => { selection.value = null })
</script>

<template>
  <NodePicker v-if="slot === 'tools'" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" @select="selectTool" />
  <v-dialog v-else :model-value="modelValue" width="660" scrollable :aria-label="content.title" @update:model-value="emit('update:modelValue', $event)">
    <v-card class="agent-slot-picker cm-surface">
      <header class="slot-heading">
        <div>
          <p class="slot-eyebrow">TRAMA / AGENTE IA</p>
          <h2>{{ content.title }}</h2>
        </div>
        <button type="button" class="slot-close" :aria-label="`Fechar ${content.title.toLocaleLowerCase('pt-BR')}`" @click="close"><v-icon icon="mdi-close" size="20" /></button>
      </header>
      <div class="slot-body">
        <p class="slot-intro">{{ content.description }}</p>
        <div class="slot-choices" :class="{ 'slot-choices--single': choices.length === 1 }">
          <button v-for="choice in choices" :key="choice.app" type="button" class="slot-choice" :class="{ 'is-selected': selection === choice.app }" :aria-pressed="selection === choice.app" :data-agent-app="choice.app" @click="selection = choice.app">
            <span class="slot-choice-top"><AppIcon :app="choice.app" :size="42" :rounded="10" /><span class="slot-check" aria-hidden="true"><v-icon :icon="selection === choice.app ? 'mdi-check-circle' : 'mdi-circle-outline'" size="18" /></span></span>
            <strong>{{ choice.title }}</strong>
            <span class="slot-choice-description">{{ choice.description }}</span>
            <span class="slot-choice-detail"><v-icon :icon="content.icon" size="14" />{{ choice.detail }}</span>
          </button>
        </div>
        <p v-if="slot === 'model'" class="slot-next"><v-icon icon="mdi-arrow-right" size="16" />Depois de salvar, escolha a conexão e o modelo no nó conectado.</p>
      </div>
      <footer class="slot-footer">
        <p aria-live="polite">{{ selected?.title || content.empty }}</p>
        <button type="button" class="slot-save" :disabled="!selected" @click="confirmSelection"><v-icon icon="mdi-check" size="18" />Salvar</button>
      </footer>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.agent-slot-picker{display:flex;flex-direction:column;position:relative;max-height:min(760px,90dvh);font-family:var(--trama-font-ui,Inter,sans-serif);background:rgb(var(--cm-surface-1));color:rgb(var(--cm-fg));border:1px solid rgb(var(--cm-line-strong));border-radius:var(--trama-radius-xl,16px)!important;overflow:hidden;box-shadow:var(--trama-shadow-float)}
.agent-slot-picker::before{content:'';position:absolute;z-index:1;inset:0 0 auto;height:2px;background:var(--cm-spectrum-gradient);pointer-events:none}
.slot-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px 26px 20px;border-bottom:1px solid rgb(var(--cm-line));background:rgb(var(--cm-surface-2));flex:none}
.slot-eyebrow{font:600 11px/1.5 var(--trama-font-code,monospace);letter-spacing:.1em;color:rgb(var(--cm-fg-muted));margin:0 0 8px}
.slot-heading h2{font:800 27px/1.15 var(--trama-font-display,Montserrat,sans-serif);letter-spacing:-.045em}
.slot-close{display:grid;place-items:center;flex:none;width:40px;height:40px;border:1px solid rgb(var(--cm-line));border-radius:9px;background:transparent;color:rgb(var(--cm-fg-muted));cursor:pointer}
.slot-close:hover{background:rgb(var(--cm-surface-3));color:rgb(var(--cm-fg))}
.slot-body{padding:22px 26px 26px;overflow:auto;min-height:0}
.slot-intro{font-size:14px;line-height:1.65;color:rgb(var(--cm-fg-muted));margin:0 0 20px;max-width:48ch}
.slot-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.slot-choices--single{grid-template-columns:1fr}
.slot-choice{display:flex;flex-direction:column;align-items:stretch;gap:13px;min-width:0;padding:18px;text-align:left;border:1px solid rgb(var(--cm-line-strong));border-radius:12px;background:rgb(var(--cm-surface-2));color:rgb(var(--cm-fg));cursor:pointer;transition:background-color 160ms,border-color 160ms,box-shadow 160ms,transform 80ms}
.slot-choice:hover{background:rgb(var(--cm-surface-3));border-color:rgb(var(--cm-fg-muted))}
.slot-choice.is-selected{border-color:rgb(var(--cm-focus));box-shadow:inset 0 0 0 1px rgb(var(--cm-focus)/.2);background:rgb(var(--cm-surface-3))}
.slot-choice-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.slot-check{color:rgb(var(--cm-fg-dim));display:grid;place-items:center;width:20px;height:20px}
.is-selected .slot-check{color:rgb(var(--cm-focus))}
.slot-choice strong{font:700 15px/1.4 var(--trama-font-ui,Inter,sans-serif);letter-spacing:-.015em}
.slot-choice-description{font-size:13px;line-height:1.65;color:rgb(var(--cm-fg-muted));flex:1}
.slot-choice-detail{display:flex;align-items:center;gap:6px;font-size:11px;line-height:1.5;color:rgb(var(--cm-fg-2));padding-top:12px;border-top:1px solid rgb(var(--cm-line))}
.slot-next{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.6;color:rgb(var(--cm-fg-muted));margin:18px 0 0}
.slot-next .v-icon{margin-top:2px;flex:none;color:rgb(var(--cm-accent-ink))}
.slot-footer{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:17px 26px;background:rgb(var(--cm-surface-2));border-top:1px solid rgb(var(--cm-line));flex:none}
.slot-footer p{font-size:12px;line-height:1.55;color:rgb(var(--cm-fg-muted));margin:0;min-width:0}
.slot-save{display:flex;align-items:center;justify-content:center;gap:8px;min-width:136px;min-height:44px;padding:10px 20px;border:1px solid rgb(255 244 232/.8);border-radius:8px;background:rgb(255 244 232);color:#141318;font:750 13px/1.4 var(--trama-font-ui,Inter,sans-serif);cursor:pointer;transition:background-color 160ms,box-shadow 160ms,transform 80ms}
.slot-save:hover:not(:disabled){background:#fffaf4;box-shadow:0 0 0 3px rgb(255 244 232/.12)}
.slot-save:disabled{opacity:.4;cursor:default}
.slot-choice:focus-visible,.slot-close:focus-visible,.slot-save:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:3px}
.slot-choice:active,.slot-close:active,.slot-save:active:not(:disabled){transform:translateY(1px)}
@media(max-width:600px){.slot-heading{padding:20px}.slot-heading h2{font-size:24px}.slot-body{padding:20px}.slot-choices{grid-template-columns:1fr}.slot-choice{padding:16px}.slot-intro{font-size:14px}.slot-close{width:44px;height:44px}.slot-footer{padding:16px 20px;gap:14px}.slot-save{min-width:116px}.slot-eyebrow{font-size:10px}}
@media(prefers-reduced-motion:reduce){.slot-choice,.slot-close,.slot-save{transition:none}}
</style>
