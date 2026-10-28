<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@trama/services/api'
import { getBlockState } from '@trama/utils/subscription'

const router = useRouter()
const block = computed(() => getBlockState(db.subscription, 'integration'))
</script>

<template>
  <div v-if="block.isBlocked" class="subscription-header d-flex align-center px-4 py-2">
    <v-icon icon="mdi-alert-outline" color="warning" size="28" class="mr-3" />
    <span>
      {{ block.text }}
      <a class="font-weight-bold text-decoration-underline cursor-pointer ml-1" @click="router.push('/profile?section=plan')">
        Faça o upgrade agora
      </a>
      <v-icon icon="mdi-open-in-new" size="14" />
    </span>
  </div>
</template>

<style scoped>
.subscription-header {
  background-color: color-mix(in srgb, rgb(var(--v-theme-warning)), transparent 82%);
  color: rgb(var(--v-theme-warning));
  min-height: 52px;
}
</style>
