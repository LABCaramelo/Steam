<script setup>
defineProps({
  tone: { type: String, default: 'cream', validator: value => ['cream', 'accent', 'surface', 'ghost'].includes(value) },
  magnetic: Boolean,
  disabled: Boolean,
  type: { type: String, default: 'button' },
})
</script>

<template>
  <button :type="type" :disabled="disabled" class="caramelo-action" :class="tone === 'cream' ? 'cm-glow-btn' : ['cm-btn', `cm-btn--${tone}`, { 'cm-btn--fill': tone === 'accent', 'cm-magnetic': magnetic }]" :data-cm-magnetic="magnetic ? '' : undefined">
    <span v-if="tone === 'accent'" class="cm-btn__fill" aria-hidden="true" />
    <span class="cm-btn__label"><slot /></span>
  </button>
</template>
