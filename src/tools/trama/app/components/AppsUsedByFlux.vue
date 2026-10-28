<script setup>
import { getApp } from '@trama/services/apps'
import AppIcon from './AppIcon.vue'

const MAX = 5

defineProps({
  usedApps: { type: Array, default: undefined },
})
</script>

<template>
  <div v-if="usedApps" class="d-flex align-center images-container">
    <v-tooltip v-for="(app, index) in usedApps.slice(0, MAX)" :key="app + index" location="top" :open-delay="200">
      <template #activator="{ props: activatorProps }">
        <AppIcon v-bind="activatorProps" :app="app" shadow class="card-image" :class="{ 'ml-0': !index }" />
      </template>
      {{ getApp(app).title }}
    </v-tooltip>
    <p v-if="usedApps.length > MAX" class="ms-2 font-weight-bold">+{{ usedApps.length - MAX }}</p>
    <p v-else-if="!usedApps.length" class="text-primary">Sem apps</p>
  </div>
</template>

<style scoped>
.images-container {
  min-height: 40px;
}

.images-container .card-image {
  margin-left: -5px;
  margin-right: -3px;
}
</style>
