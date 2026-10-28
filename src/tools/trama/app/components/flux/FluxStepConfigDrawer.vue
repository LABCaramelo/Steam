<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@trama/components/AppIcon.vue'
import NewConnectionModal from '@trama/components/connections/NewConnectionModal.vue'
import * as api from '@trama/services/api'
import { getApp } from '@trama/services/apps'
import { canonicalApp, createStepDraft, prepareStepDraft, schemaForStep, validateStepDraft } from '@trama/services/nodeSchemas'
import { toastError, toastInfo, toastSuccess } from '@trama/composables/useToast'
import MappedInput from './MappedInput.vue'
import JsonTree from './JsonTree.vue'
import VariableTree from './VariableTree.vue'
import FunctionPicker from './FunctionPicker.vue'
import CodeInput from './fields/CodeInput.vue'

const props = defineProps({ step: { type: Object, required: true }, index: { type: Number, default: 0 }, allSteps: { type: Array, default: () => [] }, fluxId: { type: String, required: true }, outputs: { type: Object, default: () => ({}) }, lastExecution: { type: Object, default: null }, testInput: { default: undefined }, edges: { type: Array, default: undefined } })
const emit = defineEmits(['close', 'update', 'delete', 'tested', 'input-update'])
const dialog = ref(null), draft = ref(createStepDraft(props.step)), activeTab = ref('variables'), search = ref(''), advancedOpen = ref(false), newConnOpen = ref(false), testDataOpen = ref(false), testDataText = ref(''), testDataError = ref(''), localTestInput = ref(props.testInput), errors = ref({}), testing = ref(false), testedRecord = ref(null), testedExecution = ref(null), generalError = ref(''), editingTitle = ref(false), mobilePanel = ref('config'), webhookInfo = ref(null), webhookMode = ref('async'), copying = ref(false)
const fieldRefs = new Map()
let focusedField = null, previousFocus = null, alive = true
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const app = computed(() => canonicalApp(draft.value.app))
const schema = computed(() => schemaForStep(draft.value))
const isTrigger = computed(() => ['webhook', 'scheduler', 'activator'].includes(app.value) || props.index === 0 && !!getApp(draft.value.app).trigger)
const hasConnection = computed(() => !!schema.value.connection)
const requiresConnection = computed(() => hasConnection.value && !schema.value.connectionOptional)
const title = computed(() => draft.value.title || draft.value.label || schema.value.title || getApp(draft.value.app).title)
const visibleFields = computed(() => schema.value.fields.filter(field => !field.advanced || advancedOpen.value))
const hasAdvanced = computed(() => schema.value.fields.some(field => field.advanced))
const matchingConnections = computed(() => (api.db.connections || []).filter(connection => canonicalApp(connection.app) === app.value || app.value === 'ai_agent' && ['chatgpt', 'openai', 'anthropic', 'claude'].includes(connection.app)))
const selectedConnection = computed(() => matchingConnections.value.find(connection => connection.id === draft.value.connection_id))
const webhookUrl = computed(() => webhookMode.value === 'sync' ? webhookInfo.value?.sync_url : webhookInfo.value?.async_url)
const originalRecord = computed(() => props.lastExecution?.steps?.findLast(record => String(record.id) === String(props.step.id)) || (props.outputs[props.step.id] !== undefined ? { status: 'success', output: props.outputs[props.step.id] } : null))
const outputRecord = computed(() => testedRecord.value || originalRecord.value)
const output = computed(() => outputRecord.value?.output)
const hasOutput = computed(() => outputRecord.value && Object.hasOwn(outputRecord.value, 'output') && output.value !== undefined)
const outputTree = computed(() => output.value !== null && typeof output.value === 'object' ? output.value : { result: output.value })
const outputStatus = computed(() => ({ success: 'Sucesso!', skipped: 'Ignorado', filtered: 'Filtrado', cancelled: 'Cancelado', interrupted: 'Interrompido', running: 'Executando…', queued: 'Aguardando…' })[outputRecord.value?.status] || 'Resultado')
const outputError = computed(() => outputRecord.value?.error || (outputRecord.value?.status === 'error' ? 'Não foi possível executar este módulo.' : ''))
const actualInput = computed(() => localTestInput.value ?? testedExecution.value?.input ?? props.lastExecution?.input ?? webhookInfo.value?.last_input)
const upstreamIds = computed(() => {
  if (props.edges === undefined) return null
  const found = new Set()
  const visit = id => { for (const edge of props.edges) if (String(edge.target) === String(id) && !found.has(String(edge.source))) { found.add(String(edge.source)); visit(edge.source) } }
  visit(props.step.id)
  return found
})
const variableGroups = computed(() => {
  const input = actualInput.value
  const groups = [{ id: 'IN', displayId: 'IN', app: 'webhook', title: 'Webhook', output: input === undefined ? undefined : input?.BODY !== undefined ? input : { BODY: input } }]
  for (const [index, step] of props.allSteps.entries()) {
    if (String(step.id) === String(props.step.id) || ['webhook', 'scheduler', 'activator'].includes(canonicalApp(step.app))) continue
    if (upstreamIds.value ? !upstreamIds.value.has(String(step.id)) : index >= props.index) continue
    const record = (testedExecution.value?.steps || props.lastExecution?.steps || []).findLast(item => String(item.id) === String(step.id))
    const value = props.outputs[step.id] ?? record?.output ?? step.last_output
    groups.push({ id: String(step.id), displayId: step.variable_id || step.id, app: step.app, title: step.title || getApp(step.app).title, output: typeof value === 'object' || value === undefined || value === null ? value : { result: value } })
  }
  return groups
})
watch(() => props.step.id, () => { draft.value = createStepDraft(props.step); errors.value = {}; generalError.value = ''; testedRecord.value = null; testedExecution.value = null; fieldRefs.clear(); focusedField = null; loadWebhook() })
watch(() => props.testInput, input => { localTestInput.value = clone(input) })
function fieldValue(field) { const value = draft.value.config[field.key]; return field.type === 'json' && typeof value === 'object' ? JSON.stringify(value, null, 2) : value ?? '' }
function setField(field, value) { draft.value.config[field.key] = value; delete errors.value[field.key] }
function rememberField(key) { focusedField = key }
function registerField(key, element) { if (element) fieldRefs.set(key, element); else fieldRefs.delete(key) }
async function insertVariable(reference) {
  const target = fieldRefs.get(focusedField)
  if (target?.insert) target.insert(reference)
  else { await navigator.clipboard.writeText(reference); toastInfo({ text: 'Variável copiada. Clique em um campo para inserir diretamente.' }) }
}
async function loadWebhook() {
  webhookInfo.value = null
  if (!api.db.capabilities?.external_webhooks || canonicalApp(props.step.app) !== 'webhook' || typeof api.getWebhookInfo !== 'function') return
  try { const info = await api.getWebhookInfo(props.fluxId); if (alive) webhookInfo.value = info } catch (error) { generalError.value = error.userMessage || error.message }
}
async function copyWebhook() {
  if (!webhookUrl.value) return
  try { await navigator.clipboard.writeText(webhookUrl.value); copying.value = true; setTimeout(() => (copying.value = false), 1200) } catch { toastError({ text: 'Não foi possível copiar o link.' }) }
}
function save() {
  errors.value = validateStepDraft(draft.value)
  if (requiresConnection.value && !draft.value.connection_id) errors.value.connection_id = 'Selecione uma conexão.'
  if (Object.keys(errors.value).length) { generalError.value = 'Revise os campos destacados antes de salvar.'; return }
  generalError.value = ''
  emit('update', prepareStepDraft(draft.value))
  emit('close')
}
async function test() {
  errors.value = validateStepDraft(draft.value)
  if (requiresConnection.value && !draft.value.connection_id) errors.value.connection_id = 'Selecione uma conexão.'
  if (Object.keys(errors.value).length) { generalError.value = 'Revise os campos destacados antes de testar.'; return }
  generalError.value = ''
  testing.value = true
  try {
    if (typeof api.testFluxStep !== 'function') throw new Error('O serviço de teste ainda não está disponível. Verifique se o servidor está em execução.')
    const context = Object.fromEntries(variableGroups.value.filter(group => group.output !== undefined).map(group => [group.id, clone(group.output)]))
    const result = await api.testFluxStep(props.fluxId, props.step.id, { step: prepareStepDraft(draft.value), input: actualInput.value ?? {}, context })
    if (!alive) return
    testedExecution.value = result
    testedRecord.value = result.steps?.findLast(record => String(record.id) === String(props.step.id)) || { status: result.status, output: result.output, error: result.error }
    emit('tested', result)
    if (testedRecord.value.status === 'success') toastSuccess({ text: 'Teste concluído.' })
    mobilePanel.value = 'output'
  } catch (error) { if (alive) testedRecord.value = { status: 'error', error: error.userMessage || error.message, output: error.output } }
  finally { if (alive) testing.value = false }
}
function editInput() { testDataText.value = JSON.stringify(actualInput.value ?? {}, null, 2); testDataError.value = ''; testDataOpen.value = true }
function applyInput() { try { localTestInput.value = JSON.parse(testDataText.value); draft.value.config.sample = clone(localTestInput.value); emit('input-update', clone(localTestInput.value)); testDataOpen.value = false } catch { testDataError.value = 'Informe um JSON válido.' } }
function connectionCreated(connection) { draft.value.connection_id = connection.id; delete errors.value.connection_id }
function close() { emit('close') }
function keydown(event) {
  if (newConnOpen.value || testDataOpen.value) return
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save() }
  if (event.key === 'Tab') {
    const elements = [...dialog.value.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[contenteditable="true"],a[href]')].filter(el => el.getClientRects().length && el.tabIndex !== -1)
    const first = elements[0], last = elements.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
}
onMounted(async () => { previousFocus = document.activeElement; document.addEventListener('keydown', keydown); await loadWebhook(); await nextTick(); dialog.value?.querySelector('.node-config__close')?.focus({ preventScroll: true }) })
onBeforeUnmount(() => { alive = false; document.removeEventListener('keydown', keydown); previousFocus?.focus?.({ preventScroll: true }) })
</script>

<template>
  <div class="node-dialog-backdrop" @mousedown.self="close">
    <div ref="dialog" class="node-dialog" role="dialog" aria-modal="true" :aria-label="`Configurar ${title}`" @mousedown.stop>
      <nav class="node-dialog__mobile-tabs" aria-label="Painéis do módulo"><button :class="{ selected: mobilePanel === 'input' }" @click="mobilePanel = 'input'">Entrada</button><button :class="{ selected: mobilePanel === 'config' }" @click="mobilePanel = 'config'">Configuração</button><button :class="{ selected: mobilePanel === 'output' }" @click="mobilePanel = 'output'">Saída</button></nav>
      <aside class="node-side-panel node-input" :class="{ 'mobile-visible': mobilePanel === 'input' }">
        <header class="node-panel-title">Entrada</header>
        <div class="node-input-tabs" role="tablist"><button role="tab" :aria-selected="activeTab === 'variables'" :class="{ selected: activeTab === 'variables' }" @click="activeTab = 'variables'"><v-icon icon="mdi-code-tags" size="15" />Variáveis</button><button role="tab" :aria-selected="activeTab === 'functions'" :class="{ selected: activeTab === 'functions' }" @click="activeTab = 'functions'"><v-icon icon="mdi-cog-outline" size="14" />Funções</button></div>
        <div class="node-input__search"><v-icon icon="mdi-magnify" size="16" /><input v-model="search" :aria-label="activeTab === 'variables' ? 'Buscar variáveis' : 'Buscar funções'" /></div>
        <div class="node-input__tree"><VariableTree v-if="activeTab === 'variables'" :groups="variableGroups" :search="search" @select="insertVariable" /><FunctionPicker v-else :search="search" @select="insertVariable" /></div>
        <button class="node-input__edit-data" @click="editInput"><v-icon icon="mdi-code-json" size="14" />Dados de teste</button>
      </aside>

      <section class="node-config" :class="{ 'mobile-visible': mobilePanel === 'config' }">
        <header class="node-config__header"><input v-if="editingTitle" v-model="draft.title" class="node-config__title-input" aria-label="Nome do módulo" autofocus @blur="editingTitle = false" @keydown.enter="editingTitle = false" /><button v-else class="node-config__title" @click="draft.title = title; editingTitle = true">{{ title }}<v-icon icon="mdi-pencil" size="15" /></button><div class="node-config__header-actions"><button class="node-config__close" aria-label="Fechar configuração do módulo" @click="close"><v-icon icon="mdi-close" size="15" /></button></div></header>
        <div class="node-config__body">
          <div v-if="hasConnection" class="node-connection-wrap"><div class="node-connection" :class="{ invalid: errors.connection_id }"><span class="node-connection__icon"><AppIcon :app="selectedConnection?.app || draft.app" :size="20" :rounded="2" /></span><select v-model="draft.connection_id" aria-label="Conexão" @change="delete errors.connection_id"><option :value="undefined" :disabled="requiresConnection">{{ requiresConnection ? 'Selecione uma conexão' : 'Sem autenticação' }}</option><option v-for="connection in matchingConnections" :key="connection.id" :value="connection.id">{{ connection.name }}</option></select><v-icon icon="mdi-chevron-down" size="16" class="node-connection__chevron" /><button class="node-connection__add" aria-label="Adicionar conexão" @click="newConnOpen = true"><v-icon icon="mdi-plus" size="22" /></button></div><p v-if="errors.connection_id" class="node-field-error">{{ errors.connection_id }}</p></div>
          <p class="node-config__description">{{ schema.description }}</p>
          <div class="node-config__fields">
            <p v-if="['scheduler', 'webhook', 'code'].includes(app)" class="node-error-banner">{{ app === 'code' ? 'O código pode ser guardado no fluxo, mas a execução de JavaScript ainda não está disponível.' : app === 'scheduler' ? 'Agendamentos ainda não estão disponíveis. Use Rodar para executar manualmente.' : 'Webhooks externos ainda não estão disponíveis. Defina uma entrada de teste e use Rodar.' }}</p><template v-if="app === 'webhook' && api.db.capabilities?.external_webhooks">
              <div class="node-field"><label>Link de ativação <span class="node-label-help">ⓘ</span></label><div class="node-webhook-url"><input :value="webhookUrl || 'Carregando link…'" readonly aria-label="Link de ativação do Webhook" /><button :disabled="!webhookUrl" :aria-label="copying ? 'Link copiado' : 'Copiar link do Webhook'" @click="copyWebhook"><v-icon :icon="copying ? 'mdi-check' : 'mdi-content-copy'" size="16" /></button></div></div>
              <div class="node-webhook-modes"><label><input v-model="webhookMode" type="radio" value="async" />Assíncrono</label><label><input v-model="webhookMode" type="radio" value="sync" />Síncrono</label></div>
              <button class="node-test-primary" :disabled="testing" @click="test"><v-icon :icon="testing ? 'mdi-loading mdi-spin' : 'mdi-play-outline'" size="16" />{{ testing ? 'Testando…' : 'Testar Webhook' }}</button>
              <div class="node-webhook-recent"><h4>Execuções recentes</h4><div class="node-webhook-recent__head"><span>Origem</span><span>Executado em</span><span>Resultado</span></div><p v-if="!webhookInfo?.last_received_at">Nenhum teste realizado ainda</p><div v-else class="node-webhook-recent__item"><span>Webhook</span><span>{{ new Date(webhookInfo.last_received_at).toLocaleString('pt-BR') }}</span><button @click="editInput">Ver entrada</button></div></div>
            </template>
            <div v-for="field in visibleFields" :key="`${draft.app}-${field.key}`" class="node-field">
              <div class="node-field__label-row"><label :for="`node-field-${field.key}`">{{ field.label }}<span v-if="field.required" class="node-required">*</span><span v-if="field.hint || field.required" class="node-label-help" :title="field.hint || 'Campo obrigatório'">ⓘ</span></label><label v-if="field.custom" class="node-custom-toggle">Customizado<input v-model="draft.config[`${field.key}_custom`]" type="checkbox" role="switch" /></label></div>
              <CodeInput v-if="['json', 'code'].includes(field.type)" :ref="el => registerField(field.key, el)" :model-value="fieldValue(field)" :language="field.type === 'json' ? 'json' : field.language || 'javascript'" :rows="field.rows || 10" :label="field.label" :invalid="!!errors[field.key]" @focus="rememberField(field.key)" @update:model-value="setField(field, $event)" />
              <select v-else-if="field.type === 'select' && !draft.config[`${field.key}_custom`]" :id="`node-field-${field.key}`" v-model="draft.config[field.key]" class="node-select" :class="{ invalid: errors[field.key] }" :aria-label="field.label" @change="delete errors[field.key]"><option v-for="option in field.options || []" :key="String(typeof option === 'object' ? option.value : option)" :value="typeof option === 'object' ? option.value : option">{{ typeof option === 'object' ? option.title || option.label : option }}</option></select>
              <label v-else-if="field.type === 'boolean'" class="node-boolean"><input :id="`node-field-${field.key}`" v-model="draft.config[field.key]" type="checkbox" role="switch" />{{ draft.config[field.key] ? 'Sim' : 'Não' }}</label>
              <input v-else-if="field.type === 'number'" :id="`node-field-${field.key}`" v-model="draft.config[field.key]" type="number" class="node-number" :class="{ invalid: errors[field.key] }" :min="field.min" :max="field.max" :step="field.step || 1" :aria-label="field.label" @input="delete errors[field.key]" />
              <MappedInput v-else :ref="el => registerField(field.key, el)" :model-value="fieldValue(field)" :multiline="field.type === 'textarea'" :rows="field.rows || (field.type === 'textarea' ? 3 : 1)" :label="field.label" :placeholder="field.placeholder" :invalid="!!errors[field.key]" @focus="rememberField(field.key)" @update:model-value="setField(field, $event)" />
              <p v-if="errors[field.key]" class="node-field-error">{{ errors[field.key] }}</p>
            </div>
            <button v-if="hasAdvanced" class="node-advanced" :aria-expanded="advancedOpen" @click="advancedOpen = !advancedOpen"><v-icon :icon="advancedOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="14" />Opções avançadas</button><p v-if="generalError" class="node-error-banner" role="alert">{{ generalError }}</p>
          </div>
          <div v-if="!isTrigger && app !== 'filter'" class="node-fatal"><label for="node-is-fatal">Erro interrompe o fluxo</label><input id="node-is-fatal" v-model="draft.is_fatal" type="checkbox" role="switch" aria-label="Erro interrompe o fluxo" /></div>
        </div>
        <footer class="node-config__footer"><button class="node-save" @click="save">Salvar</button></footer>
      </section>

      <aside class="node-side-panel node-output" :class="{ 'mobile-visible': mobilePanel === 'output' }"><header class="node-panel-title">Saída</header><div class="node-output__body">
        <div v-if="hasOutput || outputError || testing" class="node-output__status-row"><span class="node-status" :class="{ 'node-status--error': outputError, 'node-status--loading': testing }"><v-icon :icon="testing ? 'mdi-loading mdi-spin' : outputError ? 'mdi-alert-circle-outline' : 'mdi-check'" size="12" />{{ testing ? 'Executando…' : outputError ? 'Erro' : outputStatus }}</span><button class="node-retest" :disabled="testing" @click="test"><v-icon icon="mdi-alert-circle" size="12" />Re-testar</button></div>
        <p v-if="outputError" class="node-output__error" role="alert">{{ typeof outputError === 'object' ? outputError.message || JSON.stringify(outputError) : outputError }}</p><JsonTree v-if="hasOutput" :value="outputTree" />
        <div v-if="!hasOutput && !outputError && !testing" class="node-output__empty"><svg viewBox="0 0 170 115" aria-hidden="true"><path d="M20 67h36m58 0h36M84 45V18M55 67c0-17 13-30 30-30s30 13 30 30-13 30-30 30S55 84 55 67Z" fill="none" stroke="currentColor" stroke-width="2"/><rect x="7" y="55" width="24" height="24" rx="5"/><rect x="139" y="55" width="24" height="24" rx="5"/><rect x="73" y="7" width="24" height="24" rx="5"/><path d="m74 67 7 7 14-15" fill="none" stroke="var(--node-panel-bg)" stroke-width="3"/></svg><h3>Nenhum dado de saída</h3><p>Teste este módulo para visualizar o resultado.</p><button class="node-empty-test" @click="test">Testar este módulo</button><button class="node-empty-data" @click="editInput">Utilizar dados de teste</button></div>
        <div v-if="testing && !hasOutput" class="node-output__loading"><v-icon icon="mdi-loading mdi-spin" size="28" /><p>Aguardando o resultado da execução…</p></div>
      </div></aside>
    </div>
    <NewConnectionModal v-model="newConnOpen" :initial-app="app" @created="connectionCreated" />
    <v-dialog v-model="testDataOpen" width="620" max-width="94vw"><section class="node-test-data"><header><h3>Dados de teste</h3><button aria-label="Fechar dados de teste" @click="testDataOpen = false"><v-icon icon="mdi-close" size="20" /></button></header><p>Insira o JSON de entrada para testar sua integração e gerar as variáveis.</p><CodeInput v-if="testDataOpen" v-model="testDataText" language="json" :rows="16" label="JSON de entrada para testes" :invalid="!!testDataError" /><p v-if="testDataError" class="node-field-error" role="alert">{{ testDataError }}</p><footer><button @click="testDataOpen = false">Cancelar</button><button class="node-save" @click="applyInput">Utilizar dados</button></footer></section></v-dialog>
  </div>
</template>

<style scoped>
.node-dialog-backdrop{--node-panel-bg:rgb(var(--v-theme-surface));position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.12);font-family:'Inter',sans-serif;color:rgb(var(--v-theme-on-surface));font-size:12px}
.node-dialog{position:absolute;inset:20px max(22px,3vw) 20px max(16px,2vw);display:grid;grid-template-columns:minmax(210px,24vw) minmax(340px,31.5vw) minmax(210px,24vw);justify-content:center;align-items:center;pointer-events:none;max-height:calc(100dvh - 40px)}
.node-dialog>section,.node-dialog>aside{pointer-events:auto}.node-side-panel,.node-config{min-width:0;background:var(--node-panel-bg);border:1px solid rgba(var(--v-theme-on-surface),.17);box-shadow:0 2px 9px #0003;border-radius:6px}.node-side-panel{height:calc(100% - 82px);display:flex;flex-direction:column;overflow:hidden}.node-panel-title{height:34px;flex:none;padding:9px 13px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.12);font-size:12px;font-weight:700}
.node-input{border-top-right-radius:0;border-bottom-right-radius:0;border-right:0}.node-output{border-top-left-radius:0;border-bottom-left-radius:0;border-left:0}.node-input-tabs{height:35px;display:grid;grid-template-columns:1fr 1fr;flex:none}.node-input-tabs button{display:flex;justify-content:center;align-items:center;gap:4px;font-size:11px;font-weight:700;color:rgb(var(--v-theme-primary));border-bottom:1px solid transparent}.node-input-tabs button.selected{border-bottom-color:rgb(var(--v-theme-primary))}.node-input__search{border:1px solid rgba(var(--v-theme-on-surface),.45);border-radius:5px;display:flex;align-items:center;gap:7px;height:27px;margin:9px 13px 7px;padding:0 7px;flex:none}.node-input__search .v-icon{opacity:.7}.node-input__search input{outline:none;border:0;min-width:0;width:100%;font-size:12px;color:inherit}.node-input__tree{padding:0 13px;overflow:auto;flex:1;min-height:0}.node-input__edit-data{font-size:10px;color:rgb(var(--v-theme-primary));opacity:.68;margin:7px 12px 10px;text-align:left;display:flex;align-items:center;gap:4px;width:max-content}.node-input__edit-data:hover{opacity:1}
.node-config{height:100%;display:flex;flex-direction:column;position:relative;z-index:2;overflow:hidden}.node-config__header{height:40px;padding:0 10px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.12);flex:none}.node-config__title{display:flex;align-items:center;gap:4px;text-align:left;flex:1;min-width:0;font-size:13px;font-weight:700;color:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.node-config__title-input{flex:1;min-width:0;outline:none;border-bottom:1px solid rgb(var(--v-theme-primary));font-size:13px;color:inherit}.node-config__header-actions{display:flex;align-items:center;gap:8px}.node-config__close{width:19px;height:24px;display:grid;place-items:center;color:inherit}.node-config__close:focus-visible{outline:1px solid rgb(var(--v-theme-primary));border-radius:3px}.node-tutorial{display:flex;align-items:center;gap:2px;font-size:9px;border:1px solid rgba(var(--v-theme-on-surface),.12);border-radius:3px;padding:0 3px;line-height:15px;background:rgba(var(--v-theme-on-surface),.07);color:inherit;text-decoration:none}
.node-config__body{display:flex;flex-direction:column;flex:1;min-height:0;padding:10px 10px 0}.node-connection-wrap{flex:none}.node-connection{display:flex;height:42px;border:1px solid #153e24;border-radius:4px;align-items:center;position:relative;overflow:hidden;background:rgba(var(--v-theme-on-surface),.015)}.node-connection:focus-within{border-color:rgb(var(--v-theme-primary))}.node-connection__icon{width:35px;flex:none;display:grid;place-items:center;pointer-events:none}.node-connection select{appearance:none;width:100%;height:100%;padding:0 22px 0 0;outline:none;color:inherit;font-size:12px;font-weight:700;min-width:0}.node-connection option,.node-select option{background:var(--node-panel-bg);color:inherit}.node-connection__chevron{position:absolute;right:53px;pointer-events:none;color:rgb(var(--v-theme-primary))}.node-connection__add{width:40px;height:100%;border-left:1px solid #153e24;flex:none;color:rgb(var(--v-theme-primary));display:grid;place-items:center}.node-connection__add:hover{background:rgba(var(--v-theme-primary),.08)}.node-config__description{font-size:10px;line-height:15px;color:rgba(var(--v-theme-on-surface),.56);padding:7px 0 8px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.1);margin-bottom:8px;flex:none}
.node-config__fields{overflow:auto;flex:1;min-height:0;padding-bottom:12px;scrollbar-width:thin}.node-field{margin-bottom:13px}.node-field__label-row{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-bottom:4px;min-height:16px}.node-field label{font-size:12px;line-height:16px}.node-required{color:rgb(var(--v-theme-primary));margin-left:2px;font-weight:700}.node-label-help{font-size:10px;color:#08c2d5;cursor:help;margin-left:3px}.node-select,.node-number{appearance:none;height:30px;border:1px solid rgba(var(--v-theme-on-surface),.43);border-radius:4px;outline:0;padding:4px 7px;background:transparent;width:100%;font-size:12px;color:inherit}.node-select{padding-right:25px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14'%3E%3Cpath d='m3 5 4 4 4-4' fill='none' stroke='%239eb2b1' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 7px center}.node-select:focus,.node-number:focus{border-color:rgb(var(--v-theme-primary))}.node-field-error{color:rgb(var(--v-theme-error));font-size:10px;line-height:16px;margin:4px 0 0}.invalid{border-color:rgb(var(--v-theme-error))!important}.node-custom-toggle{font-size:9px!important;display:flex;align-items:center;gap:6px}.node-custom-toggle input,.node-fatal input{appearance:none;width:27px;height:15px;background:#747a77;position:relative;border-radius:12px;cursor:pointer;border:1px solid rgba(var(--v-theme-on-surface),.15);flex:none;transition:background .15s}.node-custom-toggle input{width:19px;height:11px}.node-custom-toggle input:before,.node-fatal input:before{content:'';position:absolute;background:#202723;width:11px;height:11px;border-radius:50%;left:1px;top:1px;transition:transform .15s}.node-custom-toggle input:before{width:7px;height:7px}.node-custom-toggle input:checked,.node-fatal input:checked{background:rgb(var(--v-theme-primary))}.node-fatal input:checked:before{transform:translateX(12px)}.node-custom-toggle input:checked:before{transform:translateX(8px)}.node-boolean{display:flex;align-items:center;gap:8px;font-size:11px}.node-advanced{display:flex;align-items:center;gap:4px;font-size:10px;color:rgba(var(--v-theme-on-surface),.7);padding:3px 0}.node-fatal{height:45px;display:flex;align-items:center;justify-content:space-between;flex:none;padding:4px 2px 5px}.node-fatal label{font-size:12px}.node-config__footer{padding:9px 25px;border-top:1px solid rgba(var(--v-theme-on-surface),.12);flex:none;background:var(--node-panel-bg)}.node-save{display:block;background:rgb(var(--v-theme-primary));color:rgb(var(--v-theme-on-primary));border:0;border-radius:6px;width:100%;height:27px;font-size:11px;font-weight:700;cursor:pointer}.node-save:hover{filter:brightness(.95)}.node-save:focus-visible{outline:2px solid rgb(var(--v-theme-on-surface));outline-offset:2px}.node-error-banner{font-size:11px;line-height:1.5;color:rgb(var(--v-theme-error));background:rgba(var(--v-theme-error),.08);padding:8px;border-radius:4px;margin-top:8px}
.node-output__body{flex:1;min-height:0;overflow:auto;padding:14px 14px 14px 13px;scrollbar-width:thin}.node-output__status-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}.node-status{font-size:10px;display:inline-flex;align-items:center;gap:3px;border-radius:3px;padding:2px 6px;color:#39e094;background:rgba(14,165,91,.13);border:1px solid rgba(17,153,86,.12);line-height:15px}.node-status--error{color:rgb(var(--v-theme-error));background:rgba(var(--v-theme-error),.1);border-color:rgba(var(--v-theme-error),.12)}.node-status--loading{color:rgb(var(--v-theme-primary));background:rgba(var(--v-theme-primary),.1);border-color:transparent}.node-retest{display:flex;align-items:center;gap:4px;font-size:10px;color:#ffb452;white-space:nowrap}.node-retest:disabled{opacity:.5}.node-output__error{padding:8px 0 10px;overflow-wrap:anywhere;font-size:11px;line-height:1.6;color:rgb(var(--v-theme-error));white-space:pre-wrap}.node-output__empty{height:100%;min-height:245px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:10px 2px}.node-output__empty svg{width:145px;opacity:.23;color:rgb(var(--v-theme-primary));fill:currentColor;margin-bottom:15px}.node-output__empty h3{font-size:16px;margin-bottom:5px}.node-output__empty p{font-size:10px;opacity:.45;line-height:1.6}.node-empty-test{font-size:11px;padding:7px 16px;margin-top:13px;border-radius:4px;background:rgba(var(--v-theme-primary),.12);color:rgb(var(--v-theme-primary))}.node-empty-data{font-size:10px;color:rgb(var(--v-theme-primary));margin-top:12px;opacity:.75}.node-output__loading{min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-size:11px;opacity:.65}
.node-webhook-url{display:flex;border:1px solid rgba(var(--v-theme-on-surface),.4);border-radius:4px;overflow:hidden;margin-top:5px;height:32px}.node-webhook-url input{min-width:0;flex:1;outline:none;padding:4px 7px;font-size:10px;color:inherit}.node-webhook-url button{width:32px;flex:none;color:rgb(var(--v-theme-primary))}.node-webhook-url button:disabled{opacity:.4}.node-webhook-modes{display:flex;gap:15px;font-size:10px;align-items:center;margin:6px 0 13px}.node-webhook-modes label{display:flex;align-items:center;gap:5px}.node-webhook-modes input{accent-color:rgb(var(--v-theme-primary))}.node-test-primary{width:100%;padding:7px;display:flex;align-items:center;justify-content:center;gap:5px;color:rgb(var(--v-theme-primary));border-radius:4px;background:rgba(var(--v-theme-primary),.1);font-size:11px}.node-webhook-recent{margin-top:18px}.node-webhook-recent h4{font-size:12px;margin-bottom:10px}.node-webhook-recent__head,.node-webhook-recent__item{display:grid;grid-template-columns:.7fr 1.4fr .8fr;gap:4px;font-size:9px;border-bottom:1px solid rgba(var(--v-theme-on-surface),.12);padding:7px 3px}.node-webhook-recent>p{text-align:center;font-size:10px;opacity:.5;padding:14px 0}.node-webhook-recent__item button{color:rgb(var(--v-theme-primary))}
.node-dialog__mobile-tabs{display:none}.node-test-data{font-family:'Inter',sans-serif;background:rgb(var(--v-theme-surface));border:1px solid rgba(var(--v-theme-on-surface),.15);border-radius:7px;padding:18px;color:rgb(var(--v-theme-on-surface))}.node-test-data header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.node-test-data h3{font-size:17px}.node-test-data>p{font-size:12px;line-height:1.6;margin-bottom:13px;opacity:.7}.node-test-data footer{display:flex;justify-content:flex-end;gap:16px;align-items:center;margin-top:16px;font-size:12px}.node-test-data footer .node-save{width:auto;min-width:150px;padding:0 15px}
@media(min-width:1800px){.node-dialog{inset:30px max(30px,3vw) 30px max(16px,2vw);max-height:calc(100dvh - 60px)}.node-side-panel{height:calc(100% - 116px)}.node-config__header{height:44px}}
@media(max-width:1100px){.node-dialog{inset:14px 16px 18px 62px;grid-template-columns:minmax(185px,1fr) minmax(330px,1.45fr) minmax(185px,1fr);max-height:calc(100dvh - 32px)}.node-config__footer{padding-inline:14px}.node-output__body{padding-inline:9px}.node-input__tree{padding-inline:9px}}
@media(max-width:800px){.node-dialog{inset:10px 12px 12px 60px;display:block;max-height:calc(100dvh - 22px);padding-top:33px;pointer-events:none}.node-dialog__mobile-tabs{display:flex;position:absolute;left:0;right:0;top:0;height:33px;pointer-events:auto;background:var(--node-panel-bg);border:1px solid rgba(var(--v-theme-on-surface),.17);border-bottom:0;border-radius:6px 6px 0 0;z-index:5}.node-dialog__mobile-tabs button{flex:1;font-size:11px;color:rgba(var(--v-theme-on-surface),.7)}.node-dialog__mobile-tabs button.selected{color:rgb(var(--v-theme-primary));border-bottom:1px solid rgb(var(--v-theme-primary))}.node-dialog>aside,.node-dialog>section{display:none;position:absolute;inset:33px 0 0;height:auto;border:1px solid rgba(var(--v-theme-on-surface),.17);border-radius:0 0 6px 6px}.node-dialog>.mobile-visible{display:flex}.node-panel-title{display:none}.node-input__search{margin-top:14px}.node-config__title{font-size:13px}}
</style>
