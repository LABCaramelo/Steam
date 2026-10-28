<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppsUsedByFlux from '@trama/components/AppsUsedByFlux.vue'
import FluxCanvas from '@trama/components/flux/FluxCanvas.vue'
import TemplateEditModal from '@trama/components/marketplace/TemplateEditModal.vue'
import { createFlux, downloadTemplate, listTemplates } from '@trama/services/api'
import { toastError, toastSuccess } from '@trama/composables/useToast'
import { useSession } from '@trama/composables/useSession'

const TABS = [
  { label: 'Templates do LAB', value: 'locked' },
  { label: 'Templates desbloqueados', value: 'unlocked' },
  { label: 'Meus templates', value: 'own' },
]

const ACTIONS = {
  locked: { color: 'primary', icon: 'mdi-cart-plus', tooltip: 'Usar template' },
  unlocked: { color: 'warning', icon: 'mdi-download', tooltip: 'Baixar template' },
  own: { color: 'secondary', icon: 'mdi-pencil', tooltip: 'Editar template' },
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const router = useRouter()
const { selectedOrgId } = useSession()

const tab = ref('locked')
const search = ref('')
const term = ref('')
const loading = ref(true)
const templates = ref([])
const editing = ref(null)
const editOpen = ref(false)
const busy = ref({})
const loadError = ref('')
const filePicker = ref(null)
const importingFile = ref(false)
let timer

const normalize = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const byTab = computed(() => {
  const t = normalize(term.value.trim())
  const matches = (tpl) => !t || [tpl.name, tpl.description, tpl.owner.name].some((v) => normalize(v).includes(t))
  return {
    locked: templates.value.filter(matches),
    unlocked: templates.value.filter((tpl) => tpl.status === 'unlocked' && tpl.is_active && matches(tpl)),
    own: templates.value.filter((tpl) => tpl.status === 'own' && tpl.is_active && matches(tpl)),
  }
})
const items = computed(() => byTab.value[tab.value] ?? [])

const emptySearch = computed(() => tab.value === 'locked' && items.value.length === 0 && term.value.trim() !== '')
const emptyUnlocked = computed(() => tab.value === 'unlocked' && items.value.length === 0)
const emptyOwn = computed(() => tab.value === 'own' && items.value.length === 0)

watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (term.value = value ?? ''), 250)
})

onMounted(load)
watch(selectedOrgId, () => { templates.value = []; editOpen.value = false; load() })
onBeforeUnmount(() => clearTimeout(timer))

let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  loadError.value = ''
  try {
    const result = await listTemplates()
    if (version === loadVersion) templates.value = result
  } catch (error) {
    if (version === loadVersion) loadError.value = error.userMessage ?? 'Não foi possível carregar os templates.'
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

const priceLabel = (price) => (price === 0 ? 'Gratuito' : currency.format(price / 100))
const priceClass = (price) => (price === 0 ? 'text-success' : 'text-primary')

function actionOf(tpl) {
  if (tpl.price === 0 && tpl.status === 'locked') return { color: 'success', icon: 'mdi-download', tooltip: 'Baixar template' }
  return ACTIONS[tpl.status]
}

function createTemplate() {
  editing.value = null
  editOpen.value = true
}

async function exportTemplate(tpl) {
  if (busy.value[tpl.id]) return
  busy.value[tpl.id] = true
  try { await downloadTemplate(tpl.id); await load() }
  catch (error) { toastError({ text: error.userMessage ?? 'Não foi possível baixar o template.' }) }
  finally { delete busy.value[tpl.id] }
}

async function importTemplate(tpl) {
  if (busy.value[tpl.id]) return
  busy.value[tpl.id] = true
  try {
    const template = await downloadTemplate(tpl.id, { download: false })
    if (!Array.isArray(template.steps) || !Array.isArray(template.edges)) throw new Error('O template não contém um grafo válido.')
    const flow = await createFlux({
      name: template.name, steps: template.steps, edges: template.edges,
      settings: template.settings, test_input: template.test_input,
    })
    toastSuccess({ text: 'Template importado como uma nova integração.' })
    router.push({ name: 'flux', params: { fluxId: flow.id } })
  } catch (error) {
    toastError({ text: error.userMessage ?? error.message ?? 'Não foi possível importar o template.' })
  } finally { delete busy.value[tpl.id] }
}

async function importFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || importingFile.value) return
  importingFile.value = true
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('O arquivo deve ter até 2 MB.')
    const template = JSON.parse(await file.text())
    if (typeof template.name !== 'string' || !template.name.trim() || !Array.isArray(template.steps) || !Array.isArray(template.edges)) {
      throw new Error('Selecione um arquivo JSON com nome, módulos e conexões do fluxo.')
    }
    const flow = await createFlux({ name: template.name, steps: template.steps, edges: template.edges, settings: template.settings, test_input: template.test_input })
    toastSuccess({ text: 'Arquivo importado como uma nova integração.' })
    router.push({ name: 'flux', params: { fluxId: flow.id } })
  } catch (error) {
    toastError({ text: error.userMessage ?? (error instanceof SyntaxError ? 'O arquivo não contém JSON válido.' : error.message) ?? 'Não foi possível importar o arquivo.' })
  } finally { importingFile.value = false }
}

function onAction(tpl) {
  if (tpl.status === 'own') {
    editing.value = tpl
    editOpen.value = true
  } else if (tpl.status === 'locked' && tpl.price !== 0) {
    toastError({ title: 'Compra indisponível', text: 'A compra de templates pagos não está disponível no momento.' })
  } else {
    exportTemplate(tpl)
  }
}
</script>

