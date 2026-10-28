<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@trama/components/AppIcon.vue'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import NewConnectionModal from '@trama/components/connections/NewConnectionModal.vue'
import { deleteConnection, fetchConnections, reauthorizeConnection, renameConnection, verifyConnection } from '@trama/services/api'
import { toastError, toastInfo, toastSuccess } from '@trama/composables/useToast'
import { useSession } from '@trama/composables/useSession'

const connections = ref([])
const loading = ref(false)
const search = ref('')
const editingId = ref(null)
const editingName = ref('')
const busy = ref({})
const newConnOpen = ref(false)
const { selectedOrgId } = useSession()

const filtered = computed(() => {
  const term = search.value?.trim().toLowerCase()
  if (!term) return connections.value
  return connections.value.filter((c) => c.name.toLowerCase().includes(term) || c.app_name.toLowerCase().includes(term))
})

const canRename = computed(() => {
  const current = connections.value.find((c) => c.id === editingId.value)
  const name = editingName.value.trim()
  return !!name && name !== current?.name
})

onMounted(load)
watch(selectedOrgId, () => { connections.value = []; cancelRename(); load() })

let loadVersion = 0
async function load() {
  loading.value = true
  const version = ++loadVersion
  try {
    const result = await fetchConnections()
    if (version === loadVersion) connections.value = result
  } catch (error) {
    if (version === loadVersion) toastError({ text: error.userMessage ?? 'Não foi possível carregar as conexões.' })
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

function startRename(conn) {
  editingId.value = conn.id
  editingName.value = conn.name
}

function cancelRename() {
  editingId.value = null
  editingName.value = ''
}

async function run(conn, action, fn) {
  if (busy.value[conn.id]) return
  busy.value[conn.id] = action
  try {
    await fn()
  } finally {
    delete busy.value[conn.id]
  }
}

function confirmRename(conn) {
  if (!canRename.value) return
  run(conn, 'rename', async () => {
    try {
      const name = editingName.value.trim()
      await renameConnection(conn.id, name)
      conn.name = name
      cancelRename()
    } catch {
      toastError({ text: 'Não foi possível renomear a conexão.' })
    }
  })
}

function verify(conn) {
  run(conn, 'verify', async () => {
    try {
      const result = await verifyConnection(conn.id)
      toastInfo({
        color: result.connection_activated ? 'success' : 'warning',
        text: result.connection_activated ? 'Conexão ativa.' : 'Conexão inativa.',
      })
    } catch {
      toastError({ text: 'Não foi possível verificar a conexão.' })
    }
  })
}

function reauthorize(conn) {
  run(conn, 'update', async () => {
    try {
      const result = await reauthorizeConnection(conn.id)
      if (!result.connection_activated) throw new Error('O provedor não confirmou a conexão.')
      conn.verified = true
      toastSuccess({ text: 'Conexão verificada pelo provedor.' })
    } catch (error) {
      toastError({ text: error.userMessage ?? error.message ?? 'Não foi possível verificar a conexão.' })
    }
  })
}

function remove(conn) {
  run(conn, 'delete', async () => {
    try {
      await deleteConnection(conn.id)
      connections.value = connections.value.filter((c) => c.id !== conn.id)
    } catch {
      toastError({ text: 'Não foi possível excluir a conexão.' })
    }
  })
}
</script>

<template>
  <div class="connections-panel">
    <div class="connection-toolbar">
      <v-text-field
        v-model="search"
        label="Buscar conexões" placeholder="Nome ou aplicativo"
        prepend-inner-icon="mdi-magnify"
        hide-details
        density="comfortable"
        variant="outlined"
        rounded="lg"
        clearable
        max-width="420"
      />
      <v-chip v-if="!loading" size="small" variant="tonal" prepend-icon="mdi-link-variant">
        {{ filtered.length }} {{ filtered.length === 1 ? 'conexão' : 'conexões' }}
      </v-chip>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" rounded="lg" variant="flat" class="connection-create" @click="newConnOpen = true">
        Nova Conexão
      </v-btn>
      <v-btn icon variant="text" density="comfortable" aria-label="Atualizar conexões" :loading="loading" @click="load">
        <v-icon icon="mdi-refresh" />
        <v-tooltip activator="parent" location="top">Atualizar lista</v-tooltip>
      </v-btn>
    </div>

    <div v-if="loading" class="d-flex flex-column ga-2">
      <v-skeleton-loader v-for="n in 3" :key="n" type="list-item-avatar-two-line" />
    </div>

    <v-sheet v-else-if="filtered.length === 0" color="transparent" class="connections-empty">
      <v-icon icon="mdi-link-variant-off" size="48" class="mb-2 opacity-60" />
      <p class="mb-1">Nenhuma conexão encontrada</p>
      <p class="mb-3">
        {{ search ? 'Tente ajustar a busca ou limpar o filtro.' : 'Adicione um aplicativo e configure suas credenciais para usá-lo nos fluxos.' }}
      </p>
      <v-btn v-if="search" prepend-icon="mdi-close" variant="text" color="primary" @click="search = ''">Limpar busca</v-btn>
      <v-btn v-else prepend-icon="mdi-refresh" variant="tonal" color="primary" @click="load">Atualizar</v-btn>
    </v-sheet>

    <v-fade-transition v-else group>
      <v-card v-for="conn in filtered" :key="conn.id" class="connection-card" rounded="lg" variant="flat" hover>
        <div class="connection-record">
          <v-badge :color="conn.verified ? 'primary' : 'warning'" dot location="bottom end" offset-x="4" offset-y="4" bordered>
            <AppIcon :app="conn.app" :size="44" :rounded="8" />
          </v-badge>

          <div class="connection-main">
            <div class="d-flex align-center mb-1 ga-2">
              <template v-if="editingId === conn.id">
                <v-text-field
                  v-model="editingName"
                  label="Nome da conexão"
                  density="compact"
                  hide-details
                  variant="outlined"
                  autofocus
                  max-width="320"
                  :error="!editingName.trim()"
                  @keyup.enter="confirmRename(conn)"
                  @keyup.esc="cancelRename"
                />
                <v-btn icon="mdi-check" size="small" variant="tonal" aria-label="Salvar nome da conexão" color="primary" :disabled="!canRename" :loading="busy[conn.id] === 'rename'" @click="confirmRename(conn)" />
                <v-btn icon="mdi-close" size="small" variant="text" aria-label="Cancelar renomeação" :disabled="busy[conn.id] === 'rename'" @click="cancelRename" />
              </template>
              <template v-else>
                <h3 class="connection-name">{{ conn.name }}</h3>
                <v-chip
                  :color="conn.verified ? 'primary' : 'warning'"
                  :prepend-icon="conn.verified ? 'mdi-check-circle' : 'mdi-alert-circle'"
                  size="x-small"
                  variant="tonal"
                  class="flex-shrink-0"
                >
                  {{ conn.verified ? 'Ativa' : 'Inativa' }}
                </v-chip>
              </template>
            </div>
            <div class="d-flex align-center text-medium-emphasis text-small">
              <span>{{ conn.app_name }}</span>
              <v-icon icon="mdi-circle-small" size="12" />
              <span>{{ conn.connection_config }}</span>
            </div>
          </div>

          <div class="connection-actions">
            <v-btn icon size="small" variant="text" :aria-label="'Verificar ' + conn.name" :loading="busy[conn.id] === 'verify'" :disabled="editingId === conn.id" @click="verify(conn)">
              <v-icon icon="mdi-shield-check-outline" />
              <v-tooltip activator="parent" location="top">Verificar status</v-tooltip>
            </v-btn>
            <v-btn icon size="small" variant="text" :aria-label="'Reautorizar ' + conn.name" :loading="busy[conn.id] === 'update'" :disabled="editingId === conn.id" @click="reauthorize(conn)">
              <v-icon icon="mdi-key-outline" />
              <v-tooltip activator="parent" location="top">Reautorizar credenciais</v-tooltip>
            </v-btn>
            <v-btn icon size="small" variant="text" :aria-label="'Renomear ' + conn.name" :disabled="editingId !== null" @click="startRename(conn)">
              <v-icon icon="mdi-pencil-outline" />
              <v-tooltip activator="parent" location="top">Renomear</v-tooltip>
            </v-btn>
            <v-btn icon size="small" variant="text" :aria-label="'Excluir conexão ' + conn.name" :loading="busy[conn.id] === 'delete'" :disabled="editingId === conn.id">
              <v-icon icon="mdi-delete-outline" color="error" />
              <v-tooltip activator="parent" location="top">Excluir conexão</v-tooltip>
              <ModalConfirm
                activator="parent"
                header-text="Excluir conexão"
                confirm-text="Excluir conexão"
                cancel-text="Cancelar"
                color="error"
                icon="mdi-alert-outline"
                close-on-confirm
                @confirm="remove(conn)"
              >
                <p>
                  Tem certeza que deseja excluir a conexão <b>{{ conn.name }}</b>?
                </p>
              </ModalConfirm>
            </v-btn>
          </div>
        </div>
      </v-card>
    </v-fade-transition>

    <NewConnectionModal v-model="newConnOpen" @created="load" />
  </div>
</template>

<style scoped>
.connection-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap}.connection-toolbar>.v-input{min-width:200px;flex:1 1 300px}.connection-toolbar .v-spacer{flex:1 1 0}.connection-create{min-height:42px}.connection-card{margin-bottom:12px;border:1px solid rgb(var(--cm-line));border-radius:14px!important;background:rgb(var(--cm-surface-1));transition:border-color 160ms,background-color 160ms;box-shadow:none!important}.connection-card:hover{border-color:rgb(var(--cm-line-strong));background:rgb(var(--cm-surface-2)/.55)}.connection-record{display:flex;align-items:center;gap:17px;padding:20px}.connection-main{flex:1;min-width:0}.connection-name{font:650 15px/1.45 var(--trama-font-ui,Inter,sans-serif)!important;letter-spacing:-.02em;overflow-wrap:anywhere}.connection-main :deep(.v-chip){font-size:11px;min-height:24px;padding-inline:8px}.connection-main .text-small{font-size:12px!important;line-height:1.6;flex-wrap:wrap;overflow-wrap:anywhere;color:rgb(var(--cm-fg-dim))}.connection-actions{display:flex;align-items:center;gap:4px;flex-shrink:0}.connection-actions .v-btn{width:40px;height:40px;border-radius:9px;color:rgb(var(--cm-fg-dim))}.connection-actions .v-btn:hover{background:rgb(var(--cm-surface-3));color:rgb(var(--cm-fg))}.connections-empty{display:flex;align-items:center;flex-direction:column;gap:12px;text-align:center;padding:48px 20px;color:rgb(var(--cm-fg-muted))}.connections-empty>.v-icon{color:rgb(var(--cm-accent-ink));opacity:1!important}.connections-empty p{font-size:14px;line-height:1.65;max-width:430px}.connections-empty p:first-of-type{font-weight:700;font-size:19px;color:rgb(var(--cm-fg))}.min-w-0{min-width:0}
@media(max-width:700px){.connection-toolbar{gap:10px}.connection-toolbar>.v-input{max-width:none!important;min-width:0;flex:1 1 100%;order:0}.connection-toolbar>.v-chip{order:1}.connection-toolbar>.v-spacer{order:2}.connection-create{order:3;min-height:44px;font-size:12px}.connection-toolbar>.v-btn:last-child{order:4;min-width:44px;min-height:44px}.connection-record{align-items:flex-start;flex-wrap:wrap;padding:18px 16px;gap:14px}.connection-main{flex:1 1 calc(100% - 70px)}.connection-name{font-size:16px!important}.connection-main>.d-flex{flex-wrap:wrap;gap:8px!important}.connection-main .text-small{font-size:12px!important}.connection-actions{width:100%;border-top:1px solid rgb(var(--cm-line));padding-top:10px;justify-content:flex-end}.connection-actions .v-btn{min-width:44px;min-height:44px}.connections-empty p{font-size:16px}}
@media(prefers-reduced-motion:reduce){.connection-card{transition:none}}
</style>
