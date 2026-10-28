<script setup>
// Tabela de membros da organização (equivalente ao OrgDataTable original):
// troca de papel, transferência de propriedade, remoção e "Mostrar mais" paginado.
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import { ORG_ROLES, isOrgAdmin, isOrgOwner, listOrgMembers, removeOrgUsers, updateOrgUserRole } from '@trama/services/api'
import { toastError, toastSuccess } from '@trama/composables/useToast'

const props = defineProps({
  orgId: { type: String, required: true },
  search: { type: String, default: '' },
})

const ROLE_LABELS = { [ORG_ROLES.OWNER]: 'Proprietário', [ORG_ROLES.ADMIN]: 'Administrador', [ORG_ROLES.DEVELOPER]: 'Desenvolvedor' }
const HEADERS = [
  { title: 'USUÁRIOS', key: 'name', sortable: true },
  { title: 'E-MAIL', key: 'email', sortable: true },
  { title: 'INGRESSOU EM', key: 'invite_accepted_at', sortable: true },
  { title: 'NÍVEL DE ACESSO', key: 'role', sortable: true },
  { title: '', key: 'delete', sortable: false },
]
const PER_PAGE = 10

const members = ref([])
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)

const removeOpen = ref(false)
const removing = ref(null)
const removeLoading = ref(false)
const transferOpen = ref(false)
const transfer = ref(null)
const transferLoading = ref(false)

const owner = computed(() => isOrgOwner(props.orgId))
const admin = computed(() => isOrgAdmin(props.orgId))
const isOwnerRole = (role) => String(role) === ORG_ROLES.OWNER

// Quem não é proprietário não vê a opção "Proprietário" nas linhas dos outros.
function roleItems(member) {
  const items = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))
  return (!owner.value || !member.invite_accepted_at) && !isOwnerRole(member.role) ? items.filter((i) => !isOwnerRole(i.value)) : items
}

const initial = (name) => name?.charAt(0)?.toUpperCase() ?? '?'
const formatDate = (iso) => new Date(iso).toLocaleDateString()

let loadVersion = 0
async function load(reset = true) {
  if (!props.orgId || (!reset && (page.value >= lastPage.value || loadingMore.value))) return
  const version = ++loadVersion
  const requestedPage = reset ? 1 : page.value + 1
  if (reset) {
    loading.value = true
    page.value = 1
  } else {
    loadingMore.value = true
  }
  try {
    const { data, meta } = await listOrgMembers(props.orgId, { search: props.search, page: requestedPage, perPage: PER_PAGE })
    if (version !== loadVersion) return
    page.value = requestedPage
    members.value = reset ? data : [...members.value, ...data]
    lastPage.value = meta.last_page
    total.value = meta.total
  } catch (error) {
    if (version === loadVersion) toastError({ text: error.userMessage ?? 'Não foi possível carregar os membros.' })
  } finally {
    if (version === loadVersion) { loading.value = false; loadingMore.value = false }
  }
}

function onRoleChange(member, newRole) {
  if (isOwnerRole(newRole) && !member.invite_accepted_at) return
  if (owner.value && isOwnerRole(newRole) && !isOwnerRole(member.role)) {
    transfer.value = { member, newRole }
    transferOpen.value = true
    return
  }
  if (isOwnerRole(newRole) && !owner.value) return
  changeRole(member, newRole)
}

async function changeRole(member, newRole) {
  try {
    await updateOrgUserRole(props.orgId, member.id, String(newRole))
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível alterar o nível de acesso.' })
  }
  await load()
}

// Transferir: o escolhido vira proprietário e o proprietário atual passa a administrador.
async function confirmTransfer() {
  if (!transfer.value) return
  const { member } = transfer.value
  transferLoading.value = true
  try {
    await updateOrgUserRole(props.orgId, member.id, ORG_ROLES.OWNER)
    toastSuccess({ title: 'Propriedade transferida', text: `A propriedade foi transferida para ${member.name || member.email}.` })
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível transferir a propriedade.' })
  } finally {
    transfer.value = null
    transferLoading.value = false
    await load()
  }
}

function askRemove(member) {
  removing.value = member
  removeOpen.value = true
}

async function confirmRemove() {
  if (!removing.value) return
  removeLoading.value = true
  try {
    await removeOrgUsers(props.orgId, [removing.value.id])
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível remover o usuário.' })
  } finally {
    removing.value = null
    removeLoading.value = false
    await load()
  }
}

