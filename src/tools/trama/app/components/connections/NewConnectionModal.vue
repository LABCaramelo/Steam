<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from '@trama/components/AppModal.vue'
import AppIcon from '@trama/components/AppIcon.vue'
import { APPS, canonicalAppKey } from '@trama/services/apps'
import { createConnection, db, verifyConnection } from '@trama/services/api'
import { toastError, toastSuccess } from '@trama/composables/useToast'

const props = defineProps({ modelValue: { type: Boolean, default: false }, initialApp: { type: String, default: null } })
const emit = defineEmits(['update:modelValue', 'created'])
const open = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const appItems = computed(() => [...Object.entries(APPS).filter(([, app]) => !app.middleware && !app.trigger).map(([value, app]) => ({ value, title: app.title })), ...db.apps.map(app => ({ value: app.key, title: app.name }))])
const selectedApp = ref('chatgpt'), name = ref(''), values = ref({}), saving = ref(false), error = ref(''), verifyAfterSave = ref(false), advanced = ref(false)
const googleApps = ['sheets', 'calendar', 'gmail', 'google_drive', 'google_contacts', 'firestore', 'google_vision', 'google_ads', 'vertex_ai']
const field = (key, label, options = {}) => ({ key, label, ...options })
const schema = computed(() => {
  if (selectedApp.value === 'database') return {
    title: 'Supabase API Key', description: 'Use a URL do projeto e uma chave com as permissões necessárias. Os parâmetros de tabela ficam no nó.',
    fields: [field('url', 'URL do projeto', { required: true, placeholder: 'https://seu-projeto.supabase.co', url: true }), field('apiKey', 'API Key', { required: true, secret: true }), field('access_token', 'JWT de usuário (opcional)', { secret: true, advanced: true })],
  }
  if (selectedApp.value === 'whatsapp') return {
    title: 'Uazapi API Key', description: 'Conecte uma instância Uazapi existente pela URL e pelo token de acesso.',
    fields: [field('base_url', 'URL da instância', { required: true, placeholder: 'https://sua-instancia.uazapi.com', url: true }), field('token', 'Token da instância', { required: true, secret: true }), field('verify_url', 'URL de verificação (opcional)', { advanced: true, url: true })],
  }
  if (['chatgpt', 'anthropic', 'deepseek'].includes(selectedApp.value)) return {
    title: selectedApp.value === 'anthropic' ? 'Anthropic API Key' : 'API Key',
    description: 'A chave é usada pelo servidor para executar as chamadas. O modelo e as mensagens são definidos no nó.',
    fields: [field('apiKey', 'API Key', { required: true, secret: true }), field('base_url', 'URL base personalizada', { advanced: true, url: true, placeholder: selectedApp.value === 'anthropic' ? 'https://api.anthropic.com' : selectedApp.value === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com' })],
  }
  if (selectedApp.value === 'telegram') return {
    title: 'Telegram Bot Token', description: 'Use o token do bot criado no BotFather.',
    fields: [field('bot_token', 'Token do bot', { required: true, secret: true }), field('base_url', 'URL base personalizada', { advanced: true, url: true, placeholder: 'https://api.telegram.org' })],
  }
  if (googleApps.includes(selectedApp.value)) return {
    title: 'Google OAuth2 — access token', description: 'Informe um access token autorizado para as APIs necessárias. O assistente OAuth precisa ser configurado no servidor para autorizar e renovar automaticamente.',
    fields: [field('access_token', 'Access token', { required: true, secret: true }), field('base_url', 'URL base personalizada', { advanced: true, url: true }), field('verify_url', 'URL de verificação (opcional)', { advanced: true, url: true })],
  }
  return {
    title: 'Autenticação de API', description: 'Configure a base da API e sua autenticação. O método, caminho e corpo da ação ficam no nó.',
    fields: [field('base_url', 'URL base', { required: true, url: true, placeholder: 'https://api.exemplo.com' }), field('auth_type', 'Tipo de autenticação', { select: [{ title: 'Bearer token', value: 'bearer' }, { title: 'Header de API Key', value: 'api_key' }, { title: 'Basic', value: 'basic' }, { title: 'Sem autenticação', value: 'none' }] }), field('apiKey', 'Chave de API / token', { secret: true, condition: () => !['none', 'basic'].includes(values.value.auth_type) }), field('header_name', 'Nome do header da chave', { condition: () => values.value.auth_type === 'api_key', placeholder: 'x-api-key' }), field('username', 'Usuário', { condition: () => values.value.auth_type === 'basic' }), field('password', 'Senha', { secret: true, condition: () => values.value.auth_type === 'basic' }), field('headers', 'Headers adicionais (JSON)', { json: true, advanced: true }), field('verify_url', 'URL de verificação (opcional)', { advanced: true, url: true })],
  }
})
const visibleFields = computed(() => schema.value.fields.filter(item => (!item.advanced || advanced.value) && (!item.condition || item.condition())))
function initialKey(key) { const canonical = canonicalAppKey(key); return canonical === 'ai_agent' ? 'chatgpt' : (APPS[canonical] && !APPS[canonical].middleware) || db.apps.some(app => app.key === canonical) ? canonical : 'chatgpt' }
function resetValues() {
  values.value = { auth_type: 'bearer' }
  if (selectedApp.value === 'anthropic') values.value.provider = 'anthropic'
  if (selectedApp.value === 'deepseek') { values.value.provider = 'openai'; values.value.base_url = 'https://api.deepseek.com' }
  const customApp = db.apps.find(app => app.key === selectedApp.value)
  if (customApp) { values.value.auth_type = 'none'; values.value.base_url = customApp.base?.base_url ?? '' }
  name.value = customApp?.name ?? APPS[selectedApp.value]?.title ?? 'Nova conexão'; error.value = ''; verifyAfterSave.value = false; advanced.value = false
}
watch(selectedApp, resetValues)
watch(() => props.modelValue, value => { if (value) { selectedApp.value = initialKey(props.initialApp); resetValues() } else values.value = {} })
watch(() => props.initialApp, value => { if (props.modelValue) selectedApp.value = initialKey(value) })

async function save() {
  error.value = ''
  if (!name.value.trim()) { error.value = 'Informe um nome para a conexão.'; return }
  const credentials = {}
  for (const item of schema.value.fields) {
    if (item.condition && !item.condition()) continue
    const value = values.value[item.key]
    if (item.required && !String(value ?? '').trim()) { error.value = 'Preencha ' + item.label + '.'; return }
    if (value === '' || value === undefined || value === null) continue
    if (item.url) { try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error() } catch { error.value = item.label + ' deve ser uma URL HTTP(S) válida, sem credenciais na URL.'; return } }
    if (item.json) { try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); credentials[item.key] = parsed } catch { error.value = item.label + ' deve ser um objeto JSON válido.'; return } }
    else credentials[item.key] = typeof value === 'string' ? value.trim() : value
  }
  if (values.value.provider) credentials.provider = values.value.provider
  saving.value = true
  try {
    const created = await createConnection({ name: name.value.trim(), app: selectedApp.value, connection_config: schema.value.title, credentials })
    if (verifyAfterSave.value) {
      try {
        const result = await verifyConnection(created.id)
        created.verified = !!result.connection_activated
        if (!created.verified) toastError({ text: 'Conexão salva, mas a verificação não confirmou o acesso.' })
      } catch (verifyError) { toastError({ text: 'Conexão salva. ' + (verifyError.userMessage || 'A verificação não foi concluída.') }) }
    }
    emit('created', created)
    toastSuccess({ title: 'Conexão salva', text: created.verified ? 'A conexão foi verificada e está pronta para uso.' : 'As credenciais foram armazenadas no servidor.' })
    open.value = false
  } catch (failure) { error.value = failure.userMessage || failure.message || 'Não foi possível salvar a conexão.' }
  finally { saving.value = false }
}
</script>

