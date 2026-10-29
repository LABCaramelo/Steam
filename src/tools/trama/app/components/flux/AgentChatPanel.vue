<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { chatWithAgent } from '@trama/services/api'
import CarameloAction from '@trama/components/CarameloAction.vue'

const props = defineProps({ fluxId: { type: String, required: true }, stepId: { type: [String, Number], required: true }, input: { default: undefined }, prepare: { type: Function, required: true } })
const emit = defineEmits(['tested'])
const messages = ref([]), message = ref(''), pending = ref(false), error = ref(''), transcript = ref(null), composer = ref(null)
const newId = () => crypto.randomUUID()
let sessionId = newId(), alive = true, generation = 0
const printable = value => typeof value === 'string' ? value : value === undefined || value === null ? '' : JSON.stringify(value, null, 2)
async function scroll() { await nextTick(); if (transcript.value) transcript.value.scrollTop = transcript.value.scrollHeight }
function restart() { if (pending.value) return; generation++; sessionId = newId(); messages.value = []; message.value = ''; error.value = ''; nextTick(() => composer.value?.focus()) }
watch(() => props.stepId, restart)
async function send() {
  const text = message.value.trim()
  if (!text || pending.value) return
  error.value = ''
  const current = ++generation
  pending.value = true
  try {
    const step = await props.prepare(text)
    if (!alive || generation !== current) return
    messages.value.push({ id: newId(), role: 'user', text }); message.value = ''; scroll()
    const execution = await chatWithAgent(props.fluxId, props.stepId, { message: text, session_id: sessionId, input: props.input ?? {}, step })
    if (!alive || generation !== current) return
    emit('tested', execution)
    const record = execution.steps?.findLast(item => String(item.id) === String(props.stepId))
    if (execution.status !== 'success' || record?.status === 'error') throw new Error(record?.error?.message || printable(record?.error) || execution.error?.message || 'Não foi possível concluir esta mensagem.')
    const tools = execution.steps?.filter(item => item.tool_of !== undefined).length ?? 0
    messages.value.push({ id: newId(), role: 'assistant', text: printable(execution.response) || 'O agente concluiu a execução sem texto de resposta.', tools })
  } catch (failure) { if (alive && generation === current) error.value = failure.userMessage || failure.message }
  finally { if (alive && generation === current) { pending.value = false; scroll(); nextTick(() => composer.value?.focus()) } }
}
function keydown(event) { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send() } }
onBeforeUnmount(() => { alive = false; generation++ })
defineExpose({ focus: () => composer.value?.focus() })
</script>

<template>
  <section class="agent-chat" aria-label="Chat de teste do agente">
    <header class="agent-chat__header"><div><strong>Converse com o agente</strong><p>Teste as instruções, a memória e as ferramentas conectadas.</p></div><button type="button" :disabled="pending" aria-label="Iniciar nova conversa de teste" title="Iniciar nova conversa" @click="restart"><v-icon icon="mdi-chat-plus-outline" size="20" /></button></header>
    <div ref="transcript" class="agent-chat__transcript" role="log" aria-label="Mensagens de teste" aria-live="polite" :aria-busy="pending">
      <div v-if="!messages.length" class="agent-chat__empty"><v-icon icon="mdi-robot-outline" size="34" /><strong>Sua conversa começa aqui</strong><p>Envie uma mensagem para testar o agente. Cada nova conversa usa outra sessão de memória.</p></div>
      <article v-for="entry in messages" :key="entry.id" class="agent-chat__message" :class="`agent-chat__message--${entry.role}`"><span>{{ entry.role === 'user' ? 'Você' : 'Agente' }}</span><p>{{ entry.text }}</p><small v-if="entry.tools">{{ entry.tools }} {{ entry.tools === 1 ? 'etapa de ferramenta executada' : 'etapas de ferramentas executadas' }}</small></article>
      <p v-if="pending" class="agent-chat__pending"><v-icon icon="mdi-loading mdi-spin" size="17" />O agente está respondendo…</p>
    </div>
    <p v-if="error" class="agent-chat__error" role="alert">{{ error }}</p>
    <form class="agent-chat__composer" @submit.prevent="send"><label class="agent-chat__label" for="agent-chat-message">Mensagem de teste</label><textarea id="agent-chat-message" ref="composer" v-model="message" rows="3" maxlength="12000" placeholder="Digite sua mensagem…" :disabled="pending" @keydown="keydown" /><div><small>Enter envia · Shift + Enter quebra a linha</small><CarameloAction tone="cream" :disabled="pending || !message.trim()" type="submit"><v-icon :icon="pending ? 'mdi-loading mdi-spin' : 'mdi-arrow-up'" size="18" />Enviar</CarameloAction></div></form>
    <p class="agent-chat__note">As ferramentas conectadas podem executar ações durante o teste.</p>
  </section>
