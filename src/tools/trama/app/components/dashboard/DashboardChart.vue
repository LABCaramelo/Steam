<script setup>
import { computed, ref } from 'vue'

// Gráfico "Uso geral da integração": barras empilhadas de sucessos/erros por dia e
// linha do tempo médio de execução (eixo da direita). O original usa uma lib de gráficos;
// aqui é SVG puro para não adicionar dependência.
const props = defineProps({
  days: { type: Array, required: true }, // [{ label, successes, errors, avgMs }]
})

const W = 900
const H = 280
const PAD = { top: 16, right: 56, bottom: 36, left: 44 }
const plotW = W - PAD.left - PAD.right
const plotH = H - PAD.top - PAD.bottom

const hovered = ref(null)

const maxHits = computed(() => Math.max(4, ...props.days.map((d) => d.successes + d.errors)))
const maxMs = computed(() => Math.max(100, ...props.days.map((d) => d.avgMs)))
const slot = computed(() => plotW / Math.max(1, props.days.length))
const barW = computed(() => Math.max(6, Math.min(28, slot.value * 0.55)))

const niceTicks = (max) => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))
const hitTicks = computed(() => niceTicks(maxHits.value))
const msTicks = computed(() => niceTicks(maxMs.value))

const y = (value, max) => PAD.top + plotH - (value / max) * plotH
const xCenter = (i) => PAD.left + slot.value * i + slot.value / 2

const bars = computed(() =>
  props.days.map((d, i) => {
    const x = xCenter(i) - barW.value / 2
    const ySuccess = y(d.successes, maxHits.value)
    const yError = y(d.successes + d.errors, maxHits.value)
    return { ...d, i, x, ySuccess, hSuccess: PAD.top + plotH - ySuccess, yError, hError: ySuccess - yError }
  }),
)

const linePoints = computed(() =>
  props.days
    .map((d, i) => (d.successes + d.errors ? `${xCenter(i)},${y(d.avgMs, maxMs.value)}` : null))
    .filter(Boolean)
    .join(' '),
)

const labelEvery = computed(() => Math.ceil(props.days.length / 10))
</script>

<template>
  <div class="dashboard-chart">
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-100" role="img" aria-label="Execuções por dia e tempo médio de execução">
      <g class="grid">
        <line v-for="t in hitTicks" :key="`g${t}`" :x1="PAD.left" :x2="W - PAD.right" :y1="y(t, maxHits)" :y2="y(t, maxHits)" />
      </g>
      <g class="axis-label">
        <text v-for="t in hitTicks" :key="`l${t}`" :x="PAD.left - 8" :y="y(t, maxHits) + 4" text-anchor="end">{{ t }}</text>
        <text v-for="t in msTicks" :key="`r${t}`" :x="W - PAD.right + 8" :y="y(t, maxMs) + 4">{{ t }}ms</text>
        <template v-for="bar in bars" :key="`x${bar.i}`">
          <text v-if="bar.i % labelEvery === 0" :x="xCenter(bar.i)" :y="H - 12" text-anchor="middle">{{ bar.label }}</text>
        </template>
      </g>

      <g v-for="bar in bars" :key="bar.i" @mouseenter="hovered = bar.i" @mouseleave="hovered = null">
        <rect :x="xCenter(bar.i) - slot / 2" :y="PAD.top" :width="slot" :height="plotH" class="hover-zone" :class="{ active: hovered === bar.i }" />
        <rect :x="bar.x" :y="bar.ySuccess" :width="barW" :height="bar.hSuccess" rx="3" class="bar-success" />
        <rect v-if="bar.errors" :x="bar.x" :y="bar.yError" :width="barW" :height="bar.hError" rx="3" class="bar-error" />
      </g>

      <polyline :points="linePoints" class="avg-line" />
      <template v-for="bar in bars" :key="`p${bar.i}`">
        <circle v-if="bar.successes + bar.errors" :cx="xCenter(bar.i)" :cy="y(bar.avgMs, maxMs)" r="3.5" class="avg-point" />
      </template>
    </svg>

    <div v-if="hovered !== null" class="chart-tooltip text-small">
      <b>{{ days[hovered].label }}</b>
      <div><span class="dot dot-success" /> Sucessos: {{ days[hovered].successes }}</div>
      <div><span class="dot dot-error" /> Erros: {{ days[hovered].errors }}</div>
      <div><span class="dot dot-avg" /> Tempo médio: {{ days[hovered].avgMs }} ms</div>
    </div>

    <div class="d-flex justify-center ga-6 text-small mt-1">
      <span><span class="dot dot-success" /> Sucessos</span>
      <span><span class="dot dot-error" /> Erros</span>
      <span><span class="dot dot-avg" /> Tempo médio</span>
    </div>
  </div>
</template>

<style scoped>
.dashboard-chart {
  position: relative;
}

.grid line {
  stroke: rgb(var(--v-theme-card-outline));
  stroke-width: 1;
}

.axis-label text {
  fill: rgb(var(--v-theme-muted));
  font-size: 11px;
}

.hover-zone {
  fill: transparent;
}

.hover-zone.active {
  fill: color-mix(in srgb, rgb(var(--v-theme-primary)), transparent 92%);
}

.bar-success {
  fill: rgb(var(--v-theme-primary));
}

.bar-error {
  fill: rgb(var(--v-theme-error));
}

.avg-line {
  fill: none;
  stroke: rgb(var(--v-theme-info));
  stroke-width: 2;
}

.avg-point {
  fill: rgb(var(--v-theme-info));
}

.chart-tooltip {
  position: absolute;
  top: 8px;
  left: 56px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-card-outline));
  pointer-events: none;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 4px;
}

.dot-success {
  background: rgb(var(--v-theme-primary));
}

.dot-error {
  background: rgb(var(--v-theme-error));
}

.dot-avg {
  background: rgb(var(--v-theme-info));
}
</style>
