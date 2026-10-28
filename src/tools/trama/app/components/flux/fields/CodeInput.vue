<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/xml/xml'
import 'codemirror/mode/css/css'
import 'codemirror/mode/htmlmixed/htmlmixed'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/edit/closebrackets'
const props = defineProps({ modelValue: { default: '' }, language: { type: String, default: 'json' }, rows: { type: Number, default: 15 }, label: String, invalid: Boolean })
const emit = defineEmits(['update:modelValue', 'focus'])
const textarea = ref(null)
let instance
let marks = []
const stringify = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
const modeFor = language => language === 'json' ? { name: 'javascript', json: true } : language === 'xml' ? 'xml' : language === 'html' ? 'htmlmixed' : language === 'text' ? null : 'javascript'
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
  instance = CodeMirror.fromTextArea(textarea.value, { value: stringify(props.modelValue), mode: modeFor(props.language), lineNumbers: true, lineWrapping: true, tabSize: 2, indentUnit: 2, matchBrackets: true, autoCloseBrackets: props.language === 'javascript', viewportMargin: 20, theme: 'caramelo' })
  instance.setValue(stringify(props.modelValue))
  instance.setSize(null, Math.max(140, props.rows * 20 + 24))
  instance.getWrapperElement().setAttribute('role', 'textbox')
  instance.getWrapperElement().setAttribute('aria-label', props.label || 'Editor de código')
  instance.getWrapperElement().setAttribute('aria-multiline', 'true')
  instance.getWrapperElement().setAttribute('aria-invalid', String(!!props.invalid))
  instance.on('change', (_cm, change) => { if (change.origin !== 'setValue') emit('update:modelValue', instance.getValue()); markVariables() })
  instance.on('focus', () => emit('focus'))
  markVariables()
  await nextTick()
  instance.refresh()
})
watch(() => props.modelValue, value => { if (instance && instance.getValue() !== stringify(value)) { const cursor = instance.getCursor(); instance.setValue(stringify(value)); instance.setCursor(cursor); markVariables() } })
watch(() => props.language, language => { instance?.setOption('mode', modeFor(language));instance?.setOption('autoCloseBrackets',language === 'javascript') })
watch(() => props.invalid, value => instance?.getWrapperElement().setAttribute('aria-invalid', String(!!value)))
onBeforeUnmount(() => instance?.toTextArea())
function insert(text) { if (instance) { instance.replaceSelection(text, 'end'); instance.focus() } }
defineExpose({ insert, focus: () => instance?.focus() })
</script>

<template><div class="code-input" :class="{ 'code-input--invalid': invalid }"><textarea ref="textarea" :aria-label="label" :value="stringify(modelValue)" /></div></template>

<style scoped>
.code-input{border:1px solid rgb(var(--cm-line-strong));border-radius:8px;overflow:hidden;background:rgb(var(--cm-surface-2));transition:border-color 160ms,box-shadow 160ms}.code-input--invalid{border-color:rgb(var(--cm-danger))}.code-input:focus-within{border-color:rgb(var(--cm-focus));box-shadow:0 0 0 3px rgb(var(--cm-focus)/.12)}.code-input :deep(.CodeMirror){font:400 12px/20px var(--trama-font-code,ui-monospace,Consolas,monospace);background:rgb(var(--cm-surface-2));color:rgb(var(--cm-fg));padding:9px 0}.code-input :deep(.CodeMirror-gutters){border:0;border-right:1px solid rgb(var(--cm-line));background:rgb(var(--cm-surface-1))}.code-input :deep(.CodeMirror-linenumber){font-size:12px;color:rgb(var(--cm-fg-dim));padding-inline:8px}.code-input :deep(.CodeMirror-cursor){border-left:1px solid rgb(var(--cm-focus))}.code-input :deep(.CodeMirror-selected){background:rgb(var(--cm-focus)/.17)!important}.code-input :deep(.cm-string){color:rgb(var(--cm-success))}.code-input :deep(.cm-property){color:rgb(var(--cm-accent-ink))}.code-input :deep(.cm-keyword){color:rgb(var(--cm-info))}.code-input :deep(.cm-number){color:rgb(var(--cm-info))}.code-input :deep(.cm-comment){color:rgb(var(--cm-fg-dim))}.code-input :deep(.cm-def){color:rgb(var(--cm-fg))}.code-input :deep(.cm-atom){color:rgb(var(--cm-accent-ink))}.code-input :deep(.code-variable-token){font:600 11px/18px var(--trama-font-code,monospace);color:rgb(var(--cm-accent-ink));background:rgb(var(--cm-accent-soft));border:1px solid rgb(var(--cm-accent-ink)/.25);border-radius:4px;padding:1px 5px;cursor:text}.code-input :deep(.CodeMirror-scroll){scrollbar-width:thin}.code-input :deep(.CodeMirror pre.CodeMirror-line){padding:0 12px}@media(max-width:600px){.code-input :deep(.CodeMirror){font-size:14px;line-height:22px}}@media(prefers-reduced-motion:reduce){.code-input{transition:none}}
</style>
