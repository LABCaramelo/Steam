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
const internal = computed(() => !!info.value.middleware || !!info.value.trigger)
const px = computed(() => `${props.size}px`)
</script>

<template>
  <div
    class="app-icon"
    :class="{ 'app-icon--shadow': shadow, 'app-icon--internal': internal, 'app-icon--trigger': info.trigger }"
    :style="{ width: px, height: px, borderRadius: `${rounded}px`, ...(!internal && { backgroundColor: info.bg }) }"
    :title="info.title"
  >
    <v-icon :icon="info.icon" :color="internal ? undefined : info.fg" :size="Number(size) * 0.55" />
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
  box-shadow: var(--trama-shadow-panel);
}
.app-icon--internal { background:rgb(var(--cm-surface-3));color:rgb(var(--cm-fg-2));border:1px solid rgb(var(--cm-line-strong)); }
.app-icon--trigger { background:rgb(var(--cm-accent-soft));color:rgb(var(--cm-accent-ink));border-color:rgb(var(--cm-accent-ink)/.3); }
</style>