</template>

<style scoped>
.agent-chat{display:flex;flex-direction:column;min-height:460px;height:100%;gap:14px}.agent-chat__header{display:flex;align-items:flex-start;gap:12px;padding-bottom:14px;border-bottom:1px solid rgb(var(--cm-line))}.agent-chat__header>div{flex:1}.agent-chat__header strong{font-size:14px}.agent-chat__header p,.agent-chat__empty p,.agent-chat__note{font-size:12px;line-height:1.6;color:rgb(var(--cm-fg-muted));margin:6px 0 0}.agent-chat__header button{flex:none;display:grid;place-items:center;width:40px;height:40px;border:1px solid rgb(var(--cm-line));border-radius:10px;color:rgb(var(--cm-fg))}.agent-chat__header button:disabled{opacity:.45}.agent-chat__transcript{flex:1;min-height:180px;overflow:auto;scrollbar-width:thin;display:flex;flex-direction:column;gap:14px}.agent-chat__empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;flex:1;padding:24px 12px;color:rgb(var(--cm-fg-muted));gap:10px}.agent-chat__empty strong{color:rgb(var(--cm-fg));font-size:14px}.agent-chat__message{padding:12px;border:1px solid rgb(var(--cm-line));border-radius:12px;background:rgb(var(--cm-surface-2));max-width:96%;align-self:flex-start;overflow-wrap:anywhere}.agent-chat__message--user{align-self:flex-end;background:rgb(var(--cm-surface-3))}.agent-chat__message>span{font-size:11px;font-weight:700;color:rgb(var(--cm-fg-muted))}.agent-chat__message p{margin:6px 0 0;white-space:pre-wrap;font-size:13px;line-height:1.65}.agent-chat__message small{display:block;margin-top:8px;color:rgb(var(--cm-fg-muted));font-size:11px}.agent-chat__pending{display:flex;align-items:center;gap:8px;font-size:12px;color:rgb(var(--cm-fg-muted))}.agent-chat__error{margin:0;padding:10px;border:1px solid rgb(var(--cm-danger)/.3);background:rgb(var(--cm-danger-soft));color:rgb(var(--cm-danger));border-radius:8px;font-size:12px;line-height:1.6}.agent-chat__label{display:block;font-size:12px;font-weight:600;margin-bottom:8px}.agent-chat__composer textarea{width:100%;resize:vertical;min-height:88px;max-height:200px;border:1px solid rgb(var(--cm-line-strong));border-radius:10px;padding:11px;color:rgb(var(--cm-fg));background:rgb(var(--cm-surface-2));font:inherit;line-height:1.6}.agent-chat__composer textarea:focus{outline:2px solid rgb(var(--cm-focus));outline-offset:2px}.agent-chat__composer>div{display:flex;gap:10px;justify-content:space-between;align-items:center;margin-top:10px}.agent-chat__composer small{font-size:10px;color:rgb(var(--cm-fg-muted));line-height:1.5}.agent-chat__note{font-size:11px;margin:0}.agent-chat__header button:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:2px}@media(max-width:600px){.agent-chat{min-height:480px}.agent-chat__message p{font-size:14px}.agent-chat__composer small{font-size:11px}}
</style>
