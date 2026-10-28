<script setup>
import { dismiss, toasts } from '@trama/composables/useToast'
const tone = color => ({ error:'danger', success:'success', warning:'warning', primary:'accent-ink' }[color] || 'info')
</script>
<template>
  <div class="toast-stack" aria-live="polite" aria-relevant="additions">
    <v-slide-x-reverse-transition group>
      <article v-for="toast in toasts" :key="toast.id" class="toast-item" :style="{ '--toast-tone': 'var(--cm-' + tone(toast.color) + ')' }" :role="toast.color === 'error' ? 'alert' : 'status'">
        <span class="toast-icon"><v-icon :icon="toast.icon" size="22" /></span>
        <div class="toast-copy"><strong v-if="toast.title">{{ toast.title }}</strong><p>{{ toast.text }}</p></div>
        <button class="toast-close" type="button" aria-label="Fechar notificação" @click="dismiss(toast.id)"><v-icon icon="mdi-close" size="18" /></button>
      </article>
    </v-slide-x-reverse-transition>
  </div>
</template>
<style scoped>
.toast-stack{position:fixed;top:20px;right:20px;z-index:3000;width:390px;max-width:calc(100vw - 32px);pointer-events:none;font-family:var(--trama-font-ui,Inter,sans-serif)}
.toast-item{display:flex;align-items:flex-start;gap:12px;pointer-events:auto;padding:18px 14px 18px 18px;margin-bottom:10px;border:1px solid rgb(var(--cm-line-strong));border-left:3px solid rgb(var(--toast-tone));border-radius:var(--trama-radius-lg,14px);background:rgb(var(--cm-surface-2));color:rgb(var(--cm-fg));box-shadow:var(--trama-shadow-float,0 12px 36px #0005)}
.toast-icon{color:rgb(var(--toast-tone));display:grid;place-items:center;min-width:24px;min-height:26px}.toast-copy{flex:1;min-width:0}.toast-copy strong{display:block;font-size:14px;font-weight:700;line-height:1.5;margin-bottom:3px}.toast-copy p{font-size:13px;line-height:1.55;color:rgb(var(--cm-fg-muted));overflow-wrap:anywhere}
.toast-close{display:grid;place-items:center;min-width:32px;min-height:32px;border-radius:8px;color:rgb(var(--cm-fg-muted));margin:-4px -3px 0 0;transition:background-color 160ms,color 160ms,transform 80ms}.toast-close:hover{color:rgb(var(--cm-fg));background:rgb(var(--cm-surface-3))}.toast-close:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:2px}.toast-close:active{transform:scale(.96)}
@media(max-width:600px){.toast-stack{top:12px;right:12px;max-width:calc(100vw - 24px)}.toast-item{padding:14px 10px 14px 14px;gap:10px}.toast-copy p{font-size:14px}.toast-close{min-width:44px;min-height:44px;margin:-6px -5px -6px 0}}
@media(prefers-reduced-motion:reduce){.toast-close{transition:none}}
</style>
