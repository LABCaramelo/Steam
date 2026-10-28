<script setup>
// Dashboard da integração (/dashboard/:fluxId), equivalente ao FluxDashboard original:
// filtros por período/chave/operações, gráfico de uso, lista de logs e detalhes com replay.
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppModal from '@trama/components/AppModal.vue'
import DashboardChart from '@trama/components/dashboard/DashboardChart.vue'
import { getFlux, orgFluxes, replayExecution } from '@trama/services/api'
import { getApp } from '@trama/services/apps'
import { toastError, toastInfo } from '@trama/composables/useToast'

const OPERATORS = [
  { title: 'igual a =', value: 'eq' },
  { title: 'maior que >', value: 'gt' },
  { title: 'maior ou igual a ≥', value: 'gte' },
  { title: 'menor que <', value: 'lt' },
  { title: 'menor ou igual a ≤', value: 'lte' },
]
const COMPARE = {
  eq: (a, b) => a === b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
}
const HEADERS = [
  { title: 'Nome', key: 'name', sortable: false },
  { title: 'Origem', key: 'origin', sortable: false },
  { title: 'Executado em', key: 'executedAt', sortable: false },
  { title: 'Resultado', key: 'result', sortable: false, align: 'end' },
]

const route = useRoute()
const router = useRouter()

const flux = ref(null)
const loading = ref(true)
const fluxOptions = computed(() => orgFluxes().map((f) => ({ title: f.name, value: f.id })))

// Período padrão: últimos 14 dias (como o gráfico do original ao abrir).
const toInputValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
function daysAgo(n) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - n)
  return date
}
const defaultFilters = () => ({
  startDate: toInputValue(daysAgo(13)),
  endDate: toInputValue(new Date(Date.now() + 60000)),
  key: '',
  value: '',
  operator: 'gte',
  operations: '',
})
const filters = ref(defaultFilters())
const applied = ref(defaultFilters())
const advancedOpen = ref(false)
const search = ref('')
const page = ref(1)
const PER_PAGE = 8

const selected = ref(null)
const detailsOpen = ref(false)
const replaying = ref(false)

async function load() {
  loading.value = true
  try {
    flux.value = route.params.fluxId ? await getFlux(route.params.fluxId) : null
    if (flux.value) document.title = `Trama | Dashboard - ${flux.value.name}`
  } catch {
    toastError({ text: 'Integração não encontrada' })
    flux.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => route.params.fluxId, () => {
  page.value = 1
  load()
})

// Busca a chave em qualquer saída de módulo da execução.
function findKey(execution, key) {
  for (const step of execution.steps ?? []) {
    if (step.output && Object.hasOwn(step.output, key)) return step.output[key]
  }
  return undefined
}

const filtered = computed(() => {
  const list = flux.value?.executions ?? []
  const start = applied.value.startDate ? new Date(applied.value.startDate).getTime() : -Infinity
  const end = applied.value.endDate ? new Date(applied.value.endDate).getTime() : Infinity
  const ops = applied.value.operations === '' ? null : Number(applied.value.operations)
  return list.filter((exe) => {
    const time = new Date(exe.started_at).getTime()
    if (time < start || time > end) return false
    if (applied.value.key) {
      const value = findKey(exe, applied.value.key.trim())
      if (value === undefined || String(value) !== applied.value.value.trim()) return false
    }
    if (ops !== null && !COMPARE[applied.value.operator](exe.operations ?? 0, ops)) return false
    return true
  })
})

const searched = computed(() => {
  const term = search.value?.trim().toLowerCase()
  if (!term) return filtered.value
  return filtered.value.filter((exe) => JSON.stringify(exe).toLowerCase().includes(term))
})

const pageCount = computed(() => Math.max(1, Math.ceil(searched.value.length / PER_PAGE)))
const rows = computed(() =>
  searched.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE).map((exe) => ({
    id: exe.id,
    name: flux.value.name,
    origin: exe.origin ?? 'Terminal de testes',
    executedAt: formatDate(exe.started_at),
    result: exe.status,
    raw: exe,
  })),
)
watch(search, () => (page.value = 1))

const summary = computed(() => {
  const list = filtered.value
  const successes = list.filter((e) => e.status !== 'error').length
  const avg = list.length ? Math.round(list.reduce((sum, e) => sum + e.duration_ms, 0) / list.length) : 0
  return [
    { label: 'Execuções', value: list.length, icon: 'mdi-play-circle-outline', color: 'primary' },
    { label: 'Sucessos', value: successes, icon: 'mdi-check-circle-outline', color: 'success' },
    { label: 'Falhas', value: list.length - successes, icon: 'mdi-alert-circle-outline', color: 'error' },
    { label: 'Tempo médio', value: `${avg} ms`, icon: 'mdi-timer-outline', color: 'info' },
    { label: 'Total de operações', value: list.reduce((sum, e) => sum + (e.operations ?? 0), 0), icon: 'mdi-counter', color: 'warning' },
  ]
})

