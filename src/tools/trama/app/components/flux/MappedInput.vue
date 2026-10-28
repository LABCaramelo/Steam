<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({ modelValue: { default: '' }, multiline: Boolean, rows: { type: Number, default: 1 }, placeholder: String, label: String, disabled: Boolean, invalid: Boolean })
const emit = defineEmits(['update:modelValue', 'focus', 'blur'])
const editor = ref(null)
let lastRaw = ''
let selection = null
const stringify = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)

function textOf(node) {
  if (node.nodeType === 3) return node.textContent
  if (node.nodeType !== 1 && node.nodeType !== 11) return ''
  if (node.dataset?.variable !== undefined) return `{{${node.dataset.variable}}}`
  if (node.tagName === 'BR') return '\n'
  return [...node.childNodes].map(textOf).join('') + (['DIV', 'P'].includes(node.tagName) && node !== editor.value ? '\n' : '')
}
function rawValue() { return textOf(editor.value).replace(/\n$/, props.multiline ? '\n' : '') }
function createToken(expression) {
  const token = document.createElement('span')
  token.className = 'mapping-token'
  token.contentEditable = 'false'
  token.dataset.variable = expression
  token.title = `{{${expression}}}`
  token.addEventListener('dblclick', () => {
    const text = document.createTextNode(`{{${expression}}}`)
    token.replaceWith(text)
    const range = document.createRange()
    range.selectNodeContents(text)
    const current = window.getSelection()
    current.removeAllRanges()
    current.addRange(range)
    editor.value.focus()
    commit()
  })
  const label = document.createElement('span')
  label.textContent = expression.trim()
  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'mapping-token-remove'
  remove.setAttribute('aria-label', `Remover ${expression}`)
  remove.textContent = '×'
  remove.addEventListener('click', e => { e.stopPropagation(); token.remove(); commit(); editor.value.focus() })
  token.append(label, remove)
  return token
}
function fragmentFor(value) {
  const fragment = document.createDocumentFragment()
  const regex = /\{\{([\s\S]*?)\}\}/g
  let match, cursor = 0
  while ((match = regex.exec(value))) {
    fragment.append(document.createTextNode(value.slice(cursor, match.index)))
    fragment.append(createToken(match[1]))
    cursor = regex.lastIndex
  }
  fragment.append(document.createTextNode(value.slice(cursor)))
  return fragment
}
function render(value) {
  if (!editor.value) return
  lastRaw = stringify(value)
  editor.value.replaceChildren(fragmentFor(lastRaw))
}
function commit() {
  lastRaw = rawValue()
  emit('update:modelValue', lastRaw)
  rememberSelection()
}
function rememberSelection() {
  const current = window.getSelection()
  if (current?.rangeCount && editor.value?.contains(current.anchorNode)) selection = current.getRangeAt(0).cloneRange()
}
function focus() { editor.value?.focus(); emit('focus') }
function insert(value) {
  if (!editor.value || props.disabled) return
  editor.value.focus()
  const current = window.getSelection()
  const range = selection && editor.value.contains(selection.startContainer) ? selection : document.createRange()
  if (!selection || !editor.value.contains(range.startContainer)) { range.selectNodeContents(editor.value); range.collapse(false) }
  range.deleteContents()
  const fragment = fragmentFor(String(value))
  const last = fragment.lastChild
  range.insertNode(fragment)
  if (last) { range.setStartAfter(last); range.collapse(true); current.removeAllRanges(); current.addRange(range) }
  commit()
}
function paste(event) { event.preventDefault(); rememberSelection(); insert(event.clipboardData.getData('text/plain')) }
function drop(event) { event.preventDefault(); insert(event.dataTransfer.getData('text/plain')) }
function keydown(event) {
  if (event.key === 'Enter' && !props.multiline) event.preventDefault()
  if (event.key === 'Enter' && props.multiline) { event.preventDefault(); rememberSelection(); insert('\n') }
}
watch(() => props.modelValue, value => { if (stringify(value) !== lastRaw) nextTick(() => render(value)) })
onMounted(() => render(props.modelValue))
defineExpose({ insert, focus })
</script>

<template>
  <div class="mapped-field" :class="{ 'mapped-field--invalid': invalid, 'mapped-field--disabled': disabled, 'mapped-field--multiline': multiline }">
    <div ref="editor" class="mapped-editor" :contenteditable="!disabled" role="textbox" :aria-label="label" :aria-multiline="multiline" :aria-invalid="invalid" :data-placeholder="placeholder" spellcheck="false" :style="{ minHeight: `${Math.max(1, rows) * 19 + 10}px` }" @input="commit" @focus="emit('focus')" @blur="rememberSelection(); emit('blur')" @keyup="rememberSelection" @mouseup="rememberSelection" @keydown="keydown" @paste="paste" @dragover.prevent @drop="drop" />
  </div>
</template>

<style scoped>
.mapped-field{border:1px solid rgba(var(--v-theme-on-surface),.43);border-radius:4px;min-height:30px;background:rgb(var(--v-theme-surface));transition:border-color .12s}
.mapped-field:focus-within{border-color:rgb(var(--v-theme-primary));box-shadow:0 0 0 1px rgba(var(--v-theme-primary),.12)}
.mapped-field--invalid{border-color:rgb(var(--v-theme-error))}.mapped-field--disabled{opacity:.55;pointer-events:none}
.mapped-editor{outline:none;padding:5px 7px;font-size:12px;line-height:19px;min-width:0;overflow-wrap:anywhere;white-space:pre-wrap;max-height:380px;overflow-y:auto}
.mapped-editor:empty:before{content:attr(data-placeholder);color:rgba(var(--v-theme-on-surface),.36);pointer-events:none}
.mapped-editor :deep(.mapping-token){display:inline-flex;vertical-align:baseline;align-items:center;background:rgba(var(--v-theme-primary),.17);color:rgb(var(--v-theme-primary));border:1px solid rgba(var(--v-theme-primary),.08);border-radius:3px;padding:0 4px;font-weight:700;line-height:17px;white-space:nowrap;max-width:100%;margin:0 2px 0 0;font-size:11px}
.mapped-editor :deep(.mapping-token-remove){color:inherit;font-size:13px;line-height:15px;margin-left:4px;background:none;border:0;cursor:pointer;padding:0 0 0 1px}
</style>
