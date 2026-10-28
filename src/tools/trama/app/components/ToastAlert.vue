<script setup>
import { dismiss, toasts } from '@trama/composables/useToast'
</script>

<template>
  <div class="toast-stack">
    <v-slide-x-reverse-transition group>
      <v-alert
        v-for="toast in toasts"
        :key="toast.id"
        :color="toast.color"
        :icon="toast.icon"
        :title="toast.title || undefined"
        variant="flat"
        density="compact"
        rounded="lg"
        closable
        class="toast-item mb-2"
        @click:close="dismiss(toast.id)"
      >
        {{ toast.text }}
      </v-alert>
    </v-slide-x-reverse-transition>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 3000;
  width: 360px;
  max-width: calc(100vw - 32px);
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
}
</style>
