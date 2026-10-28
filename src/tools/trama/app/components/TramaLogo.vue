<script setup>
defineProps({ logoWidth: { type: String, default: 'auto' }, logoClass: { type: String, default: '' }, by3c: { type: Boolean, default: false } })
</script>
<template><div class="trama-logo" :class="logoClass"><span class="trama-logo-symbol"><img src="/assets/icons/caramelo-mark.svg" alt="" width="25" height="25"/></span><span class="trama-logo-word">TRAMA<span class="trama-logo-dot">.</span><small>FLUXOS EM AÇÃO</small></span></div></template>
<style scoped>
.trama-logo{display:flex;gap:11px;align-items:center}.trama-logo-symbol{display:grid;place-items:center;flex-shrink:0;width:42px;height:42px;border:1px solid rgb(var(--cm-accent-ink)/.3);border-radius:12px;background:rgb(var(--cm-accent-soft));color:rgb(var(--cm-accent-ink))}.trama-logo-word{font:900 27px/.95 var(--trama-font-display,Montserrat,sans-serif);letter-spacing:-.065em;color:rgb(var(--cm-fg))}.trama-logo-dot{color:rgb(var(--cm-accent-ink))}.trama-logo-word small{font:600 11px/1.5 var(--trama-font-ui,Inter,sans-serif);letter-spacing:.08em;margin-top:6px;color:rgb(var(--cm-fg-muted))}
.trama-logo-word small{display:block}
</style>
