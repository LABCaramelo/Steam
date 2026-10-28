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
.json-tree{font-size:11px;min-width:0}.json-tree__row{display:flex;align-items:flex-start;gap:5px;min-height:21px;padding:1px 0;line-height:17px}.json-tree__toggle{width:13px;flex:none;line-height:16px;color:rgb(var(--v-theme-on-surface));opacity:.8}.json-tree__spacer{width:13px;flex:none}.json-tree__key{font:inherit;font-size:11px;line-height:15px;padding:0 5px;border-radius:2px;background:rgba(var(--v-theme-primary),.21);border:1px solid rgba(var(--v-theme-primary),.04);color:rgb(var(--v-theme-primary));white-space:nowrap;cursor:default;max-width:100%;overflow:hidden;text-overflow:ellipsis}.json-tree__key--selectable{cursor:pointer}.json-tree__key--selectable:hover{background:rgba(var(--v-theme-primary),.32)}.json-tree__value{font-size:10px;white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;line-height:17px;color:rgb(var(--v-theme-on-surface));opacity:.92}.json-tree__empty{font-size:10px;opacity:.5}.json-tree__children--indent{padding-left:16px}.json-tree__value--number{font-variant-numeric:tabular-nums}.json-tree__value--boolean{color:rgb(var(--v-theme-primary))}
</style>
