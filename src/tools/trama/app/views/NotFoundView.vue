<script setup>
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import darkImage from '@trama/assets/illustrations/not-found-dark.svg'
import lightImage from '@trama/assets/illustrations/not-found-light.svg'

const theme = useTheme()
const image = computed(() => (theme.global.current.value.dark ? darkImage : lightImage))
</script>

<template>
  <div class="d-flex text-center align-center justify-center pa-6">
    <div class="line-gap-2">
      <h2>Ops! Parece que você se perdeu...</h2>
      <p>
        Infelizmente, essa página que você procurou não existe.<br />
        Pode ter sido movida ou o link pode estar incorreto.
      </p>
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-home" :to="{ name: 'home' }">Página Inicial</v-btn>
      <div>
        <img class="not-found-img" :src="image" alt="" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-img {
  height: 60vh;
  max-width: 100%;
}
</style>
