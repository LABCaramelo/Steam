<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
const props = defineProps({ modelValue: { default: '' }, language: { type: String, default: 'json' }, rows: { type: Number, default: 15 }, label: String, invalid: Boolean })
const emit = defineEmits(['update:modelValue', 'focus'])
const textarea = ref(null)
let instance
let marks = []
const stringify = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
function markVariables() {
  marks.forEach(mark => mark.clear()); marks = []
  const text = instance.getValue()
  const re = /\{\{([\s\S]*?)\}\}/g
  let match
  while ((match = re.exec(text))) {
    const badge = document.createElement('span')
    badge.className = 'code-variable-token'
    badge.textContent = match[1].trim()
    badge.title = `${match[0]} — duplo clic para editar`
    const from = instance.posFromIndex(match.index)
    const to = instance.posFromIndex(re.lastIndex)
    const mark = instance.markText(from, to, { replacedWith: badge, clearOnEnter: false, handleMouseEvents: true })
    badge.addEventListener('dblclick', () => { const position = mark.find(); mark.clear(); if (position) instance.setSelection(position.from, position.to); instance.focus() })
    marks.push(mark)
  }
}
onMounted(async () => {
  instance = CodeMirror.fromTextArea(textarea.value, { value: stringify(props.modelValue), mode: props.language === 'json' ? { name: 'javascript', json: true } : 'javascript', lineNumbers: true, lineWrapping: true, tabSize: 2, indentUnit: 2, matchBrackets: true, autoCloseBrackets: true, viewportMargin: 20, theme: 'fiqon' })
  instance.setValue(stringify(props.modelValue))
  instance.setSize(null, Math.max(140, props.rows * 18 + 14))
  instance.getWrapperElement().setAttribute('role', 'textbox')
  instance.getWrapperElement().setAttribute('aria-label', props.label || 'Editor de código')
  instance.on('change', (_cm, change) => { if (change.origin !== 'setValue') emit('update:modelValue', instance.getValue()); markVariables() })
  instance.on('focus', () => emit('focus'))
  markVariables()
  await nextTick()
  instance.refresh()
})
watch(() => props.modelValue, value => { if (instance && instance.getValue() !== stringify(value)) { const cursor = instance.getCursor(); instance.setValue(stringify(value)); instance.setCursor(cursor); markVariables() } })
watch(() => props.language, language => instance?.setOption('mode', language === 'json' ? { name: 'javascript', json: true } : 'javascript'))
onBeforeUnmount(() => instance?.toTextArea())
function insert(text) { if (instance) { instance.replaceSelection(text, 'end'); instance.focus() } }
defineExpose({ insert, focus: () => instance?.focus() })
</script>

<template><div class="code-input" :class="{ 'code-input--invalid': invalid }"><textarea ref="textarea" :aria-label="label" :value="stringify(modelValue)" /></div></template>

<style scoped>
.code-input{border:1px solid #123a26;border-radius:3px;overflow:hidden;background:#202322}.code-input--invalid{border-color:rgb(var(--v-theme-error))}.code-input:focus-within{border-color:rgb(var(--v-theme-primary))}.code-input :deep(.CodeMirror){font-family:Consolas,'Courier New',monospace;font-size:11px;line-height:18px;background:rgb(var(--v-theme-surface));color:rgb(var(--v-theme-on-surface));padding:2px 0}.code-input :deep(.CodeMirror-gutters){border:0;background:transparent}.code-input :deep(.CodeMirror-linenumber){color:rgba(var(--v-theme-on-surface),.85);font-size:10px}.code-input :deep(.CodeMirror-cursor){border-left:1px solid rgb(var(--v-theme-primary))}.code-input :deep(.CodeMirror-selected){background:rgba(var(--v-theme-primary),.14)!important}.code-input :deep(.cm-string){color:#e3e075}.code-input :deep(.cm-property){color:#e2b666}.code-input :deep(.cm-keyword){color:#cb9dff}.code-input :deep(.cm-number){color:#77d5d7}.code-input :deep(.cm-comment){color:#82988d}.code-input :deep(.cm-def){color:#8dd1ee}.code-input :deep(.code-variable-token){font:700 10px/16px 'Inter',sans-serif;color:rgb(var(--v-theme-primary));background:rgba(var(--v-theme-primary),.2);border-radius:2px;padding:1px 4px;cursor:text}.code-input :deep(.CodeMirror-scroll){scrollbar-width:thin}.code-input :deep(.CodeMirror pre.CodeMirror-line){padding:0 7px}
</style>
