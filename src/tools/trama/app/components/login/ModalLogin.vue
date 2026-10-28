<script setup>
import AppModal from '@trama/components/AppModal.vue'
import TramaLogo from '@trama/components/TramaLogo.vue'

const props = defineProps({
  color: { type: String, default: 'primary' },
  headerText: { type: String, default: '' },
  bodyText: { type: String, default: '' },
  confirmText: { type: String, default: 'Voltar ao login' },
  lostEmailText: { type: String, default: '' },
  loadingConfirm: { type: Boolean, default: false },
  activator: { type: [String, Object], default: undefined },
})

const emit = defineEmits(['confirm', 'close', 'change-tab', 'reset-password', 'close-modal'])
const model = defineModel({ type: Boolean, default: false })

function backToLogin() {
  emit('change-tab', 'login')
  emit('close-modal')
  emit('confirm')
}
</script>

<template>
  <AppModal v-model="model" width="480px" :activator="activator" :prevent-close="loadingConfirm" @close="emit('close')">
    <div class="d-flex flex-column align-center my-6" style="position: relative">
      <TramaLogo logo-width="250" by3c />
    </div>
    <div class="d-flex align-center text-center justify-center pa-2">
      <div>
        <h3>{{ headerText }}</h3>
        <p>{{ bodyText }}</p>
      </div>
    </div>
    <div>
      <div class="mb-4">
        <slot />
      </div>
      <div class="d-flex flex-nowrap justify-end">
        <v-btn :color="props.color" block flat :loading="loadingConfirm" @click="backToLogin">
          <slot name="confirm-btn">{{ confirmText }}</slot>
        </v-btn>
      </div>
      <div class="d-flex align-center justify-center pt-4">
        {{ lostEmailText }}
        <a v-if="lostEmailText" class="font-weight-bold ml-1 cursor-pointer" @click="emit('reset-password')">Reenviar</a>
      </div>
    </div>
  </AppModal>
</template>