<template>
  <AppModal v-model="open" width="min(92vw, 550px)" :prevent-close="saving">
    <section class="connection-form">
    <p class="connection-eyebrow">TRAMA / CONEXÕES</p>
    <h3 class="mb-1">Adicionar conexão</h3>
    <p class="text-small text-medium-emphasis mb-5">Conecte uma conta para utilizar nos seus fluxos.</p>
    <v-form @submit.prevent="save">
      <v-select v-model="selectedApp" :items="appItems" label="Aplicativo" density="compact" variant="outlined" hide-details class="mb-4">
        <template #selection="{item}"><div class="d-flex align-center ga-2"><AppIcon :app="item.value" :size="24" :rounded="4" /><span>{{ item.title }}</span></div></template>
      </v-select>
      <v-text-field v-model="name" label="Nome da conexão" autocomplete="off" variant="outlined" density="compact" hide-details class="mb-5" />
      <h4 class="text-small mb-2">{{ schema.title }}</h4>
      <p class="text-small text-medium-emphasis mb-5">{{ schema.description }}</p>
      <div v-for="item in visibleFields" :key="item.key" class="mb-4">
        <v-select v-if="item.select" v-model="values[item.key]" :items="item.select" :label="item.label" variant="outlined" density="compact" hide-details />
        <v-textarea v-else-if="item.json" v-model="values[item.key]" :label="item.label" variant="outlined" density="compact" rows="4" hide-details autocomplete="off" placeholder="{}" />
        <v-text-field v-else v-model="values[item.key]" :label="item.label + (item.required ? ' *' : '')" :type="item.secret ? 'password' : 'text'" :placeholder="item.placeholder" variant="outlined" density="compact" hide-details autocomplete="off" spellcheck="false" />
      </div>
      <v-btn variant="text" size="small" class="px-0 mb-3" :append-icon="advanced ? 'mdi-chevron-up' : 'mdi-chevron-down'" @click="advanced = !advanced">Configurações avançadas</v-btn>
      <v-checkbox v-model="verifyAfterSave" label="Verificar acesso após salvar" color="primary" density="compact" hide-details class="mb-4" />
      <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">{{ error }}</v-alert>
      <div class="d-flex justify-end ga-2 mt-4">
        <v-btn variant="text" :disabled="saving" @click="open = false">Cancelar</v-btn>
        <v-btn type="submit" color="primary" :loading="saving">Salvar conexão</v-btn>
      </div>
    </v-form>
    </section>
  </AppModal>
