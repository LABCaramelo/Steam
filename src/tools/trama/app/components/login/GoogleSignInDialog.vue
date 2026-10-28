<script setup>
import AppModal from '@trama/components/AppModal.vue'
const model = defineModel({ type: Boolean, default: false })
</script>
<template>
  <AppModal v-model="model" width="min(90vw, 440px)">
    <h3 class="d-flex align-center ga-2 mb-4"><v-icon icon="mdi-google" color="primary" />Entrar com Google</h3>
    <p class="mb-5">O acesso com Google precisa de um cliente OAuth configurado neste servidor. Utilize seu e-mail e senha para entrar nesta instalação.</p>
    <v-btn color="primary" block @click="model = false">Voltar</v-btn>
  </AppModal>
</template>
