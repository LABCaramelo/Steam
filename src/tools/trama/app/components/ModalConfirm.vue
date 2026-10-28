<script setup>
import { computed, ref, watch } from 'vue'
import AppModal from './AppModal.vue'

const props = defineProps({
  color: { type: String, default: 'error' },
  icon: { type: String, default: 'mdi-delete-outline' },
  headerText: { type: String, default: 'Você tem certeza?' },
  confirmText: { type: String, default: 'Sim, quero excluir!' },
  cancelText: { type: String, default: 'Cancelar' },
  closeOnConfirm: { type: Boolean, default: false },
  loadingConfirm: { type: Boolean, default: false },
  confirmDisabled: { type: Boolean, default: false },
  activator: { type: [String, Object], default: undefined },
})

const emit = defineEmits(['confirm', 'cancel', 'close'])
const model = defineModel({ type: Boolean, default: false })
const loading = computed(() => props.loadingConfirm)
const tone = computed(() => ({ error:'danger', success:'success', warning:'warning', info:'info' }[props.color] || 'accent-ink'))
const internalLoading = ref(false)

// Fecha automaticamente quando o carregamento externo termina (como no original).
watch(loading, (now, before) => {
  if (before && !now) model.value = false
})

function cancel() {
  if (!loading.value) model.value = false
  emit('cancel')
}

function confirm() {
  if (props.closeOnConfirm) model.value = false
  emit('confirm')
}
</script>

<template>
  <AppModal v-model="model" max-width="480px" :activator="activator" :prevent-close="loading || internalLoading" @close="emit('close')">
    <div class="confirm-heading">
      <v-sheet class="confirm-icon" :style="{ '--confirm-tone': `var(--cm-${tone})` }">
        <v-icon :icon="icon" />
      </v-sheet>
      <h3 class="font-weight-black">{{ headerText }}</h3>
    </div>
    <div>
      <div class="confirm-description">
        <slot />
      </div>
      <div class="confirm-actions">
        <v-btn variant="outlined" :disabled="loading" @click="cancel">{{ cancelText }}</v-btn>
        <v-btn :color="color" :loading="loading" :disabled="confirmDisabled" @click="confirm">
          <slot name="confirm-btn">{{ confirmText }}</slot>
        </v-btn>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.confirm-heading{display:flex;align-items:center;gap:14px;padding-right:4px;margin-bottom:16px}
.confirm-heading h3{font-size:23px;line-height:1.2}
.confirm-icon{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:12px;background:rgb(var(--confirm-tone)/.09)!important;color:rgb(var(--confirm-tone))!important;border:1px solid rgb(var(--confirm-tone)/.25)}
.confirm-description{padding:0 0 24px;color:rgb(var(--cm-fg-muted));font-size:14px;line-height:1.65}
.confirm-actions{display:flex;gap:10px;justify-content:flex-end;padding-top:20px;border-top:1px solid rgb(var(--cm-line))}
.confirm-actions .v-btn{min-height:42px;font-weight:650}
@media(max-width:600px){.confirm-heading h3{font-size:22px}.confirm-description{font-size:16px}.confirm-actions{display:grid;grid-template-columns:1fr 1fr}.confirm-actions .v-btn{min-height:44px;font-size:13px}}
</style>
