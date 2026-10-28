import { reactive } from 'vue'

// Equivalente às funções de toast do original (erro, sucesso e informação).
export const toasts = reactive([])
let seq = 0

function push({ title = '', text = '', color = 'info', icon = 'mdi-information-outline', timeout = 4000 }) {
  const id = ++seq
  toasts.push({ id, title, text, color, icon, timeout, show: true })
  setTimeout(() => dismiss(id), timeout + 400)
}

export function dismiss(id) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

export const toastError = ({ title = 'Erro', text }) => push({ title, text, color: 'error', icon: 'mdi-alert-circle-outline' })
export const toastSuccess = ({ title = 'Sucesso', text, icon = 'mdi-check-circle-outline' }) =>
  push({ title, text, color: 'success', icon })
export const toastInfo = ({ title = '', text, color = 'info', icon = 'mdi-information-outline' }) => push({ title, text, color, icon })
