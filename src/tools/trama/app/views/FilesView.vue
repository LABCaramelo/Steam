<script setup>
import { onMounted, ref } from 'vue'
import { tramaFetch } from '@trama/services/transport'
import AppModal from '@trama/components/AppModal.vue'
const files = ref([]), loading = ref(true), busy = ref(false), error = ref(''), removeTarget = ref(null), input = ref(null)
const formatSize = bytes => Number(bytes || 0) < 1024 ? `${bytes || 0} B` : Number(bytes) < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`
async function request(path, options) {
  const response = await tramaFetch(path, options)
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error?.message || body.error || 'Não foi possível concluir esta ação.') }
  return response
}
async function load() {
  loading.value = true; error.value = ''
  try { const body = await (await request('/files')).json(); files.value = Array.isArray(body) ? body : body.files || [] }
  catch (reason) { error.value = reason.message }
  finally { loading.value = false }
}
async function upload(event) {
  const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
  if (file.size > 2 * 1024 * 1024) { error.value = 'Escolha um arquivo de até 2 MB.'; return }
  busy.value = true; error.value = ''
  try {
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.')); reader.readAsDataURL(file) })
    const mime = file.type || ({ json: 'application/json', csv: 'text/csv', txt: 'text/plain' })[file.name.split('.').pop()?.toLowerCase()] || 'application/octet-stream'
    await request('/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, mime, data }) })
    await load()
  } catch (reason) { error.value = reason.message } finally { busy.value = false }
}
async function download(file) {
  busy.value = true; error.value = ''
  try { const blob = await (await request('/files/' + encodeURIComponent(file.id))).blob(); const link = document.createElement('a'), url = URL.createObjectURL(blob); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  catch (reason) { error.value = reason.message } finally { busy.value = false }
}
async function remove() {
  const file = removeTarget.value; if (!file) return
  busy.value = true; error.value = ''
  try { await request('/files/' + encodeURIComponent(file.id), { method: 'DELETE' }); removeTarget.value = null; await load() }
  catch (reason) { error.value = reason.message } finally { busy.value = false }
}
onMounted(load)
</script>
<template>
  <main class="trama-content-page">
    <header class="trama-page-heading"><div><p class="trama-eyebrow">ARQUIVOS / ESPAÇO PRIVADO</p><h1>Guarde o que<br/>move seu fluxo.</h1><p>Envie referências e entradas de dados para o seu espaço na Trama.</p></div><v-btn class="cm-brand-action" prepend-icon="mdi-upload" :loading="busy" :disabled="loading" @click="input.click()">Enviar arquivo</v-btn></header>
    <input ref="input" type="file" aria-label="Arquivo para enviar à Trama" accept=".txt,.csv,.json,.png,.jpg,.jpeg,.pdf" hidden @change="upload"/>
    <p class="text-muted mb-6">TXT, CSV, JSON, PNG, JPG ou PDF · até 2 MB por arquivo. Cada download verifica seu acesso.</p>
    <v-alert v-if="error" color="error" variant="tonal" role="alert" class="mb-4">{{ error }} <v-btn variant="text" @click="load">Tentar novamente</v-btn></v-alert>
    <div v-if="loading" class="trama-file-empty" role="status"><v-progress-circular indeterminate color="primary"/>Carregando seus arquivos…</div>
    <div v-else-if="!files.length && !error" class="trama-file-empty"><v-icon icon="mdi-folder-open-outline" size="44"/><h2>Um espaço para suas próximas ideias.</h2><p>Seu primeiro arquivo começa no botão Enviar arquivo.</p></div>
    <div v-else class="trama-file-list"><article v-for="file in files" :key="file.id" class="trama-file-row"><v-icon icon="mdi-file-outline" size="25"/><div><h2>{{ file.name }}</h2><p>{{ formatSize(file.size || file.size_bytes) }}<span v-if="file.created_at"> · {{ new Date(file.created_at).toLocaleDateString('pt-BR') }}</span></p></div><v-btn variant="text" :aria-label="'Baixar ' + file.name" :disabled="busy" icon="mdi-download-outline" @click="download(file)"/><v-btn variant="text" color="error" :aria-label="'Excluir ' + file.name" :disabled="busy" icon="mdi-delete-outline" @click="removeTarget = file"/></article></div>
    <AppModal :model-value="!!removeTarget" max-width="430px" :prevent-close="busy" @update:model-value="value => { if (!value) removeTarget = null }"><h2>Excluir arquivo?</h2><p class="my-4">“{{ removeTarget?.name }}” será removido do seu espaço.</p><div class="d-flex justify-end ga-2"><v-btn variant="text" :disabled="busy" @click="removeTarget = null">Cancelar</v-btn><v-btn color="error" :loading="busy" @click="remove">Excluir arquivo</v-btn></div></AppModal>
  </main>
</template>