</template>

<style scoped>
.connection-form{font-family:var(--trama-font-ui,Inter,sans-serif);color:rgb(var(--cm-fg))}.connection-eyebrow{font:600 10px/1.5 var(--trama-font-code,monospace);letter-spacing:.12em;color:rgb(var(--cm-accent-ink));margin-bottom:12px}.connection-form>h3{font:800 26px/1.15 var(--trama-font-display,Montserrat,sans-serif);letter-spacing:-.045em}.connection-form>p:not(.connection-eyebrow){font-size:13px;line-height:1.65;color:rgb(var(--cm-fg-muted));margin-top:12px}.connection-form h4{font:700 14px var(--trama-font-ui,Inter,sans-serif);color:rgb(var(--cm-fg))}.connection-form :deep(.v-field){font-size:14px;background:rgb(var(--cm-surface-2));border-radius:8px}.connection-form :deep(.v-label){font-size:13px;color:rgb(var(--cm-fg-muted))}.connection-form :deep(.v-field--focused){box-shadow:0 0 0 3px rgb(var(--cm-focus)/.12)}.connection-form :deep(.v-field--focused .v-field__outline){color:rgb(var(--cm-focus))}.connection-form :deep(.v-btn){min-height:40px;border-radius:8px;font-size:13px}.connection-form :deep(.v-alert){border-radius:8px;font-size:13px;line-height:1.6}@media(max-width:600px){.connection-form>h3{font-size:24px}.connection-form :deep(.v-field__input){font-size:16px}.connection-form :deep(.v-btn){min-height:44px}}
</style>
