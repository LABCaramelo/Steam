<script setup>
defineProps({
  text: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
})
</script>

<template>
  <v-tooltip location="top" max-width="360">
    <template #activator="{ props: activatorProps }">
      <v-icon v-bind="activatorProps" icon="mdi-help-circle-outline" color="info" :size="size" />
    </template>
    {{ text }}
  </v-tooltip>
</template>
