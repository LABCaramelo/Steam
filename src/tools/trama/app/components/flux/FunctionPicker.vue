<script setup>
import { computed, ref } from 'vue'
import * as expressions from '../../../shared/expressions.js'
const props = defineProps({ search: { type: String, default: '' } })
const emit = defineEmits(['select'])
const open = ref({})
const catalog = computed(() => expressions.FUNCTION_CATALOG || [])
const groupOrder = ['Array e objetos', 'Condicionais', 'Texto', 'Data e horário', 'Funções matemáticas', 'Adição de Tempo', 'Definição de Tempo']
const groupFor = name => /^add(?:Seconds|Minutes|Hours|Days|Months|Years)$/i.test(name) ? 'Adição de Tempo'
  : /^set(?:Seconds|Minutes|Hours|Days|Months|Years)$/i.test(name) ? 'Definição de Tempo'
  : /date|now|time/i.test(name) ? 'Data e horário'
  : /number|int|round|sum|soma|media|floor|ceil|^min$|^max$|abs|teto|piso|trunc|valor|desvio|formatarNumero|^random$/i.test(name) ? 'Funções matemáticas'
  : /^(if|ifempty|switch|coalesce)$/i.test(name) ? 'Condicionais'
  : /^(get|map|keys|values|first|last|join|array|contains|slice|merge|pick|omit|flatten|distinct|deduplicate|toCollection|toArray|sort|reverse|remove|add|shuffle)/i.test(name) ? 'Array e objetos'
  : 'Texto'
const groups = computed(() => {
  const map = new Map()
  for (const item of catalog.value) {
    if (props.search && !`${item.name} ${item.label} ${item.signature} ${item.description || ''}`.toLowerCase().includes(props.search.toLowerCase())) continue
    const title = groupFor(item.name)
    if (!map.has(title)) map.set(title, [])
    map.get(title).push(item)
  }
  return [...map].map(([title, items]) => ({ title, items })).sort((a, b) => groupOrder.indexOf(a.title) - groupOrder.indexOf(b.title))
})
function insert(item) { emit('select', `{{${item.name}()}}`) }
const isOpen = title => !!props.search || open.value[title] !== false
function toggle(title) { open.value[title] = !isOpen(title) }
</script>

<template>
  <div class="function-picker">
    <section v-for="group in groups" :key="group.title" class="function-group">
      <button class="function-group__heading" :aria-expanded="isOpen(group.title)" @click="toggle(group.title)"><v-icon :icon="isOpen(group.title) ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="14" /><v-icon icon="mdi-function-variant" size="17" />{{ group.title }}</button>
      <div v-if="isOpen(group.title)" class="function-group__list">
        <button v-for="item in group.items" :key="item.name" class="function-item" :title="`${item.signature || item.name}\n${item.example || ''}`" @click="insert(item)">
          <code>{{ item.name }}</code><span>{{ item.signature }}</span>
          <v-tooltip activator="parent" location="end" max-width="360"><b>{{ item.name }}</b><p>{{ item.description || item.signature }}</p><pre v-if="item.example">{{ item.example }}</pre><small>Clique para inserir. Duplo clique na função inserida para editar.</small></v-tooltip>
        </button>
      </div>
    </section>
    <p v-if="!groups.length" class="empty-functions">Nenhuma função encontrada.</p>
  </div>
</template>

<style scoped>
.function-group{margin-bottom:12px}.function-group__heading{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;min-height:40px;width:100%;text-align:left;padding:8px 4px;color:rgb(var(--cm-fg));border-radius:7px}.function-group__heading:hover{background:rgb(var(--cm-surface-3))}.function-group__heading .v-icon:nth-child(2){color:rgb(var(--cm-accent-ink));margin-right:3px}.function-group__list{padding-left:14px;margin-left:10px;border-left:1px solid rgb(var(--cm-line))}.function-item{display:flex;align-items:center;gap:8px;width:100%;min-height:34px;font-size:12px;line-height:1.6;text-align:left;padding:5px 4px;border-radius:5px}.function-item:hover{background:rgb(var(--cm-surface-3))}.function-item code{font:600 11px/22px var(--trama-font-code,monospace);color:rgb(var(--cm-accent-ink));background:rgb(var(--cm-accent-soft));border:1px solid rgb(var(--cm-accent-ink)/.18);border-radius:5px;padding:0 6px;flex:none}.function-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgb(var(--cm-fg-muted))}.function-item:focus-visible,.function-group__heading:focus-visible{outline:2px solid rgb(var(--cm-focus));outline-offset:2px}.empty-functions{font-size:12px;color:rgb(var(--cm-fg-muted));padding:14px 4px}@media(max-width:600px){.function-group__heading{min-height:44px;font-size:14px}.function-item{min-height:44px;font-size:13px}.function-item code{font-size:12px}}
</style>
