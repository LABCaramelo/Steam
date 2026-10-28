<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import CodeInput from '@trama/components/flux/fields/CodeInput.vue'
import NewConnectionModal from '@trama/components/connections/NewConnectionModal.vue'
import { db, listApps, runAppRpc, saveApp } from '@trama/services/api'
import { useSession } from '@trama/composables/useSession'
import { toastError, toastSuccess } from '@trama/composables/useToast'

const route = useRoute(), router = useRouter()
const { selectedOrgId } = useSession()
const tabs = [{ key: 'base', title: 'Base' }, { key: 'connections', title: 'Conexões' }, { key: 'modules', title: 'Módulos' }, { key: 'rpcs', title: 'RPCs' }, { key: 'triggers', title: 'Gatilhos' }]
const fresh = () => ({ id: null, key: '', name: '', description: '', base: { base_url: '', headers: {} }, modules: [], rpcs: [], triggers: [] })
const doc = ref(fresh()), tab = ref('base'), loading = ref(true), saving = ref(false), error = ref(''), dirty = ref(false), loaded = ref(false)
const baseText = ref('{}'), modules = ref([]), rpcs = ref([]), activeModule = ref(0), activeRpc = ref(0), connectionOpen = ref(false)
const rpcParams = ref('{}'), rpcConnectionId = ref(null), rpcResult = ref(''), runningRpc = ref(false)
const module = computed(() => modules.value[activeModule.value])
const rpc = computed(() => rpcs.value[activeRpc.value])
const connections = computed(() => db.connections.filter(connection => connection.app === doc.value.key))
const hasId = computed(() => !!doc.value.id)
const json = value => JSON.stringify(value, null, 2)
const clone = value => JSON.parse(JSON.stringify(value))
const idFor = prefix => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
let revision = 0

