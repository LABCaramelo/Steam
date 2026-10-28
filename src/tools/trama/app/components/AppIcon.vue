<script setup>
import { computed } from 'vue'
import { getApp } from '@trama/services/apps'

const props = defineProps({
  app: { type: String, required: true },
  size: { type: [Number, String], default: 40 },
  rounded: { type: [Number, String], default: 12 },
  shadow: { type: Boolean, default: false },
})

const info = computed(() => getApp(props.app))
const px = computed(() => `${props.size}px`)
</script>

<template>
  <div
    class="app-icon"
    :class="{ 'app-icon--shadow': shadow }"
    :style="{ width: px, height: px, borderRadius: `${rounded}px`, backgroundColor: info.bg }"
    :title="info.title"
  >
    <v-icon :icon="info.icon" :color="info.fg" :size="Number(size) * 0.55" />
  </div>
</template>

<style scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.app-icon--shadow {
  box-shadow: #32325d40 0 2px 5px -1px, #0000004d 0 1px 3px -1px;
}
</style>
