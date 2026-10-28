// Listas usadas nos formulários de faturamento (mesmos valores do original, versão reduzida).

export const EMPTY_ADDRESS = {
  document_type: '', document_number: '', company_name: '', street: '', number: '',
  complement: '', neighborhood: '', city: '', state: '', postal_code: '', country: '',
}

export const DOCUMENT_TYPES = {
  CPF: 'br_cpf',
  CNPJ: 'br_cnpj',
}

export const DOCUMENT_TYPE_ITEMS = [
  { title: 'CPF (Brasil)', value: 'br_cpf' },
  { title: 'CNPJ (Brasil)', value: 'br_cnpj' },
  { title: 'EIN (Estados Unidos)', value: 'us_ein' },
  { title: 'RFC (México)', value: 'mx_rfc' },
  { title: 'CUIT (Argentina)', value: 'ar_cuit' },
  { title: 'NIF (Portugal)', value: 'pt_nif' },
]

export const STATE_ITEMS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
].map((uf) => ({ title: uf, value: uf }))

export const COUNTRY_ITEMS = [
  { title: 'Brasil', value: 'BR' },
  { title: 'Portugal', value: 'PT' },
  { title: 'Estados Unidos', value: 'US' },
  { title: 'Argentina', value: 'AR' },
  { title: 'México', value: 'MX' },
]

// Como no original, o endereço é preenchido pela BrasilAPI a partir do CEP.
export async function lookupCep(cep) {
  const digits = String(cep ?? '').replace(/\D/g, '')
  if (digits.length !== 8) return null
  const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`)
  if (!response.ok) throw new Error('CEP não encontrado')
  return response.json()
}

export function documentLabel(type) {
  return type === DOCUMENT_TYPES.CPF ? 'Nome' : 'Razão Social'
}

// Mesma detecção de bandeira usada no cadastro de cartões do original.
export function cardBrand(number) {
  const digits = String(number).replace(/\D/g, '')
  if (!digits) return 'unknown'
  if (/^(4011|4312|4389|4514|4576|5041|6277|6362|6363|650|6516|6550)/.test(digits)) return 'elo'
  if (/^(606282|3841)/.test(digits)) return 'hipercard'
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^(6011|65|64[4-9])/.test(digits)) return 'discover'
  if (/^3(0[0-5]|[68])/.test(digits)) return 'diners'
  if (/^(2131|1800|35)/.test(digits)) return 'jcb'
  return 'unknown'
}
