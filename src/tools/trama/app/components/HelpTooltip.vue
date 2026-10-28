<script setup>
defineProps({
  text: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
})
</script>

<template>
  <v-tooltip location="top" max-width="360">
    <template #activator="{ props: activatorProps }">
      <button v-bind="activatorProps" type="button" class="trama-help" :aria-label="'Ajuda: ' + text"><v-icon icon="mdi-help-circle-outline" :size="size" /></button>
    </template>
    {{ text }}
  </v-tooltip>
</template>
<style scoped>
.trama-help{display:inline-grid;place-items:center;min-width:32px;min-height:32px;color:rgb(var(--cm-info));border-radius:var(--trama-radius-sm);vertical-align:middle}.trama-help:hover{background:rgb(var(--cm-info-soft))}@media(pointer:coarse){.trama-help{min-width:44px;min-height:44px}}
</style>
