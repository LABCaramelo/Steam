<script setup>
import { computed } from 'vue'
import { BaseEdge } from '@vue-flow/core'
const props=defineProps({sourceX:Number,sourceY:Number,targetX:Number,targetY:Number,data:Object})
const top=computed(()=>Math.min(props.sourceY,props.targetY)-52)
const path=computed(()=>`M ${props.sourceX} ${props.sourceY} V ${top.value+8} Q ${props.sourceX} ${top.value} ${props.sourceX+8} ${top.value} H ${props.targetX-8} Q ${props.targetX} ${top.value} ${props.targetX} ${top.value+8} V ${props.targetY}`)
</script>
<template><g class="loop-scope" aria-hidden="true"><BaseEdge :path="path" :style="{stroke:'rgb(var(--cm-accent-ink))',strokeWidth:1,strokeDasharray:'3 5',opacity:.65}"/><text :x="(sourceX+targetX)/2" :y="top-9" text-anchor="middle">{{ data?.label || 'For Each' }} · #{{ data?.loopId }}</text></g></template>
<style scoped>.loop-scope{pointer-events:none}.loop-scope text{font:500 11px var(--trama-font-code,monospace);fill:rgb(var(--cm-accent-ink));paint-order:stroke;stroke:rgb(var(--cm-stage));stroke-width:7px;stroke-linejoin:round}</style>
