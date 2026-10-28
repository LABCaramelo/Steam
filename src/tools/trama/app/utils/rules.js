// Regras de validação equivalentes às do app original (mesmas mensagens).

const EMAIL_RE =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

export function required(v) {
  const empty = v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)
  return empty ? 'Valor obrigatório' : true
}

export function lengthBetween(min = -Infinity, max = Infinity) {
  return (v) => {
    v = v?.trim() || ''
    if (!v) return true
    if (v.length < min) return 'Valor muito curto'
    if (v.length > max) return 'Valor muito longo'
    return true
  }
}

export function email(v) {
  if (!v) return true
  return EMAIL_RE.test(String(v).toLowerCase()) ? true : 'Email inválido'
}

export function strongPassword(v) {
  if (!v) return 'A senha é obrigatória'
  if (v.length < 12) return 'A senha precisa ter no mínimo 12 caracteres'
  if (v.length > 50) return 'A senha pode ter no máximo 50 caracteres'
  if (!/[A-Z]/.test(v)) return 'A senha precisa conter no mínimo uma letra maiúscula'
  if (!/[a-z]/.test(v)) return 'A senha precisa conter no mínimo uma letra minúscula'
  if (!/[0-9]/.test(v)) return 'A senha precisa conter no mínimo um número'
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v)) return 'A senha precisa conter no mínimo um caractere especial'
  return true
}
