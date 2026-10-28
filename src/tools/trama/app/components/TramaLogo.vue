<script setup>
defineProps({ logoWidth: { type: String, default: 'auto' }, logoClass: { type: String, default: '' }, by3c: { type: Boolean, default: false } })
</script>
<template><div class="trama-logo" :class="logoClass"><img src="/assets/icons/caramelo-mark.svg" alt="" width="30" height="30"/><span>TRAMA<span class="trama-logo-dot">.</span><small>FLUXOS EM AÇÃO</small></span></div></template>
