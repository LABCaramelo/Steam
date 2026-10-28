<script setup>
// Página "Organização" (/project), aberta pela engrenagem ao lado de cada organização na sidebar.
// Estrutura da organização com dados persistidos e permissões verificadas no servidor.
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import EditableText from '@trama/components/EditableText.vue'
import ModalConfirm from '@trama/components/ModalConfirm.vue'
import OrgDataTable from '@trama/components/project/OrgDataTable.vue'
import {
  ORG_ROLES,
  countOrgFluxes,
  db,
  deleteOrganization,
  inviteOrgUser,
  isOrgAdmin,
  isOrgOwner,
  updateOrganization,
  visibleOrganizations,
} from '@trama/services/api'
import { useSession } from '@trama/composables/useSession'
import { toastError, toastSuccess } from '@trama/composables/useToast'
import { email as emailRule, lengthBetween, required } from '@trama/utils/rules'

const router = useRouter()
const { selectedOrgId, selectOrg } = useSession()

const INVITE_ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'DEVELOPER', label: 'Desenvolvedor' },
]

const org = computed(() => {
  const list = visibleOrganizations()
  return list.find((o) => o.id === selectedOrgId.value) ?? list[0]
})
const owner = computed(() => !!org.value && isOrgOwner(org.value.id))
const admin = computed(() => !!org.value && isOrgAdmin(org.value.id))
const memberCount = computed(() => org.value?.members?.length ?? 0)
const planName = computed(() => {
  const name = db.subscription?.plan_name ?? 'Free'
  return name.split(' ').slice(1).join(' ') || name
})

const orgName = ref('')
const fluxCount = ref(null)
const loadingCount = ref(false)
const table = useTemplateRef('table')

function checkPermission() {
  if (org.value && !admin.value) {
    toastError({ text: 'Você não tem permissão para gerenciar esta organização.' })
    router.replace({ name: 'home' })
    return false
  }
  return true
}

async function loadCount() {
  if (!org.value) return
  loadingCount.value = true
  try {
    fluxCount.value = await countOrgFluxes(org.value.id)
  } catch (error) {
    fluxCount.value = null
    toastError({ text: error.userMessage || 'Não foi possível consultar a quantidade de integrações.' })
  } finally {
    loadingCount.value = false
  }
}

function refresh() {
  orgName.value = org.value?.name ?? '—'
  if (checkPermission()) loadCount()
}

onMounted(refresh)
watch(selectedOrgId, refresh)

// Nome
async function renameOrg(name) {
  const current = org.value
  if (!current || !admin.value) return
  const value = String(name ?? '').trim()
  if (!value || value === current.name) {
    orgName.value = current.name
    return
  }
  try {
    const updated = await updateOrganization({ id: current.id, name: value })
    orgName.value = updated.name
  } catch (error) {
    orgName.value = current.name
    toastError({ text: error.userMessage || 'Não foi possível atualizar o nome da organização.' })
  }
}

// Foto
const photoOpen = ref(false)
const newPhoto = ref('')
const savingPhoto = ref(false)
const fileInput = useTemplateRef('fileInput')

function pickPhoto(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
    toastError({ text: 'Escolha uma imagem PNG, JPEG ou WebP de até 1 MB.' })
    return
  }
  const reader = new FileReader()
  reader.onload = () => (newPhoto.value = reader.result)
  reader.readAsDataURL(file)
}

async function savePhoto() {
  if (!org.value) return
  if (!newPhoto.value) {
    photoOpen.value = false
    return
  }
  savingPhoto.value = true
  try {
    await updateOrganization({ id: org.value.id, image: newPhoto.value })
    newPhoto.value = ''
    photoOpen.value = false
    toastSuccess({ title: 'Imagem salva', text: 'A imagem da organização foi atualizada com sucesso.' })
  } catch {
    toastError({ text: 'Não foi possível atualizar a foto de perfil.' })
  } finally {
    savingPhoto.value = false
  }
}

// Convite
const search = ref('')
const inviteEmail = ref('')
const inviteRole = ref('ADMIN')
const inviting = ref(false)
const inviteValid = computed(() => !!inviteEmail.value && emailRule(inviteEmail.value) === true)
// O convite é persistido no servidor. Sem SMTP configurado, seu link pode ser compartilhado manualmente.
const inviteLink = ref(null)

function copyInviteLink() {
  navigator.clipboard
    .writeText(inviteLink.value.url)
    .then(() => toastSuccess({ text: 'Link de convite copiado.', icon: 'mdi-content-copy' }))
    .catch(() => toastError({ text: 'Não foi possível copiar o link.' }))
}

async function invite() {
  if (!org.value || !inviteValid.value) return
  const address = inviteEmail.value.trim()
  inviting.value = true
  try {
    const invited = await inviteOrgUser(org.value.id, { email: address, role: ORG_ROLES[inviteRole.value] })
    toastSuccess({ title: 'Convite criado', text: `Convite criado para ${address}.`, icon: 'mdi-email-check-outline' })
    inviteLink.value = { email: address, url: invited.invite_link }
    inviteEmail.value = ''
    inviteRole.value = 'DEVELOPER'
    table.value?.reload()
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível enviar o convite. Tente novamente mais tarde.' })
  } finally {
    inviting.value = false
  }
}