function parse(text, label, array = false) {
  let value
  try { value = JSON.parse(text) } catch { throw new Error(`${label}: JSON inválido.`) }
  if (array ? !Array.isArray(value) : !value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: informe ${array ? 'um array' : 'um objeto'} JSON.`)
  return value
}
function requestOf(text, label) {
  const request = parse(text, label)
  request.method = String(request.method ?? 'GET').toUpperCase()
  if (!['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(request.method)) throw new Error(`${label}: método HTTP inválido.`)
  if (!request.url && !request.path) throw new Error(`${label}: informe path ou url.`)
  return request
}
function buildDocument() {
  if (!doc.value.name.trim()) throw new Error('Informe o nome do aplicativo.')
  const base = parse(baseText.value, 'Base')
  if (Object.keys(base).some(key => !['base_url', 'headers'].includes(key))) throw new Error('Base: os campos disponíveis são base_url e headers.')
  if (base.base_url) {
    let url; try { url = new URL(base.base_url) } catch { throw new Error('Base: informe uma URL válida.') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Base: use uma URL HTTP(S) sem credenciais.')
  }
  if (base.headers && (typeof base.headers !== 'object' || Array.isArray(base.headers))) throw new Error('Base: headers deve ser um objeto.')
  const usedIds = new Set()
  const buildItem = (item, kind) => {
    const id = item.id.trim()
    if (!id || usedIds.has(id)) throw new Error('Cada módulo e RPC precisa de um ID único.')
    usedIds.add(id)
    if (!item.name.trim()) throw new Error(`Informe o nome de cada ${kind}.`)
    const common = { ...item, id, name: item.name.trim(), request: requestOf(item.requestText, `${kind} ${item.name}`) }
    delete common.requestText; delete common.parametersText; delete common.mappingText
    if (kind === 'módulo') {
      common.parameters_json = parse(item.parametersText, `Parâmetros de ${item.name}`, true)
      for (const group of common.parameters_json) {
        if (!Array.isArray(group.inputs)) throw new Error(`Parâmetros de ${item.name}: cada grupo precisa conter inputs.`)
        for (const input of group.inputs) {
          if (!input.name || !['text', 'textarea', 'number', 'boolean', 'json', 'select', 'code'].includes(input.type)) throw new Error(`Parâmetros de ${item.name}: cada input precisa de name e type suportado (text, textarea, number, boolean, json, select ou code).`)
          if (input.type === 'select' && !Array.isArray(input.options)) throw new Error(`Parâmetros de ${item.name}: options de um select deve ser um array.`)
        }
      }
    } else {
      const mapping = parse(item.mappingText, `Mapeamento de ${item.name}`)
      if (Object.keys(mapping).some(key => !['iterate', 'label', 'value'].includes(key))) throw new Error(`Mapeamento de ${item.name}: use apenas iterate, label e value.`)
      Object.assign(common, mapping)
    }
    return common
  }
  return { ...clone(doc.value), name: doc.value.name.trim(), base, modules: modules.value.map(item => buildItem(item, 'módulo')), rpcs: rpcs.value.map(item => buildItem(item, 'RPC')), triggers: [] }
}
function validate() {
  try { buildDocument(); error.value = ''; toastSuccess({ text: 'JSON e estrutura do aplicativo válidos.' }) }
  catch (failure) { error.value = failure.message }
}
function fill(record) {
  loaded.value = false
  doc.value = clone(record)
  baseText.value = json(record.base ?? {})
  modules.value = record.modules.map(item => ({ ...clone(item), requestText: json(item.request ?? {}), parametersText: json(item.parameters_json ?? []) }))
  rpcs.value = record.rpcs.map(item => ({ ...clone(item), requestText: json(item.request ?? {}), mappingText: json(Object.fromEntries(['iterate','label','value'].filter(key => item[key] !== undefined).map(key => [key, item[key]]))) }))
  activeModule.value = 0; activeRpc.value = 0; rpcResult.value = ''; dirty.value = false
  queueMicrotask(() => { loaded.value = true; dirty.value = false })
}
async function load() {
  const current = ++revision
  loading.value = true; error.value = ''
  try {
    if (!route.params.appId) { fill(fresh()); return }
    const records = await listApps()
    if (current !== revision) return
    const record = records.find(item => item.id === route.params.appId)
    if (!record) throw new Error('Aplicativo não encontrado nesta organização.')
    fill(record)
  } catch (failure) { error.value = failure.userMessage ?? failure.message }
  finally { if (current === revision) loading.value = false }
}
async function save() {
  if (saving.value) return false
  saving.value = true; error.value = ''
  try {
    const moduleId = module.value?.id, rpcId = rpc.value?.id
    const saved = await saveApp(buildDocument())
    fill(saved)
    activeModule.value = Math.max(0, modules.value.findIndex(item => item.id === moduleId))
    activeRpc.value = Math.max(0, rpcs.value.findIndex(item => item.id === rpcId))
    if (route.params.appId !== saved.id) await router.replace({ name: 'app-builder', params: { appId: saved.id } })
    toastSuccess({ text: 'Aplicativo salvo no servidor.' })
    return true
  } catch (failure) { error.value = failure.userMessage ?? failure.message; return false }
  finally { saving.value = false }
}
function addModule() {
  modules.value.push({ id: idFor('module'), name: 'Nova ação', description: '', parametersText: '[]', requestText: json({ method: 'GET', path: '/' }) })
  activeModule.value = modules.value.length - 1
}
function addRpc() {
  rpcs.value.push({ id: idFor('rpc'), name: 'Nova RPC', requestText: json({ method: 'GET', path: '/' }), mappingText: '{}' })
  activeRpc.value = rpcs.value.length - 1
}
function removeModule() { modules.value.splice(activeModule.value, 1); activeModule.value = Math.max(0, activeModule.value - 1) }
function removeRpc() { rpcs.value.splice(activeRpc.value, 1); activeRpc.value = Math.max(0, activeRpc.value - 1); rpcResult.value = '' }
async function testRpc() {
  if (!rpc.value || runningRpc.value) return
  runningRpc.value = true; rpcResult.value = ''; error.value = ''
  try {
    const params = parse(rpcParams.value, 'Parâmetros de teste')
    const rpcId = rpc.value.id
    if (dirty.value && !(await save())) return
    const result = await runAppRpc(doc.value.id, rpcId, { connection_id: rpcConnectionId.value, params })
    rpcResult.value = json(result)
  } catch (failure) { error.value = failure.userMessage ?? failure.message }
  finally { runningRpc.value = false }
}
watch([doc, baseText, modules, rpcs], () => { if (loaded.value) dirty.value = true }, { deep: true })
watch(() => route.params.appId, () => { if (doc.value.id !== route.params.appId) load() })
watch(selectedOrgId, () => router.replace({ name: 'apps' }))
onBeforeRouteLeave(() => !dirty.value || window.confirm('Há alterações não salvas. Sair do aplicativo?'))
onMounted(load)
</script>

<template>
  <div class="page-padding app-builder">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div class="d-flex align-center ga-3"><v-btn icon="mdi-arrow-left" variant="text" aria-label="Voltar aos aplicativos" @click="router.push({ name: 'apps' })" /><div><h2>{{ hasId ? doc.name : 'Criar aplicativo' }}</h2><small class="text-medium-emphasis">{{ dirty ? 'Alterações não salvas' : hasId ? doc.key : 'Defina sua API e os módulos disponíveis nos fluxos.' }}</small></div></div>
      <div class="d-flex ga-2"><v-btn variant="outlined" :disabled="loading || saving" @click="validate">Validar JSON</v-btn><v-btn color="primary" :disabled="loading" :loading="saving" prepend-icon="mdi-content-save-outline" @click="save">Salvar</v-btn></div>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-5" role="alert">{{ error }}</v-alert>
    <v-skeleton-loader v-if="loading" type="article" />
    <template v-else>
      <v-row><v-col cols="12" md="4"><v-text-field v-model="doc.name" label="Nome do aplicativo" variant="outlined" density="compact" maxlength="100" hide-details /></v-col><v-col cols="12" md="8"><v-text-field v-model="doc.description" label="Descrição" variant="outlined" density="compact" hide-details /></v-col></v-row>
      <v-tabs v-model="tab" color="primary" class="mt-5 mb-5"><v-tab v-for="item in tabs" :key="item.key" :value="item.key" class="text-none">{{ item.title }}</v-tab></v-tabs>
      <v-card v-if="tab === 'base'" class="pa-5">
        <h3 class="mb-2">Configuração base</h3><p class="text-medium-emphasis mb-4">Defina base_url e headers compartilhados pelos módulos. Guarde chaves e tokens na aba Conexões.</p>
        <CodeInput v-model="baseText" language="json" label="Configuração base do aplicativo" :rows="18" />
      </v-card>
      <v-card v-else-if="tab === 'connections'" class="pa-5">
        <div class="d-flex align-center justify-space-between mb-4"><h3>Conexões do aplicativo</h3><v-btn color="primary" prepend-icon="mdi-plus" :disabled="!hasId" @click="connectionOpen = true">Nova conexão</v-btn></div>
        <v-alert v-if="!hasId" type="info" variant="tonal">Salve o aplicativo para adicionar conexões com credenciais.</v-alert>
        <v-alert v-else-if="!connections.length" type="info" variant="tonal">Nenhuma conexão configurada. A conexão fornece a URL base e a autenticação para os módulos.</v-alert>
        <v-list v-else><v-list-item v-for="connection in connections" :key="connection.id" :title="connection.name" :subtitle="connection.verified ? 'Verificada' : 'Salva — acesso não verificado'" prepend-icon="mdi-key-outline" /></v-list>
      </v-card>
      <div v-else-if="tab === 'modules'" class="builder-columns">
        <v-card class="pa-3"><div class="d-flex align-center justify-space-between mb-3"><h3>Módulos</h3><v-btn icon="mdi-plus" variant="text" size="small" aria-label="Adicionar módulo" @click="addModule" /></div><v-list v-if="modules.length"><v-list-item v-for="(item, index) in modules" :key="index" :active="activeModule === index" :title="item.name" :subtitle="item.id" rounded @click="activeModule = index" /></v-list><p v-else class="text-medium-emphasis pa-2">Adicione a primeira ação.</p></v-card>
        <v-card v-if="module" :key="activeModule" class="pa-5">
          <div class="d-flex align-center justify-space-between mb-4"><h3>{{ module.name }}</h3><v-btn variant="text" color="error" prepend-icon="mdi-delete-outline" @click="removeModule">Remover módulo</v-btn></div>
          <v-row><v-col cols="12" md="6"><v-text-field v-model="module.id" label="ID do módulo" density="compact" variant="outlined" /></v-col><v-col cols="12" md="6"><v-text-field v-model="module.name" label="Nome da ação" density="compact" variant="outlined" /></v-col></v-row>
          <v-text-field v-model="module.description" label="Descrição da ação" density="compact" variant="outlined" />
          <h4 class="mb-2">Parâmetros do formulário</h4><p class="text-small text-medium-emphasis mb-3">Array de grupos com inputs. Cada input usa name, type, label e required; selects também podem usar options.</p><CodeInput v-model="module.parametersText" language="json" label="Parâmetros do módulo" :rows="12" />
          <h4 class="mt-5 mb-2">Requisição HTTP</h4><p class="text-small text-medium-emphasis mb-3" v-pre>Objeto com method, path ou url, headers, query e body. Use {{$PARAMS.campo}} para um parâmetro e {{$CONNECTION.apiKey}} para uma credencial.</p><CodeInput v-model="module.requestText" language="json" label="Requisição do módulo" :rows="15" />
        </v-card>
      </div>
      <div v-else-if="tab === 'rpcs'" class="builder-columns">
        <v-card class="pa-3"><div class="d-flex align-center justify-space-between mb-3"><h3>RPCs</h3><v-btn icon="mdi-plus" variant="text" size="small" aria-label="Adicionar RPC" @click="addRpc" /></div><v-list v-if="rpcs.length"><v-list-item v-for="(item, index) in rpcs" :key="index" :active="activeRpc === index" :title="item.name" :subtitle="item.id" rounded @click="activeRpc = index; rpcResult = ''" /></v-list><p v-else class="text-medium-emphasis pa-2">Crie chamadas para consultar opções na sua API.</p></v-card>
        <v-card v-if="rpc" :key="activeRpc" class="pa-5">
          <div class="d-flex align-center justify-space-between mb-4"><h3>{{ rpc.name }}</h3><v-btn variant="text" color="error" prepend-icon="mdi-delete-outline" @click="removeRpc">Remover RPC</v-btn></div>
          <v-row><v-col cols="12" md="6"><v-text-field v-model="rpc.id" label="ID da RPC" density="compact" variant="outlined" /></v-col><v-col cols="12" md="6"><v-text-field v-model="rpc.name" label="Nome" density="compact" variant="outlined" /></v-col></v-row>
          <h4 class="mb-2">Requisição HTTP</h4><CodeInput v-model="rpc.requestText" language="json" label="Requisição da RPC" :rows="13" />
          <h4 class="mt-5 mb-2">Mapeamento da resposta</h4>
          <p class="text-small text-medium-emphasis mb-3">A RPC retorna response com a resposta HTTP. Deixe {} para usá-la diretamente. Para transformar body.items em options, use iterate, label e value:</p>
          <pre v-pre class="rpc-result mb-3">{
  "iterate": "body.items",
  "label": "{{$ITEM.name}}",
  "value": "{{$ITEM.id}}"
}</pre>
          <CodeInput v-model="rpc.mappingText" language="json" label="Mapeamento da RPC" :rows="6" />
          <v-divider class="my-5" /><h4 class="mb-3">Executar RPC</h4><v-select v-model="rpcConnectionId" :items="connections" item-title="name" item-value="id" label="Conexão (opcional)" variant="outlined" density="compact" clearable /><CodeInput v-model="rpcParams" language="json" label="Parâmetros para testar RPC" :rows="6" /><v-btn class="mt-4" color="primary" :disabled="!hasId" :loading="runningRpc" @click="testRpc">Salvar alterações e executar</v-btn>
          <pre v-if="rpcResult" class="rpc-result mt-4">{{ rpcResult }}</pre>
        </v-card>
      </div>
      <v-alert v-else-if="tab === 'triggers'" type="info" variant="tonal">Os aplicativos personalizados disponibilizam módulos e RPCs. Para iniciar uma integração, use os gatilhos Webhook ou Agendamento no editor de fluxos.</v-alert>
    </template>
    <NewConnectionModal v-model="connectionOpen" :initial-app="doc.key" />
  </div>
</template>

<style scoped>
.builder-columns{display:grid;grid-template-columns:250px minmax(0,1fr);gap:20px;align-items:start}.rpc-result{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-height:420px;overflow:auto;padding:16px;background:rgba(var(--v-theme-on-surface),.04);border-radius:5px}.app-builder{max-width:1500px;margin:auto}@media(max-width:900px){.builder-columns{grid-template-columns:1fr}}
</style>
