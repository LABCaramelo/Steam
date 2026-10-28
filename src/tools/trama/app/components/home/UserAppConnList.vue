<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AppIcon from '@trama/components/AppIcon.vue'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import { db, deleteConnection, fetchUserApps, reauthorizeConnection, verifyConnection } from '@trama/services/api'
import { getApp } from '@trama/services/apps'
import { toastError, toastSuccess } from '@trama/composables/useToast'
import { useSession } from '@trama/composables/useSession'

const props = defineProps({
  maxItems: { type: Number, default: undefined },
})

const apps = ref([])
const loading = ref(false)
const selectedApp = ref(null)
const selected = ref([])
const deleting = ref(false)
const verifyState = ref({})
const { selectedOrgId } = useSession()

const visibleApps = computed(() => (props.maxItems ? apps.value.slice(0, props.maxItems) : apps.value))
const connections = computed(() => (selectedApp.value ? db.connections.filter((c) => c.app === selectedApp.value.id) : []))
const allSelected = computed(() => connections.value.length > 0 && selected.value.length === connections.value.length)
const multipleSelected = computed(() => selected.value.length > 0)

// Sem conexões restantes no app aberto, volta para a lista de apps.
watch(
  () => connections.value.length,
  (count) => {
    if (selectedApp.value && count === 0) {
      selectedApp.value = null
      load()
    }
  },
)

onMounted(load)
watch(selectedOrgId, () => { selectedApp.value = null; selected.value = []; apps.value = []; load() })