// Exclusão
const deleteOpen = ref(false)
const deleteConfirmation = ref('')
const deleting = ref(false)
const deleteMatches = computed(() => deleteConfirmation.value.trim() === (orgName.value ?? '').trim())

watch(deleteOpen, (open) => {
  if (!open) deleteConfirmation.value = ''
})

async function confirmDelete() {
  const current = org.value
  if (!current) return
  if (!deleteMatches.value) {
    toastError({ title: 'Confirmação incorreta', text: 'Digite corretamente o nome da organização para confirmar a exclusão.' })
    return
  }
  deleting.value = true
  try {
    await deleteOrganization(current.id)
    toastSuccess({ title: 'Organização excluída', text: 'A organização foi excluída com sucesso.' })
    const next = visibleOrganizations()[0]
    selectOrg(next?.id ?? null)
    if (!next) router.replace({ name: 'home' })
  } catch (error) {
    toastError({ text: error.userMessage ?? 'Não foi possível excluir a organização.' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div>
    <div class="d-flex justify-space-between pa-10">
      <div class="clickable-button d-flex align-center pa-2" @click="router.back()">
        <v-btn icon="mdi-chevron-left" density="comfortable" variant="tonal" color="primary" />
        <h2 class="ml-3 text-primary">Voltar</h2>
      </div>
      <div class="d-flex align-center pa-2">
        <v-btn
          v-if="owner"
          density="comfortable"
          variant="text"
          color="error"
          size="large"
          :disabled="loadingCount"
          @click="deleteOpen = true"
        >
          Excluir organização
          <v-icon icon="mdi-delete-outline" />
        </v-btn>
      </div>
    </div>

    <v-container>
      <v-row class="d-flex">
        <v-col cols="12" md="6" class="d-flex">
          <v-card class="d-flex flex-grow-1" flat>
            <div class="d-flex align-center">
              <div class="d-flex flex-column align-center justify-center ml-4 my-2">
                <v-avatar rounded="lg" class="organization-image border mt-2" color="faded" size="60">
                  <v-img v-if="org?.image" :src="org.image" :alt="orgName" cover />
                  <v-icon v-else icon="mdi-domain" size="28" />
                </v-avatar>
                <v-btn v-if="admin" variant="plain" @click="photoOpen = true">
                  Editar
                  <v-icon icon="mdi-square-edit-outline" size="12" class="ml-1" />
                </v-btn>
              </div>
            </div>
            <div class="d-flex flex-column justify-center">
              <v-divider vertical class="px-2" length="90px" :thickness="2" />
            </div>
            <div class="d-flex flex-column justify-center">
              <EditableText
                v-if="admin"
                v-model:input="orgName"
                class="px-2 mx-4"
                :rules="[lengthBetween(5, 20), required]"
                @changed-title="renameOrg"
              />
              <h2 v-else class="px-2 mx-4">{{ orgName }}</h2>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="2" class="d-flex">
          <v-card class="flex-grow-1" flat>
            <div class="pa-6 d-flex align-center">
              <div>
                <p>Integrações</p>
                <h2>
                  <v-progress-circular v-if="loadingCount" indeterminate size="20" color="primary" />
                  <span v-else>{{ fluxCount ?? '—' }}</span>
                </h2>
              </div>
              <v-icon class="round-icon" icon="mdi-transit-connection-variant" size="x-large" color="primary" />
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="2" class="d-flex">
          <v-card class="flex-grow-1" flat>
            <div class="pa-6 d-flex align-center">
              <div>
                <p>Plano</p>
                <h2>{{ planName }}</h2>
              </div>
              <v-icon class="round-icon" icon="mdi-currency-usd" size="x-large" color="info" />
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="2" class="d-flex">
          <v-card class="flex-grow-1" flat>
            <div class="pa-6 d-flex align-center">
              <div>
                <p>Usuários</p>
                <h2>{{ memberCount }}</h2>
              </div>
              <v-icon class="round-icon" icon="mdi-account-multiple" size="x-large" color="error" />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-divider class="mt-8 mx-10" />

    <div class="pa-10">
      <v-toolbar class="members-toolbar">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="plain"
          hide-details
          class="w-33 ml-2"
          placeholder="Pesquisar"
        />
        <template v-if="admin">
          <v-spacer />
          <v-text-field
            v-model="inviteEmail"
            prepend-inner-icon="mdi-magnify"
            placeholder="Insira um e-mail"
            class="mr-4 my-input"
            density="compact"
            hide-details="auto"
            :rules="[emailRule]"
            @keydown.enter="invite"
          >
            <template v-if="inviteEmail" #append-inner>
              <v-select
                v-model="inviteRole"
                :items="INVITE_ROLES"
                item-title="label"
                item-value="value"
                variant="plain"
                density="compact"
                hide-details
                class="ml-0 my-select"
                @click.stop
              />
            </template>
          </v-text-field>
          <v-btn variant="outlined" color="primary" class="mr-6" :disabled="!inviteValid" :loading="inviting" @click="invite">
            <v-icon icon="mdi-plus" class="mr-2" />
            Adicionar Usuário
          </v-btn>
        </template>
      </v-toolbar>
      <OrgDataTable v-if="org" ref="table" :org-id="org.id" :search="search ?? ''" />
    </div>

    <!-- Link do convite (no original vai por e-mail) -->
    <v-dialog :model-value="!!inviteLink" max-width="560" @update:model-value="(open) => !open && (inviteLink = null)">
      <v-card v-if="inviteLink" rounded="lg" class="pa-6">
        <div class="d-flex align-center mb-2">
          <v-icon icon="mdi-email-fast-outline" color="primary" class="mr-2" />
          <h3>Convite para {{ inviteLink.email }}</h3>
        </div>
        <p class="text-medium-emphasis text-small mb-4">
          O envio de e-mails não está configurado. Compartilhe o link abaixo com o convidado: ele entra (ou cria a conta com esse
          e-mail) e o convite é aceito automaticamente.
        </p>
        <v-text-field :model-value="inviteLink.url" readonly density="compact" hide-details class="mb-4">
          <template #append-inner>
            <v-btn icon="mdi-content-copy" size="small" variant="text" @click="copyInviteLink" />
          </template>
        </v-text-field>
        <div class="d-flex justify-end">
          <v-btn color="primary" @click="inviteLink = null">Fechar</v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Foto da organização -->
    <v-dialog v-model="photoOpen" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Alterar foto da organização</span>
          <v-btn icon="mdi-close" variant="text" @click="photoOpen = false" />
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-row class="ga-4" align="center" justify="space-around">
            <v-col cols="12" sm="5" class="d-flex flex-column align-center">
              <h4 class="mb-2">Atual</h4>
              <v-avatar rounded="lg" size="140" color="faded">
                <v-img v-if="org?.image" :src="org.image" :alt="orgName" cover />
                <v-icon v-else icon="mdi-domain" size="50" />
              </v-avatar>
            </v-col>
            <v-icon size="28">mdi-arrow-right</v-icon>
            <v-col cols="12" sm="5" class="d-flex flex-column align-center">
              <h4 class="mb-2">Nova imagem</h4>
              <button class="photo-picker" @click="fileInput.click()">
                <v-img v-if="newPhoto" :src="newPhoto" cover width="140" height="140" />
                <v-icon v-else icon="mdi-image-plus-outline" size="40" />
              </button>
              <input ref="fileInput" type="file" accept="image/*" hidden @change="pickPhoto" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-divider />
        <v-card-actions class="d-flex pa-4 align-center justify-space-around">
          <v-spacer />
          <v-btn variant="text" @click="photoOpen = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="savingPhoto" :disabled="savingPhoto || !newPhoto" @click="savePhoto">
            Concluir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Exclusão -->
    <ModalConfirm
      v-model="deleteOpen"
      header-text="Deletar organização"
      confirm-text="Deletar organização"
      cancel-text="Cancelar"
      color="error"
      icon="mdi-alert-outline"
      :loading-confirm="deleting"
      :confirm-disabled="!deleteMatches"
      @confirm="confirmDelete"
    >
      <h3>
        Tem certeza que deseja excluir a organização "<b>{{ orgName }}"</b>?
      </h3>
      <div class="mt-2 mb-4">
        <p v-if="!fluxCount">
          Essa ação é <b>irreversível</b> e a organização será <b>permanentemente excluída</b>.
        </p>
        <p v-else>
          Essa ação é <b>irreversível</b>.<br />
          Ao confirmar, você perderá <b>{{ fluxCount }}</b>
          {{ fluxCount === 1 ? 'integração associada' : 'integrações associadas' }} a esta organização.<br />
          Todas as suas <b>integrações</b> e <b>dados vinculados</b> serão permanentemente removidos.
        </p>
      </div>
      <p class="mb-2">Para confirmar, digite o nome exato da organização abaixo:</p>
      <v-text-field
        v-model="deleteConfirmation"
        placeholder="Digite o nome da organização"
        variant="outlined"
        density="compact"
        hide-details
      />
    </ModalConfirm>
  </div>
</template>

<style scoped>
.clickable-button {
  cursor: pointer;
}

.round-icon {
  border-radius: 50%;
  background-color: rgb(var(--v-theme-background));
  width: 50px;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: auto;
}

.members-toolbar {
  background-color: rgb(var(--v-theme-surface));
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}

.my-input,
.my-select {
  width: 200px;
}

.my-input {
  max-width: 360px;
}

.photo-picker {
  width: 140px;
  height: 140px;
  border-radius: 8px;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 2px dashed rgb(var(--v-theme-primary));
}
</style>
