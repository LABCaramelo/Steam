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
.function-group{margin-bottom:5px}.function-group__heading{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;width:100%;text-align:left;padding:7px 0;color:rgb(var(--v-theme-on-surface))}.function-group__heading .v-icon:nth-child(2){color:rgb(var(--v-theme-primary));margin-right:3px}.function-group__list{padding-left:21px}.function-item{display:flex;align-items:center;gap:7px;max-width:100%;font-size:10px;line-height:20px;text-align:left;padding:3px 0}.function-item code{font-family:'Inter',sans-serif;color:rgb(var(--v-theme-primary));background:rgba(var(--v-theme-primary),.16);border-radius:3px;padding:0 5px;font-size:11px}.function-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.6}.empty-functions{font-size:11px;opacity:.5;padding:10px 0}
</style>