let loadVersion = 0
async function load() {
  loading.value = true
  const version = ++loadVersion
  try {
    const result = await fetchUserApps()
    if (version === loadVersion) apps.value = result
  } catch (error) {
    if (version === loadVersion) toastError({ text: error.userMessage ?? 'Não foi possível carregar os aplicativos conectados.' })
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

function openApp(app) {
  selected.value = []
  selectedApp.value = { id: app.app_id, name: app.app_name }
}

function toggleAll() {
  selected.value = allSelected.value ? [] : connections.value.map((c) => c.id)
}

async function verify(ids) {
  for (const id of ids) {
    verifyState.value[id] = 'loading'
    verifyConnection(id)
      .then((r) => {
        verifyState.value[id] = r.connection_activated ? 'success' : 'error'
        setTimeout(() => delete verifyState.value[id], 5000)
      })
      .catch(() => {
        delete verifyState.value[id]
        toastError({ text: 'Não foi possível verificar a conexão' })
      })
  }
}

async function reauthorize(conn) {
  try {
    const result = await reauthorizeConnection(conn.id)
    if (!result.connection_activated) throw new Error('O provedor não confirmou a conexão.')
    toastSuccess({ text: `Conexão "${conn.name}" verificada.` })
  } catch (error) {
    toastError({ text: error.userMessage ?? error.message ?? 'Não foi possível verificar a conexão.' })
  }
}

async function remove(ids) {
  deleting.value = true
  try {
    await Promise.all(ids.map((id) => deleteConnection(id)))
    selected.value = []
    await load()
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível remover todas as conexões.' })
    await load()
  } finally {
    deleting.value = false
  }
}

function nameOf(id) {
  return connections.value.find((c) => c.id === id)?.name ?? 'Nome não encontrado'
}

// Tipos 3 e 4 do original (chave/token) são "Atualizar"; OAuth é "Reautorizar".
function isEditable(conn) {
  return conn.connection_config !== 'OAuth2'
}
</script>

<template>
  <div>
    <v-card v-if="loading" class="pa-5 d-flex flex-column" rounded="lg" variant="flat">
      <v-skeleton-loader v-for="n in 3" :key="n" width="100%" type="list-item-avatar" class="pb-4" />
    </v-card>

    <div v-else class="d-flex flex-column" :class="{ 'justify-center': apps.length === 0 }">
      <div v-if="apps.length === 0" class="text-center py-6">
        <v-icon icon="mdi-link-variant-off" size="40" class="mb-2 opacity-60" />
        <div class="mb-1">Nenhuma conexão cadastrada</div>
        <p class="mb-3">Crie uma conexão dentro de uma integração</p>
        <v-btn prepend-icon="mdi-refresh" color="primary" variant="tonal" size="small" @click="load">Atualizar</v-btn>
      </div>

      <v-window :model-value="selectedApp ? 'connection' : 'apps'" class="overflow-auto overflow-x-hidden">
        <v-window-item value="apps">
          <v-list density="compact" class="pa-0" bg-color="transparent">
            <v-list-item
              v-for="app in visibleApps"
              :key="app.app_id"
              border
              rounded="lg"
              class="mb-1 pa-2"
              append-icon="mdi-chevron-right"
              @click="openApp(app)"
            >
              <template #prepend>
                <AppIcon :app="app.app_id" :size="36" :rounded="8" class="mr-3" />
              </template>
              <v-list-item-title>{{ app.app_name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ app.total_connections }} {{ app.total_connections === 1 ? 'conexão' : 'conexões' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-window-item>

        <v-window-item value="connection">
          <div v-if="selectedApp">
            <div class="d-flex align-center mb-2">
              <v-btn class="mr-1" icon="mdi-chevron-left" density="compact" variant="tonal" color="primary" size="small" @click="selectedApp = null" />
              <span>{{ getApp(selectedApp.id).title }}</span>
            </div>

            <div class="d-flex justify-space-between align-center">
              <v-checkbox
                :model-value="allSelected"
                label="Selecionar todos"
                color="secondary"
                density="compact"
                hide-details
                @update:model-value="toggleAll"
              />
              <div class="d-flex align-center mr-2">
                <v-btn size="small" variant="outlined" color="primary" class="px-1 mr-2" :disabled="!multipleSelected" @click="verify(selected)">
                  Verificar
                </v-btn>
                <v-btn variant="plain" icon :disabled="!multipleSelected">
                  <v-icon icon="mdi-delete-outline" />
                  <v-tooltip activator="parent" location="top">{{ selected.length === 1 ? 'Excluir conexão' : 'Excluir conexões' }}</v-tooltip>
                  <ModalConfirm
                    activator="parent"
                    header-text="Excluir conexão"
                    confirm-text="Excluir conexão"
                    cancel-text="Cancelar"
                    :loading-confirm="deleting"
                    color="error"
                    icon="mdi-alert-outline"
                    @confirm="remove(selected)"
                  >
                    <p>Tem certeza que deseja excluir as seguintes conexões?</p>
                    <ul v-for="id in selected" :key="id" class="ml-4">
                      <li><b>{{ nameOf(id) }}</b></li>
                    </ul>
                  </ModalConfirm>
                </v-btn>
              </div>
            </div>

            <v-item-group v-model="selected" multiple>
              <v-item v-for="conn in connections" :key="conn.id" v-slot="{ isSelected, toggle }" :value="conn.id">
                <v-card
                  class="connection-card"
                  :class="{ 'selected-connection-card': isSelected }"
                  rounded="lg"
                  border
                  @click="toggle"
                >
                  <v-row class="d-flex justify-space-between align-center" no-gutters>
                    <v-col cols="5" class="d-inline-block text-truncate pr-2">
                      {{ conn.name }}
                      <p class="text-caption">{{ conn.connection_config }}</p>
                    </v-col>
                    <v-col cols="3" class="px-1">
                      <v-btn
                        block
                        class="text-caption"
                        size="small"
                        variant="tonal"
                        color="secondary"
                        :disabled="multipleSelected"
                        @click.stop="reauthorize(conn)"
                      >
                        {{ isEditable(conn) ? 'Atualizar' : 'Reautorizar' }}
                      </v-btn>
                    </v-col>
                    <v-col cols="3" class="text-center position-relative">
                      <v-btn
                        v-if="!verifyState[conn.id] || verifyState[conn.id] === 'loading'"
                        block
                        size="small"
                        variant="tonal"
                        color="primary"
                        class="text-caption"
                        :loading="verifyState[conn.id] === 'loading'"
                        :disabled="multipleSelected"
                        @click.stop="verify([conn.id])"
                      >
                        Verificar
                      </v-btn>
                      <v-icon
                        v-else
                        :icon="verifyState[conn.id] === 'success' ? 'mdi-check-circle' : 'mdi-close-circle'"
                        :color="verifyState[conn.id] === 'success' ? 'primary' : 'error'"
                      >
                        <v-tooltip activator="parent" location="top">
                          {{ verifyState[conn.id] === 'success' ? 'Conexão ativa' : 'Conexão inativa' }}
                        </v-tooltip>
                      </v-icon>
                    </v-col>
                  </v-row>
                </v-card>
              </v-item>
            </v-item-group>
          </div>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>

<style scoped>
.connection-card {
  margin-bottom: 8px;
  margin-left: 2px;
  margin-right: 2px;
  padding: 8px;
  cursor: pointer;
}

.selected-connection-card {
  border-color: rgb(var(--v-theme-secondary)) !important;
}
</style>