<template>
  <div>
    <section class="text-center justify-center">
      <div class="sticky-combobox-wrapper d-flex align-center justify-center mt-10">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          placeholder="Pesquise por Título, Descrição ou Autor"
          variant="outlined"
          density="comfortable"
          hide-details
          clearable
        />
      </div>
      <v-tabs v-model="tab" align-tabs="center" color="primary">
        <v-tab v-for="t in TABS" :key="t.value" :value="t.value" class="text-none">{{ t.label }}</v-tab>
      </v-tabs>
      <div class="d-flex justify-center ga-3 mt-4">
        <v-btn v-if="tab === 'own'" color="primary" prepend-icon="mdi-plus" @click="createTemplate">Criar template</v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-file-import-outline" :loading="importingFile" @click="filePicker?.click()">Importar arquivo</v-btn>
        <input ref="filePicker" type="file" accept=".fiqon,.json,application/json" class="d-none" aria-label="Arquivo de template" @change="importFile" />
      </div>
    </section>

    <section>
      <v-alert v-if="loadError" type="error" variant="tonal" class="ma-6">
        {{ loadError }}
        <v-btn variant="text" size="small" @click="load">Tentar novamente</v-btn>
      </v-alert>
      <v-row v-if="loading" class="ma-6">
        <v-col v-for="n in 6" :key="n" cols="12" lg="4" xl="4">
          <v-skeleton-loader type="card" class="d-flex flex-column align-stretch">
            <v-skeleton-loader type="avatar, avatar, avatar" />
            <v-skeleton-loader type="heading" class="w-50 mt-n2" />
            <v-skeleton-loader type="paragraph" class="mb-3 mt-n4" />
          </v-skeleton-loader>
        </v-col>
      </v-row>

      <v-row v-else class="ma-6">
        <v-col v-for="tpl in items" :key="tpl.id" cols="12" md="6" lg="4" xl="4">
          <v-card class="d-flex flex-column align-stretch card-zoom" elevation="2" height="250" tag="article">
            <div class="d-flex template-image align-start justify-start pa-4">
              <v-icon v-if="tpl.apps.length === 0" size="64">mdi-image-off-outline</v-icon>
              <AppsUsedByFlux v-else :used-apps="tpl.apps" />
            </div>
            <div class="d-flex flex-column px-4 flex-grow-1 overflow-hidden">
              <div class="info-area">
                <div>
                  <h3>{{ tpl.name }}</h3>
                  <p class="description-text">{{ tpl.description }}</p>
                </div>
                <div>
                  <div class="text-small">{{ tpl.owner.name }}</div>
                </div>
              </div>
              <div class="d-flex justify-space-between align-center pb-2">
                <span class="font-weight-bold" :class="priceClass(tpl.price)">{{ priceLabel(tpl.price) }}</span>
                <v-btn :color="actionOf(tpl).color" variant="tonal" size="large" :loading="busy[tpl.id]" @click.prevent.stop="onAction(tpl)">
                  <v-icon>{{ actionOf(tpl).icon }}</v-icon>
                  <v-tooltip activator="parent" location="top">{{ actionOf(tpl).tooltip }}</v-tooltip>
                </v-btn>
              </div>
            </div>

            <v-dialog activator="parent" width="auto">
              <v-card class="d-flex flex-column" variant="flat" width="80vw" height="calc(100vh - 250px)" min-height="400px">
                <div class="d-flex align-center justify-space-between pa-4">
                  <div>
                    <h3>{{ tpl.name }}</h3>
                    <p class="text-medium-emphasis text-small">{{ tpl.description }}</p>
                  </div>
                  <span class="font-weight-bold" :class="priceClass(tpl.price)">{{ priceLabel(tpl.price) }}</span>
                </div>
                <div class="flux-log-container mx-4 mb-4">
                  <FluxCanvas :steps="tpl.steps" :edges="tpl.edges" readonly />
                </div>
                <v-card-actions class="px-4 pb-4">
                  <v-spacer />
                  <v-btn v-if="tpl.price === 0 || tpl.status !== 'locked'" variant="text" :loading="busy[tpl.id]" @click="exportTemplate(tpl)">Baixar arquivo</v-btn>
                  <v-btn v-if="tpl.price === 0 || tpl.status !== 'locked'" color="primary" variant="flat" :loading="busy[tpl.id]" prepend-icon="mdi-import" @click="importTemplate(tpl)">Usar template</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-if="!loading && emptySearch">
        <v-col cols="12" class="d-flex justify-center align-center">
          <v-icon size="48">mdi-magnify-minus</v-icon>
          <span class="ml-2">Nenhum template encontrado para sua busca.</span>
        </v-col>
      </v-row>
      <v-row v-if="!loading && emptyUnlocked">
        <v-col cols="12" class="d-flex justify-center align-center">
          <v-icon size="48">mdi-lock</v-icon>
          <span class="ml-2">Você não possui templates desbloqueados.</span>
        </v-col>
      </v-row>
      <v-row v-if="!loading && emptyOwn">
        <v-col cols="12" class="d-flex justify-center align-center">
          <v-icon size="48">mdi-account-off</v-icon>
          <span class="ml-2">Você não possui templates cadastrados.</span>
        </v-col>
      </v-row>
    </section>

    <TemplateEditModal v-model="editOpen" :template="editing" @saved="load" />
  </div>
</template>

<style scoped>
.sticky-combobox-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 16px;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.info-area {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 140px;
  overflow: hidden;
}

.flux-log-container {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-faded)), transparent 70%);
  border-radius: 10px;
  overflow: hidden;
  flex: 1;
}

.description-text {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.card-zoom {
  transition: transform 0.3s ease-in-out;
  cursor: pointer;
}

.card-zoom:hover {
  transform: scale(1.05);
}
</style>
