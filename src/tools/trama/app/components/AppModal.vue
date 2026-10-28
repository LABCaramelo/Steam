<script setup>
// Modal base usado em todo o app (equivalente ao modal genérico do original).
// Aceita "activator" como o v-dialog e expõe closeModal no slot padrão.
defineProps({
  width: { type: [String, Number], default: undefined },
  maxWidth: { type: [String, Number], default: '480px' },
  minWidth: { type: [String, Number], default: undefined },
  activator: { type: [String, Object], default: undefined },
  preventClose: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])
const model = defineModel({ type: Boolean, default: false })

function closeModal() {
  model.value = false
  emit('close')
}
</script>

<template>
  <v-dialog
    v-model="model"
    :activator="activator"
    :width="width"
    :max-width="width ? undefined : maxWidth"
    :min-width="minWidth"
    :persistent="preventClose"
    @update:model-value="(v) => !v && emit('close')"
  >
    <v-card class="app-modal pa-6 position-relative" rounded="lg">
      <v-btn
        v-if="!preventClose"
        class="app-modal-close"
        icon="mdi-close"
        size="small"
        variant="text"
        density="comfortable"
        @click="closeModal"
      />
      <slot :close-modal="closeModal" />
    </v-card>
  </v-dialog>
</template>

<style scoped>
.app-modal-close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}
</style>
