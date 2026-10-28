<template>
  <main class="not-found-page">
    <div class="not-found-graphic" aria-hidden="true"><span class="not-found-number">404</span><span class="not-found-line"></span><v-icon icon="mdi-source-branch-remove" size="34"/></div>
    <p class="not-found-eyebrow">TRAMA / CAMINHO INTERROMPIDO</p>
    <h1>Esse caminho<br/>ainda não existe.</h1>
    <p class="not-found-description">A página pode ter mudado de lugar ou o link está incorreto. Seus fluxos continuam no início.</p>
    <v-btn color="primary" prepend-icon="mdi-arrow-left" :to="{ name: 'home' }">Voltar aos fluxos</v-btn>
  </main>
</template>
<style scoped>
.not-found-page{min-height:calc(100dvh - 85px);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:22px;padding:48px 24px;color:rgb(var(--cm-fg))}.not-found-graphic{position:relative;display:flex;align-items:center;gap:20px;width:min(360px,80vw);margin-bottom:15px;padding:26px 30px;border:1px solid rgb(var(--cm-line));border-radius:18px;background:rgb(var(--cm-surface-1));color:rgb(var(--cm-accent-ink))}.not-found-number{font:900 80px/.9 var(--trama-font-display,Montserrat,sans-serif);letter-spacing:-.08em;color:rgb(var(--cm-fg))}.not-found-line{height:1px;flex:1;background:repeating-linear-gradient(90deg,rgb(var(--cm-accent-ink)) 0 5px,transparent 5px 11px)}.not-found-eyebrow{font-size:11px;font-weight:600;letter-spacing:.13em;color:rgb(var(--cm-accent-ink))}.not-found-page h1{font:900 clamp(34px,5vw,58px)/1.05 var(--trama-font-display,Montserrat,sans-serif);letter-spacing:-.06em}.not-found-description{max-width:440px;font-size:15px;line-height:1.75;color:rgb(var(--cm-fg-muted))}.not-found-page .v-btn{min-height:44px;padding-inline:22px}
@media(max-width:600px){.not-found-page{padding:40px 20px;gap:20px}.not-found-description{font-size:16px}.not-found-number{font-size:68px}}
</style>
