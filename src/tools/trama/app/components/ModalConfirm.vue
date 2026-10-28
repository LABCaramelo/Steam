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
    <div class="d-flex align-center mb-2">
      <v-sheet :color="color" class="rounded-lg px-2 py-1 mr-3">
        <v-icon :icon="icon" />
      </v-sheet>
      <h3 class="font-weight-black">{{ headerText }}</h3>
    </div>
    <div>
      <div class="mb-4">
        <slot />
      </div>
      <div class="d-flex flex-nowrap justify-end">
        <v-btn variant="text" :color="color" class="mr-3" @click="cancel">{{ cancelText }}</v-btn>
        <v-btn :color="color" :loading="loading" :disabled="confirmDisabled" @click="confirm">
          <slot name="confirm-btn">{{ confirmText }}</slot>
        </v-btn>
      </div>
    </div>
  </AppModal>
</template>
