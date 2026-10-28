<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ value: { default: null }, name: { type: [String, Number], default: '' }, path: { type: String, default: '' }, selectable: Boolean, depth: { type: Number, default: 0 }, expanded: { type: Boolean, default: true }, search: { type: String, default: '' } })
const emit = defineEmits(['select'])
const open = ref(props.expanded)
const isContainer = computed(() => props.value !== null && typeof props.value === 'object')
const entries = computed(() => isContainer.value ? Object.entries(props.value) : [])
const collapsedLabel = computed(() => Array.isArray(props.value) ? '[' + entries.value.length + ']' : '{' + entries.value.length + '}')
const brief = computed(() => props.value === null ? 'null' : props.value === undefined ? 'undefined' : typeof props.value === 'string' ? props.value : JSON.stringify(props.value))
const visible = computed(() => !props.search || String(props.name).toLowerCase().includes(props.search.toLowerCase()) || JSON.stringify(props.value)?.toLowerCase().includes(props.search.toLowerCase()))
const childPath = key => /^\d+$/.test(key) ? `${props.path}[${key}]` : /^[a-zA-Z_$][\w$]*$/.test(key) ? `${props.path}.${key}` : `${props.path}[${JSON.stringify(key)}]`
function pick() { if (props.selectable && props.path) emit('select', `{{${props.path}}}`) }
function drag(event) { if (props.path) { event.dataTransfer.setData('text/plain', `{{${props.path}}}`); event.dataTransfer.effectAllowed = 'copy' } }
</script>

<template>
  <div v-if="visible" class="json-tree" :class="{ 'json-tree--root': !name && !path }">
    <template v-if="name !== ''">
      <div class="json-tree__row">
        <button v-if="isContainer" class="json-tree__toggle" :aria-label="`${open ? 'Recolher' : 'Expandir'} ${name}`" @click="open = !open"><v-icon :icon="open ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="14" /></button>
        <span v-else class="json-tree__spacer" />
        <button class="json-tree__key" :class="{ 'json-tree__key--selectable': selectable }" :draggable="selectable" :title="selectable ? `Inserir {{${path}}}` : String(name)" @click="selectable ? pick() : (isContainer && (open = !open))" @dragstart="drag">{{ name }}</button>
        <span v-if="!isContainer" class="json-tree__value" :class="`json-tree__value--${typeof value}`">{{ brief }}</span>
        <span v-else-if="!entries.length" class="json-tree__empty">{{ Array.isArray(value) ? '[]' : '{}' }}</span>
        <span v-else-if="!open" class="json-tree__empty">{{ collapsedLabel }}</span>
      </div>
    </template>
    <div v-if="isContainer && (open || name === '')" class="json-tree__children" :class="{ 'json-tree__children--indent': name !== '' }">
      <JsonTree v-for="[key, child] in entries" :key="key" :name="key" :value="child" :path="childPath(key)" :selectable="selectable" :depth="depth + 1" :expanded="depth < 2" :search="search" @select="emit('select', $event)" />
    </div>
  </div>
</template>

<style scoped>
.json-tree{font:400 12px/1.7 var(--trama-font-code,monospace);min-width:0;color:rgb(var(--cm-fg-2))}.json-tree__row{display:flex;align-items:flex-start;gap:6px;min-height:30px;padding:3px 0;line-height:22px}.json-tree__toggle{display:grid;place-items:center;width:22px;height:24px;flex:none;color:rgb(var(--cm-fg-muted));border-radius:4px}.json-tree__toggle:hover{background:rgb(var(--cm-surface-3));color:rgb(var(--cm-fg))}.json-tree__spacer{width:22px;flex:none}.json-tree__key{font:500 11px/20px var(--trama-font-code,monospace);padding:1px 6px;border-radius:5px;background:rgb(var(--cm-accent-soft));border:1px solid rgb(var(--cm-accent-ink)/.18);color:rgb(var(--cm-accent-ink));white-space:nowrap;cursor:default;max-width:100%;overflow:hidden;text-overflow:ellipsis;min-height:24px}.json-tree__key--selectable{cursor:pointer}.json-tree__key--selectable:hover{border-color:rgb(var(--cm-accent-ink));box-shadow:0 0 0 2px rgb(var(--cm-accent-ink)/.1)}.json-tree__toggle:focus-visible,.json-tree__key:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:2px}.json-tree__value{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;line-height:22px;color:rgb(var(--cm-fg-2))}.json-tree__empty{font-size:12px;color:rgb(var(--cm-fg-dim))}.json-tree__children--indent{padding-left:18px}.json-tree__value--number{font-variant-numeric:tabular-nums;color:rgb(var(--cm-info))}.json-tree__value--boolean{color:rgb(var(--cm-accent-ink))}@media(max-width:600px){.json-tree{font-size:13px}.json-tree__row{min-height:36px}.json-tree__toggle{width:28px;height:30px}.json-tree__spacer{width:28px}.json-tree__key{min-height:30px;line-height:26px;font-size:12px}.json-tree__value{font-size:13px;line-height:30px}}
</style>