// Agrupa as execuções filtradas por dia para o gráfico.
const chartDays = computed(() => {
  const start = new Date(applied.value.startDate || Date.now() - 13 * 86400000)
  const end = new Date(applied.value.endDate || Date.now())
  start.setHours(0, 0, 0, 0)
  const days = []
  for (let d = new Date(start); d <= end && days.length < 62; d.setDate(d.getDate() + 1)) {
    days.push({ key: d.toDateString(), label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), successes: 0, errors: 0, totalMs: 0, avgMs: 0 })
  }
  const byKey = new Map(days.map((d) => [d.key, d]))
  for (const exe of filtered.value) {
    const day = byKey.get(new Date(exe.started_at).toDateString())
    if (!day) continue
    if (exe.status === 'error') day.errors += 1
    else day.successes += 1
    day.totalMs += exe.duration_ms
  }
  for (const day of days) {
    const count = day.successes + day.errors
    day.avgMs = count ? Math.round(day.totalMs / count) : 0
  }
  return days
})

function applyFilters() {
  if (filters.value.key && !filters.value.value) {
    toastError({ text: 'O campo Valor do filtro é obrigatório quando a Chave do filtro for preenchida.' })
    return
  }
  applied.value = { ...filters.value }
  page.value = 1
}

function clearFilters() {
  filters.value = defaultFilters()
  applied.value = defaultFilters()
  page.value = 1
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

function longDate(iso) {
  const date = new Date(iso)
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  const pad = (n) => String(n).padStart(2, '0')
  return `${day} às ${pad(date.getHours())}h${pad(date.getMinutes())}m${pad(date.getSeconds())}s`
}

function openDetails(row) {
  selected.value = row.raw
  detailsOpen.value = true
}

function changeFlux(id) {
  router.push({ name: 'flux-dashboard', params: { fluxId: id } })
}

async function replay() {
  replaying.value = true
  toastInfo({ title: 'Replay iniciado', text: 'Fluxo executado novamente, isso pode demorar alguns segundos', icon: 'mdi-replay' })
  try {
    const execution = await replayExecution(flux.value.id, selected.value.id)
    flux.value = await getFlux(flux.value.id)
    selected.value = execution
    page.value = 1
  } catch {
    toastError({ text: 'Não foi possível executar novamente.' })
  } finally {
    replaying.value = false
  }
}
</script>

<template>
  <div class="dashboard-page pt-12 px-md-15 px-4 pb-10">
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-6">
      <div class="d-flex align-center ga-3">
        <v-btn
          v-if="flux"
          icon="mdi-chevron-left"
          density="comfortable"
          variant="tonal"
          color="primary"
          :to="{ name: 'flux', params: { fluxId: flux.id } }"
        />
        <div>
          <h2>Uso geral da integração</h2>
          <p class="text-medium-emphasis">{{ flux?.name ?? 'Selecione uma integração' }}</p>
        </div>
      </div>
      <v-select
        :model-value="flux?.id"
        :items="fluxOptions"
        label="Fluxo"
        density="compact"
        max-width="320"
        class="flux-select"
        @update:model-value="changeFlux"
      />
    </div>

    <div v-if="loading" class="d-flex justify-center py-15">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <v-card v-else-if="!flux" class="pa-10 text-center">
      <v-icon icon="mdi-chart-box-outline" size="48" class="mb-3 opacity-60" />
      <p>Escolha uma integração no seletor acima para ver o dashboard.</p>
    </v-card>

    <template v-else>
      <!-- Filtros -->
      <v-card class="pa-6 mb-7">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3">
          <div class="d-flex ga-3 flex-wrap">
            <v-text-field v-model="filters.startDate" type="datetime-local" label="Data inicial" density="compact" class="date-field" />
            <v-text-field v-model="filters.endDate" type="datetime-local" label="Data final" density="compact" class="date-field" />
          </div>
          <div class="d-flex align-center justify-end ga-3 flex-wrap">
            <v-btn variant="text" color="primary" @click="advancedOpen = !advancedOpen">
              Filtros avançados
              <v-icon icon="mdi-chevron-down" class="advanced-chevron ml-1" :class="{ 'advanced-chevron--open': advancedOpen }" />
            </v-btn>
            <v-btn variant="text" @click="clearFilters">Limpar</v-btn>
            <v-btn color="primary" prepend-icon="mdi-filter-outline" @click="applyFilters">Filtrar</v-btn>
          </div>
        </div>
        <v-expand-transition>
          <div v-if="advancedOpen" class="mt-4">
            <v-row>
              <v-col cols="12" md="6">
                <div class="d-inline-flex align-center mb-3">
                  <h4>Filtros por chave</h4>
                  <v-tooltip text="Filtra os logs por uma chave específica e pelo valor correspondente." location="top">
                    <template #activator="{ props: tip }">
                      <v-icon v-bind="tip" icon="mdi-help-circle-outline" size="16" color="info" class="ml-1" />
                    </template>
                  </v-tooltip>
                </div>
                <div class="d-flex ga-3">
                  <v-text-field v-model="filters.key" label="Chave do filtro" placeholder="ex: email" density="compact" />
                  <v-text-field v-model="filters.value" label="Valor do filtro" placeholder="ex: 12345" density="compact" />
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="d-inline-flex align-center mb-3">
                  <h4>Filtros de operações</h4>
                  <v-tooltip text="Filtra pelo total de operações executadas no fluxo." location="top">
                    <template #activator="{ props: tip }">
                      <v-icon v-bind="tip" icon="mdi-help-circle-outline" size="16" color="info" class="ml-1" />
                    </template>
                  </v-tooltip>
                </div>
                <div class="d-flex ga-3">
                  <v-select v-model="filters.operator" :items="OPERATORS" label="Operador" density="compact" />
                  <v-text-field v-model="filters.operations" type="number" min="0" label="Qtd. de operações executadas" density="compact" />
                </div>
              </v-col>
            </v-row>
          </div>
        </v-expand-transition>
      </v-card>

      <!-- Resumo -->
      <v-row class="mb-2">
        <v-col v-for="item in summary" :key="item.label" cols="6" md="4" lg>
          <v-card class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-1 text-medium-emphasis">
              <v-icon :icon="item.icon" :color="item.color" size="20" />
              {{ item.label }}
            </div>
            <h2>{{ item.value }}</h2>
          </v-card>
        </v-col>
      </v-row>

      <!-- Gráfico -->
      <v-card class="pa-6 mb-7">
        <h3 class="mb-3">Execuções</h3>
        <DashboardChart :days="chartDays" />
      </v-card>

      <!-- Logs -->
      <v-card class="pa-6">
        <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
          <h3>Logs</h3>
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            placeholder="Pesquise informações de um log"
            density="compact"
            max-width="420"
            clearable
          />
        </div>
        <v-data-table
          :headers="HEADERS"
          :items="rows"
          :items-per-page="PER_PAGE"
          hide-default-footer
          hover
          class="logs-table"
          @click:row="(_, { item }) => openDetails(item)"
        >
          <template #[`item.result`]="{ value }">
            <v-chip :color="value === 'error' ? 'error' : 'success'" size="small" variant="tonal">
              {{ value === 'error' ? 'Erro' : 'Sucesso' }}
            </v-chip>
          </template>
          <template #no-data>
            <p class="font-weight-light text-center pa-4 mt-2">Nenhum log encontrado para os filtros selecionados.</p>
          </template>
        </v-data-table>
        <v-pagination v-if="pageCount > 1" v-model="page" class="mt-4" :length="pageCount" :total-visible="7" active-color="primary" />
      </v-card>
    </template>

    <!-- Detalhes da execução -->
    <AppModal v-model="detailsOpen" width="min(92vw, 820px)">
      <template v-if="selected">
        <div class="d-flex justify-space-between w-100 mb-4 pr-8 flex-wrap ga-3">
          <div>
            <h2>Detalhes da execução</h2>
            <p class="text-medium-emphasis">{{ longDate(selected.started_at) }} · {{ selected.origin ?? 'Terminal de testes' }}</p>
          </div>
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-replay" :loading="replaying" @click="replay">Executar novamente</v-btn>
        </div>
        <v-alert
          :type="selected.status === 'error' ? 'error' : 'success'"
          variant="tonal"
          class="mb-4"
          :title="selected.status === 'error' ? 'Sua integração NÃO foi executada!' : 'Sucesso na execução do fluxo!'"
        >
          <template v-if="selected.status === 'error'">
            Ocorreu um erro em
            <b>{{ getApp(selected.steps.at(-1).app).title }}</b>:
            {{ selected.steps.at(-1).output?.erro }}
          </template>
          <template v-else>
            Tempo de execução do fluxo: <b>{{ selected.duration_ms }} ms</b> · Operações: <b>{{ selected.operations ?? 0 }}</b>
          </template>
        </v-alert>
        <v-expansion-panels variant="accordion">
          <v-expansion-panel v-for="(step, i) in selected.steps" :key="`${step.id}-${i}`">
            <v-expansion-panel-title>
              <div class="d-flex align-center ga-3 w-100">
                <v-chip size="x-small" :color="step.status === 'error' ? 'error' : 'primary'">{{ i + 1 }}</v-chip>
                <span class="flex-grow-1">{{ getApp(step.app).title }} — {{ step.action }}</span>
                <span class="text-medium-emphasis text-small mr-2">{{ step.ms }} ms</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <pre class="json-output">{{ JSON.stringify(step.output ?? {}, null, 2) }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.date-field {
  min-width: 230px;
}

.flux-select {
  min-width: 240px;
}

.advanced-chevron {
  transition: transform 0.2s ease;
}

.advanced-chevron--open {
  transform: rotate(180deg);
}

.logs-table :deep(tbody tr) {
  cursor: pointer;
}

.json-output {
  font-family: monospace;
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 12px;
  border-radius: 8px;
  background: rgb(var(--v-theme-background));
}
</style>
