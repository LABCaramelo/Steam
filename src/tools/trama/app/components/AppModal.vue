<script setup>
// Modal base usado em todo o app (equivalente ao modal genérico do original).
// Aceita "activator" como o v-dialog e expõe closeModal no slot padrão.
defineProps({
  width: { type: [String, Number], default: undefined },
  maxWidth: { type: [String, Number], default: '480px' },
  minWidth: { type: [String, Number], default: undefined },
  activator: { type: [String, Object], default: undefined },
  preventClose: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])
const model = defineModel({ type: Boolean, default: false })

function closeModal() {
  model.value = false
  emit('close')
}
</script>

<template>
  <v-dialog
    v-model="model"
    :activator="activator"
    :width="width"
    :max-width="width ? undefined : maxWidth"
    :min-width="minWidth"
    :persistent="preventClose"
    @update:model-value="(v) => !v && emit('close')"
  >
    <v-card class="app-modal position-relative" rounded="lg">
      <div class="app-modal-signature" aria-hidden="true"><img class="app-modal-signature-mark" src="/assets/icons/caramelo-mark.svg" alt="" width="24" height="24"/><span>TRAMA / LAB</span></div>
      <v-btn
        v-if="!preventClose"
        class="app-modal-close"
        icon="mdi-close"
        size="small"
        variant="text"
        density="comfortable"
        aria-label="Fechar janela"
        @click="closeModal"
      />
      <div class="app-modal-body"><slot :close-modal="closeModal" /></div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.app-modal{position:relative;isolation:isolate;padding:28px!important;border:1px solid rgb(var(--cm-line-strong));border-radius:var(--trama-radius-xl,20px)!important;background:rgb(var(--cm-surface-1));color:rgb(var(--cm-fg));box-shadow:var(--trama-shadow-float,0 24px 70px #0006);max-height:calc(100dvh - 48px);overflow-y:auto}
.app-modal::before{content:"";position:absolute;inset:0 24px auto;height:2px;background:var(--cm-spectrum-gradient);opacity:.8;pointer-events:none}
.app-modal-signature{display:flex;align-items:center;gap:9px;min-height:24px;margin-bottom:25px;color:rgb(var(--cm-fg-dim));font:600 11px/1.4 var(--trama-font-ui,Inter,sans-serif);letter-spacing:.12em}
.app-modal-signature-mark{display:grid;place-items:center;width:24px;height:24px;border:1px solid rgb(var(--cm-accent-ink)/.3);border-radius:6px;color:rgb(var(--cm-accent-ink));font:900 14px/1 var(--trama-font-display,Montserrat,sans-serif);letter-spacing:-.08em}
.app-modal-close{position:absolute;top:19px;right:19px;z-index:2;min-height:40px;min-width:40px;color:rgb(var(--cm-fg-muted));border:1px solid rgb(var(--cm-line));border-radius:10px}
.app-modal-close:hover{background:rgb(var(--cm-surface-3));color:rgb(var(--cm-fg))}
.app-modal-body{position:relative;min-width:0}
.app-modal-body :deep(h2),.app-modal-body :deep(h3){font-family:var(--trama-font-display,Montserrat,sans-serif);font-weight:800;line-height:1.2;letter-spacing:-.04em}
.app-modal-body :deep(p){font-size:14px;line-height:1.65;color:rgb(var(--cm-fg-muted))}
.app-modal-body :deep(.v-btn){min-height:40px}
@media(max-width:600px){.app-modal{padding:22px!important}.app-modal-close{top:14px;right:14px;min-width:44px;min-height:44px}.app-modal-signature{margin-bottom:26px}.app-modal-body :deep(p){font-size:16px}.app-modal-body :deep(.v-btn){min-height:44px}}
</style>
