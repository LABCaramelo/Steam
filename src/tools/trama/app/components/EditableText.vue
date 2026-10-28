<script setup>
// Texto que vira campo ao clicar (mesmo comportamento do EditableText original):
// valida ao sair do campo ou com Enter e só emite "changed-title" se o valor mudou.
import { nextTick, ref, useTemplateRef } from 'vue'

const props = defineProps({
  rules: { type: Array, default: () => [] },
  size: { type: String, default: '28px' },
  minWidth: { type: String, default: '0px' },
  maxWidth: { type: String, default: 'unset' },
  iconColor: { type: String, default: undefined },
  isInsideFlux: { type: Boolean, default: false },
})

const emit = defineEmits(['changed-title'])
const input = defineModel('input', { type: String, default: '' })

const editing = ref(false)
const draft = ref(input.value)
const form = useTemplateRef('form')
const field = useTemplateRef('field')

function startEditing() {
  editing.value = true
  draft.value = input.value
  nextTick(() => field.value?.focus())
}

async function finishEditing() {
  if (!editing.value) return
  editing.value = false
  const { valid } = await form.value.validate()
  if (!valid) {
    draft.value = input.value
    return
  }
  if (draft.value === input.value) return
  input.value = draft.value
  emit('changed-title', draft.value)
}
</script>

<template>
  <div class="input-container" :class="{ 'is-editing-mode': editing }">
    <div class="d-flex align-center cursor-pointer editable-text-content" @click="startEditing">
      <span class="mr-2 text-truncate read-only-text" :class="{ 'inside-flux': props.isInsideFlux }">{{ input }}</span>
      <v-icon icon="mdi-pencil" :size="props.size" />
    </div>
    <div class="editable-input-content">
      <v-form ref="form" class="d-flex" @submit.prevent>
        <div class="d-flex w-100 align-center cursor-pointer">
          <div class="w-100 d-flex flex-nowrap">
            <v-text-field
              ref="field"
              v-model="draft"
              hide-details
              density="compact"
              variant="underlined"
              class="text-input-resized"
              :rules="props.rules"
              :readonly="!editing"
              @blur="finishEditing"
              @keydown.enter="finishEditing"
            />
          </div>
          <div class="pl-3">
            <v-icon icon="mdi-check-circle-outline" :color="editing ? 'primary' : props.iconColor" :size="props.size" />
          </div>
        </div>
      </v-form>
    </div>
  </div>
</template>

<style scoped>
.input-container {
  min-width: v-bind('props.minWidth');
  max-width: v-bind('props.maxWidth');
  position: relative;
}

.input-container.is-editing-mode .editable-text-content {
  opacity: 0;
}

.input-container.is-editing-mode .editable-input-content {
  display: block;
}

.editable-input-content {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  display: none;
}

.read-only-text {
  font-size: v-bind('props.size');
  padding-top: 4px;
  padding-bottom: 4px;
  max-width: 30vw;
}

.text-input-resized :deep(.v-field__input) {
  font-size: v-bind('props.size') !important;
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

.inside-flux {
  color: rgb(var(--v-theme-black-white));
}
</style>