let searchTimer = null
watch(
  () => props.search,
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => load(true), 400)
  },
)
watch(() => props.orgId, () => load(true), { immediate: true })
onBeforeUnmount(() => clearTimeout(searchTimer))

defineExpose({ reload: () => load(true) })
</script>

<template>
  <v-data-table
    :headers="HEADERS"
    :header-props="{ class: 'bg-background font-weight-bold' }"
    :items="members"
    :loading="loading"
    :items-per-page="-1"
    item-value="email"
    hover
  >
    <template #[`item.name`]="{ item }">
      <div class="d-flex align-center">
        <v-avatar class="user-data-avatar mr-2" size="40">{{ initial(item.name) }}</v-avatar>
        <h3 class="ml-2">{{ item.name }}</h3>
      </div>
    </template>

    <template #[`item.invite_accepted_at`]="{ item }">
      <template v-if="item.invite_accepted_at">{{ formatDate(item.invite_accepted_at) }}</template>
      <v-chip v-else size="small" color="warning" variant="tonal" prepend-icon="mdi-email-outline">Convite pendente</v-chip>
    </template>

    <template #[`item.role`]="{ item }">
      <v-select
        :model-value="String(item.role)"
        :items="roleItems(item)"
        item-title="label"
        item-value="value"
        variant="plain"
        density="compact"
        hide-details
        max-width="220"
        :readonly="isOwnerRole(item.role)"
        :menu-icon="isOwnerRole(item.role) ? '' : '$dropdown'"
        :disabled="!admin"
        @update:model-value="(role) => onRoleChange(item, role)"
      />
    </template>

    <template #[`item.delete`]="{ item }">
      <div class="d-flex justify-center delete-btn">
        <v-btn
          class="show-on-row-hover"
          icon
          variant="text"
          :disabled="isOwnerRole(item.role) || !admin"
          aria-label="Remover usuário"
          @click="askRemove(item)"
        >
          <v-icon :color="isOwnerRole(item.role) ? undefined : 'error'" icon="mdi-delete-outline" />
        </v-btn>
      </div>
    </template>

    <template #bottom>
      <div class="d-flex align-center justify-space-between pa-4 mt-2 bg-surface table-footer">
        <p class="text-body-2 mb-2">
          Exibindo <strong>{{ members.length }}</strong> de <strong>{{ total }}</strong> usuários
        </p>
        <div v-if="page < lastPage" class="text-center">
          <v-btn variant="text" class="text-button" :disabled="loadingMore" @click="load(false)">
            <v-progress-circular v-if="loadingMore" indeterminate size="18" width="2" />
            <template v-else>
              <v-icon start size="small" class="mr-1" icon="mdi-chevron-down" />
              <span>Mostrar mais</span>
            </template>
          </v-btn>
        </div>
      </div>
    </template>
  </v-data-table>

  <ModalConfirm
    v-model="removeOpen"
    header-text="Remover usuário"
    confirm-text="Remover"
    cancel-text="Cancelar"
    color="error"
    icon="mdi-alert-outline"
    :loading-confirm="removeLoading"
    @confirm="confirmRemove"
  >
    <p>
      Tem certeza que deseja remover o usuário <strong>{{ removing?.name || removing?.email }}</strong>?
    </p>
  </ModalConfirm>

  <ModalConfirm
    v-model="transferOpen"
    header-text="Transferir propriedade"
    confirm-text="Transferir"
    cancel-text="Cancelar"
    color="warning"
    icon="mdi-alert-outline"
    :loading-confirm="transferLoading"
    @confirm="confirmTransfer"
    @cancel="transfer = null"
  >
    <p>
      Tem certeza que deseja transferir a propriedade da organização para
      <strong>{{ transfer?.member?.name || transfer?.member?.email }}</strong>?
    </p>
    <p class="mt-2">⚠️ <b>Atenção:</b> você perderá o cargo de <b>Proprietário</b> e não poderá reverter essa ação.</p>
  </ModalConfirm>
</template>

<style scoped>
.user-data-avatar {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)), transparent 60%);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  border: rgb(var(--v-theme-primary)) 2px solid;
}

.delete-btn {
  min-width: 50px;
}

.table-footer {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.show-on-row-hover {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

:deep(.v-data-table__tr:hover) .show-on-row-hover {
  opacity: 1;
  pointer-events: auto;
}
</style>
