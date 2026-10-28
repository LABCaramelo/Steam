// Shared by the editor and the server. Expressions are parsed, never eval'd.
const BLOCKED = new Set(['__proto__', 'prototype', 'constructor'])
const MAX_SOURCE = 100000
const own = (object, key) => object != null && Object.prototype.hasOwnProperty.call(Object(object), key)

export class ExpressionError extends Error {
  constructor(message, position) {
    super(position == null ? message : `${message} (posição ${position + 1})`)
    this.name = 'ExpressionError'
    this.code = 'EXPRESSION_ERROR'
  }
}

function property(object, key) {
  const name = String(key)
  if (BLOCKED.has(name)) throw new ExpressionError(`Propriedade não permitida: ${name}`)
  if (object == null) return undefined
  if (name === 'length' && (Array.isArray(object) || typeof object === 'string')) return object.length
  if (own(object, name)) return object[name]
  // The source documentation uses both BODY/body and RESULT/result.
  if (['BODY', 'HEADERS', 'QUERY', 'RESULT', 'RESPONSE', 'ITERABLE', 'CODE'].includes(name) && own(object, name.toLowerCase())) return object[name.toLowerCase()]
  return undefined
}

export function getPath(object, path) {
  if (Array.isArray(path)) return path.reduce(property, object)
  const parts = String(path ?? '').replace(/\[(?:"([^"]+)"|'([^']+)'|(\d+))\]/g, (_, a, b, c) => `.${a ?? b ?? c}`).split('.').filter(Boolean)
  return parts.reduce(property, object)
}

const list = (value) => value == null ? [] : Array.isArray(value) ? value : Object.values(Object(value))
const number = (value) => {
  if (value === '' || value == null) return 0
  const result = Number(typeof value === 'string' ? value.replace(',', '.') : value)
  if (!Number.isFinite(result)) throw new ExpressionError('Número inválido')
  return result
}
const dateString = (value, format = 'yyyy-MM-dd', timezone = 'UTC') => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new ExpressionError('Data inválida')
  const pieces = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((piece) => [piece.type, piece.value]))
  return String(format).replace(/yyyy|YYYY|MM|dd|DD|HH|mm|ss/g, (token) => ({ yyyy: pieces.year, YYYY: pieces.year, MM: pieces.month, dd: pieces.day, DD: pieces.day, HH: pieces.hour, mm: pieces.minute, ss: pieces.second })[token])
}
const safeEntries = (value) => Object.entries(value ?? {}).filter(([key]) => !BLOCKED.has(key))
const keyList = (values) => values.flatMap(value => Array.isArray(value) ? value : [value]).map(String)
const unique = (values) => { const seen = new Set(); return list(values).filter(value => { const key = JSON.stringify(value); if (seen.has(key)) return false; seen.add(key); return true }) }
const mean = (values) => { const items = list(values).map(number); if (!items.length) throw new ExpressionError('A coleção não pode ser vazia'); return items.reduce((sum, value) => sum + value, 0) / items.length }
const deviation = (values, sample) => { const items = list(values).map(number), average = mean(items), divisor = items.length - (sample ? 1 : 0); if (divisor < 1) throw new ExpressionError('Coleção insuficiente para o desvio padrão'); return Math.sqrt(items.reduce((sum, value) => sum + (value - average) ** 2, 0) / divisor) }
const changeTime = (value, amount, part, set = false) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new ExpressionError('Data inválida')
  const methods = { Seconds: ['getUTCSeconds', 'setUTCSeconds'], Minutes: ['getUTCMinutes', 'setUTCMinutes'], Hours: ['getUTCHours', 'setUTCHours'], Days: ['getUTCDate', 'setUTCDate'], Months: ['getUTCMonth', 'setUTCMonth'], Years: ['getUTCFullYear', 'setUTCFullYear'] }
  const [getter, setter] = methods[part]
  // setMonths uses calendar month numbers 1..12; addMonths uses a delta.
  const numeric = number(amount) - (set && part === 'Months' ? 1 : 0)
  date[setter](set ? numeric : date[getter]() + numeric)
  return date.toISOString()
}
const timeFunctions = Object.fromEntries(['Seconds', 'Minutes', 'Hours', 'Days', 'Months', 'Years'].flatMap(part => [[`add${part}`, (value, amount) => changeTime(value, amount, part)], [`set${part}`, (value, amount) => changeTime(value, amount, part, true)]]))

export const FUNCTIONS = Object.freeze({
  if: (condition, yes, no) => condition ? yes : no,
  ifempty: (value, fallback) => value == null || value === '' || (Array.isArray(value) && !value.length) ? fallback : value,
  concat: (...values) => values.map((value) => value == null ? '' : String(value)).join(''),
  length: (value) => value == null ? 0 : Array.isArray(value) ? value.length : typeof value === 'object' ? Object.keys(value).length : String(value).length,
  upper: (value) => String(value ?? '').toUpperCase(),
  lower: (value) => String(value ?? '').toLowerCase(),
  trim: (value) => String(value ?? '').trim(),
  replace: (value, search, replacement) => String(value ?? '').split(String(search)).join(String(replacement ?? '')),
  split: (value, separator = ',') => String(value ?? '').split(String(separator)),
  join: (values, separator = ',') => list(values).join(String(separator)),
  parseNumber: number,
  round: (value, decimals = 0) => { const scale = 10 ** Math.min(12, Math.max(-12, number(decimals))); return Math.round((number(value) + Number.EPSILON) * scale) / scale },
  sum: (...values) => values.flat().reduce((total, value) => total + number(value), 0),
  now: () => new Date().toISOString(),
  formatDate: dateString,
  parseJSON: (value) => JSON.parse(String(value)),
  toJSON: (value) => JSON.stringify(value),
  get: (value, path, fallback) => getPath(value, path) ?? fallback,
  map: (values, path) => list(values).map((value) => getPath(value, path)),
  first: (values) => list(values)[0],
  last: (values) => list(values).at(-1),
  keys: (value) => Object.keys(value ?? {}),
  values: list,
  contains: (value, item) => Array.isArray(value) ? value.includes(item) : String(value ?? '').includes(String(item)),
  abs: (value) => Math.abs(number(value)),
  min: (...values) => Math.min(...values.flat().map(number)),
  max: (...values) => Math.max(...values.flat().map(number)),
  encodeURL: (value) => encodeURIComponent(String(value ?? '')),
  decodeURL: (value) => decodeURIComponent(String(value ?? '')),
  toNumber: number,
  toString: (value) => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value),
  ifEmpty: (value, fallback) => FUNCTIONS.ifempty(value, fallback),
  switch: (value, ...cases) => { for (let i = 0; i + 1 < cases.length; i += 2) if (value === cases[i]) return cases[i + 1]; return cases.length % 2 ? cases.at(-1) : undefined },
  arrayLength: (value) => list(value).length,
  omit: (value, ...keys) => { const excluded = new Set(keyList(keys)); return Object.fromEntries(safeEntries(value).filter(([key]) => !excluded.has(key))) },
  pick: (value, ...keys) => { const included = new Set(keyList(keys)); return Object.fromEntries(safeEntries(value).filter(([key]) => included.has(key))) },
  slice: (value, start = 0, end) => (typeof value === 'string' ? value : list(value)).slice(number(start), end === undefined ? undefined : number(end)),
  merge: (...values) => Object.fromEntries(values.flatMap(safeEntries)),
  add: (values, ...items) => [...list(values), ...items],
  remove: (values, item) => list(values).filter(value => JSON.stringify(value) !== JSON.stringify(item)),
  shuffle: (values) => { const result = [...list(values)]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]] }; return result },
  sort: (values, path, direction = 'asc') => [...list(values)].sort((a, b) => { const left = path ? getPath(a, path) : a, right = path ? getPath(b, path) : b; return (left > right ? 1 : left < right ? -1 : 0) * (direction === 'desc' ? -1 : 1) }),
  reverse: (values) => [...list(values)].reverse(),
  flatten: (values, depth = 1) => list(values).flat(Math.min(100, Math.max(0, number(depth)))),
  distinct: unique,
  deduplicate: unique,
  toArray: list,
  toCollection: (values, keyField, valueField) => Object.fromEntries(list(values).map(value => [String(getPath(value, keyField)), valueField == null ? value : getPath(value, valueField)]).filter(([key]) => !BLOCKED.has(key))),
  urlEncode: (value) => encodeURIComponent(String(value ?? '')),
  urlDecode: (value) => decodeURIComponent(String(value ?? '')),
  base64: (value) => typeof Buffer !== 'undefined' ? Buffer.from(String(value ?? ''), 'utf8').toString('base64') : btoa(Array.from(new TextEncoder().encode(String(value ?? '')), byte => String.fromCharCode(byte)).join('')),
  capitalize: (value) => { const text = String(value ?? ''); return text.charAt(0).toUpperCase() + text.slice(1) },
  startcase: (value) => String(value ?? '').replace(/[_-]+/g, ' ').replace(/\b\p{L}/gu, letter => letter.toUpperCase()),
  ascii: (value) => String(value ?? '').normalize('NFKD').replace(/[^\x00-\x7f]/g, ''),
  replaceEmojiCharacters: (value, replacement = '') => String(value ?? '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, String(replacement)),
  substring: (value, start, end) => String(value ?? '').substring(number(start), end === undefined ? undefined : number(end)),
  indexOf: (value, search, start = 0) => (Array.isArray(value) ? value : String(value ?? '')).indexOf(search, number(start)),
  escapeHTML: (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
  stripHTML: (value) => String(value ?? '').replace(/<[^>]*>/g, ''),
  parseInt: (value, radix = 10) => { const parsed = parseInt(String(value), number(radix)); if (!Number.isFinite(parsed)) throw new ExpressionError('Inteiro inválido'); return parsed },
  media: mean,
  mediana: (values) => { const sorted = list(values).map(number).sort((a, b) => a - b); if (!sorted.length) throw new ExpressionError('A coleção não pode ser vazia'); const center = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[center] : (sorted[center - 1] + sorted[center]) / 2 },
  teto: (value) => Math.ceil(number(value)),
  piso: (value) => Math.floor(number(value)),
  trunc: (value) => Math.trunc(number(value)),
  valorMaximo: (...values) => FUNCTIONS.max(...values),
  valorMinimo: (...values) => FUNCTIONS.min(...values),
  valorAbsoluto: (value) => Math.abs(number(value)),
  valorArredondado: (value, decimals = 0) => FUNCTIONS.round(value, decimals),
  soma: (...values) => FUNCTIONS.sum(...values),
  desvioPadraoAmostral: (values) => deviation(values, true),
  desvioPadraoPopulacional: (values) => deviation(values, false),
  formatarNumero: (value, decimals = 2, locale = 'pt-BR') => new Intl.NumberFormat(locale, { minimumFractionDigits: Math.max(0, Math.min(20, number(decimals))), maximumFractionDigits: Math.max(0, Math.min(20, number(decimals))) }).format(number(value)),
  random: (minimum = 0, maximum = 1) => number(minimum) + Math.random() * (number(maximum) - number(minimum)),
  ...timeFunctions,
})

const signatures = {
  if: ['Se', 'if(condição, verdadeiro, falso)', 'if($IN.BODY.active, "Sim", "Não")'],
  ifempty: ['Se vazio', 'ifempty(valor, alternativa)', 'ifempty($IN.BODY.name, "Visitante")'],
  concat: ['Concatenar', 'concat(texto, texto, ...)', 'concat("Olá, ", $IN.BODY.name)'],
  length: ['Comprimento', 'length(valor)', 'length($IN.BODY.items)'],
  upper: ['Maiúsculas', 'upper(texto)', 'upper($IN.BODY.name)'],
  lower: ['Minúsculas', 'lower(texto)', 'lower($IN.BODY.email)'],
  trim: ['Remover espaços', 'trim(texto)', 'trim($IN.BODY.name)'],
  replace: ['Substituir', 'replace(texto, busca, novo)', 'replace($IN.BODY.phone, " ", "")'],
  split: ['Dividir texto', 'split(texto, separador)', 'split($IN.BODY.tags, ",")'],
  join: ['Unir textos', 'join(array, separador)', 'join($IN.BODY.tags, ", ")'],
  parseNumber: ['Converter número', 'parseNumber(valor)', 'parseNumber($IN.BODY.total)'],
  round: ['Arredondar', 'round(número, casas)', 'round($IN.BODY.total, 2)'],
  sum: ['Somar', 'sum(array)', 'sum($IN.BODY.values)'],
  now: ['Agora', 'now()', 'now()'],
  formatDate: ['Formatar data', 'formatDate(data, formato, fuso)', 'formatDate(now(), "dd/MM/yyyy", "America/Sao_Paulo")'],
  parseJSON: ['Ler JSON', 'parseJSON(texto)', 'parseJSON($IN.BODY.text)'],
  toJSON: ['Criar JSON', 'toJSON(valor)', 'toJSON($IN.BODY)'],
  get: ['Obter campo', 'get(objeto, caminho, alternativa)', 'get($IN.BODY, "customer.name", "Visitante")'],
  map: ['Extrair campo', 'map(array, caminho)', 'map($IN.BODY.items, "price")'],
  first: ['Primeiro item', 'first(array)', 'first($IN.BODY.items)'],
  last: ['Último item', 'last(array)', 'last($IN.BODY.items)'],
}
const moreSignatures = {
  ifEmpty: ['Se vazio', 'ifEmpty(valor, alternativa)', 'ifEmpty($IN.BODY.name, "Visitante")'],
  switch: ['Escolher', 'switch(valor, caso, retorno, ..., padrão)', 'switch($IN.BODY.status, "new", "Novo", "Outro")'],
  arrayLength: ['Tamanho do array', 'arrayLength(array)', 'arrayLength($IN.BODY.items)'],
  omit: ['Remover campos', 'omit(objeto, campo, ...)', 'omit($IN.BODY, "password")'],
  pick: ['Selecionar campos', 'pick(objeto, campo, ...)', 'pick($IN.BODY, "name", "email")'],
  slice: ['Fatia', 'slice(array ou texto, início, fim)', 'slice($IN.BODY.items, 0, 3)'],
  merge: ['Unir objetos', 'merge(objeto, objeto, ...)', 'merge($IN.BODY, {active: true})'],
  add: ['Adicionar', 'add(array, item, ...)', 'add($IN.BODY.items, "novo")'],
  remove: ['Remover item', 'remove(array, item)', 'remove($IN.BODY.items, "antigo")'],
  shuffle: ['Embaralhar', 'shuffle(array)', 'shuffle($IN.BODY.items)'],
  sort: ['Ordenar', 'sort(array, campo, direção)', 'sort($IN.BODY.items, "price", "asc")'],
  reverse: ['Inverter', 'reverse(array)', 'reverse($IN.BODY.items)'],
  flatten: ['Achatar', 'flatten(array, profundidade)', 'flatten($IN.BODY.items, 1)'],
  distinct: ['Itens únicos', 'distinct(array)', 'distinct($IN.BODY.items)'],
  deduplicate: ['Remover duplicatas', 'deduplicate(array)', 'deduplicate($IN.BODY.items)'],
  toArray: ['Converter em array', 'toArray(objeto)', 'toArray($IN.BODY.items)'],
  toCollection: ['Criar coleção', 'toCollection(array, campo-chave, campo-valor)', 'toCollection($IN.BODY.items, "id", "name")'],
  urlEncode: ['Codificar URL', 'urlEncode(texto)', 'urlEncode($IN.BODY.name)'],
  urlDecode: ['Decodificar URL', 'urlDecode(texto)', 'urlDecode($IN.BODY.query)'],
  base64: ['Codificar Base64', 'base64(texto)', 'base64($IN.BODY.message)'],
  capitalize: ['Inicial maiúscula', 'capitalize(texto)', 'capitalize($IN.BODY.name)'],
  startcase: ['Iniciais maiúsculas', 'startcase(texto)', 'startcase($IN.BODY.name)'],
  ascii: ['Texto ASCII', 'ascii(texto)', 'ascii($IN.BODY.name)'],
  replaceEmojiCharacters: ['Substituir emojis', 'replaceEmojiCharacters(texto, substituto)', 'replaceEmojiCharacters($IN.BODY.message, "")'],
  substring: ['Trecho de texto', 'substring(texto, início, fim)', 'substring($IN.BODY.name, 0, 5)'],
  indexOf: ['Buscar posição', 'indexOf(texto ou array, item, início)', 'indexOf($IN.BODY.name, "@")'],
  escapeHTML: ['Escapar HTML', 'escapeHTML(texto)', 'escapeHTML($IN.BODY.message)'],
  stripHTML: ['Remover HTML', 'stripHTML(texto)', 'stripHTML($IN.BODY.message)'],
  parseInt: ['Converter inteiro', 'parseInt(texto, base)', 'parseInt($IN.BODY.quantity, 10)'],
  media: ['Média', 'media(array)', 'media($IN.BODY.values)'],
  mediana: ['Mediana', 'mediana(array)', 'mediana($IN.BODY.values)'],
  teto: ['Teto', 'teto(número)', 'teto(1.2)'],
  piso: ['Piso', 'piso(número)', 'piso(1.8)'],
  trunc: ['Truncar', 'trunc(número)', 'trunc(1.8)'],
  valorMaximo: ['Máximo', 'valorMaximo(array)', 'valorMaximo($IN.BODY.values)'],
  valorMinimo: ['Mínimo', 'valorMinimo(array)', 'valorMinimo($IN.BODY.values)'],
  valorAbsoluto: ['Valor absoluto', 'valorAbsoluto(número)', 'valorAbsoluto(-10)'],
  valorArredondado: ['Arredondar', 'valorArredondado(número, casas)', 'valorArredondado(1.234, 2)'],
  soma: ['Somar', 'soma(array)', 'soma($IN.BODY.values)'],
  desvioPadraoAmostral: ['Desvio amostral', 'desvioPadraoAmostral(array)', 'desvioPadraoAmostral($IN.BODY.values)'],
  desvioPadraoPopulacional: ['Desvio populacional', 'desvioPadraoPopulacional(array)', 'desvioPadraoPopulacional($IN.BODY.values)'],
  formatarNumero: ['Formatar número', 'formatarNumero(número, casas, locale)', 'formatarNumero($IN.BODY.total, 2, "pt-BR")'],
  random: ['Número aleatório', 'random(mínimo, máximo)', 'random(0, 100)'],
  ...Object.fromEntries(Object.keys(timeFunctions).map(name => [name, [name, name + '(data, valor)', name + '(now(), 1)']])),
}
export const FUNCTION_CATALOG = Object.freeze(Object.entries({ ...signatures, ...moreSignatures }).map(([name, [label, signature, example]]) => Object.freeze({ name, label, signature, example })))

function tokenize(source) {
  if (source.length > MAX_SOURCE) throw new ExpressionError('Expressão muito longa')
  const tokens = []
  let i = 0
  while (i < source.length) {
    if (/\s/.test(source[i])) { i++; continue }
    const start = i
    const char = source[i]
    if (char === '"' || char === "'") {
      const quote = char
      let value = ''
      i++
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') {
          i++
          const escaped = source[i++]
          if (escaped === 'u') { const hex = source.slice(i, i + 4); if (!/^[a-f\d]{4}$/i.test(hex)) throw new ExpressionError('Escape Unicode inválido', i); value += String.fromCharCode(parseInt(hex, 16)); i += 4 }
          else value += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' })[escaped] ?? escaped
        } else value += source[i++]
      }
      if (source[i] !== quote) throw new ExpressionError('Texto sem fechamento', start)
      i++
      tokens.push({ type: 'literal', value, start }); continue
    }
    const numeric = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i))
    if (numeric) { i += numeric[0].length; tokens.push({ type: 'literal', value: Number(numeric[0]), start }); continue }
    const identifier = /^(?:\$[\p{L}\d_][\p{L}\d_-]*|[\p{L}_][\p{L}\d_]*)/u.exec(source.slice(i))
    if (identifier) { i += identifier[0].length; tokens.push({ type: 'identifier', value: identifier[0], start }); continue }
    const operator = /^(===|!==|>=|<=|==|!=|&&|\|\||\?\?|\*\*|[()\[\]{},;:.?+\-*/%><!])/.exec(source.slice(i))
    if (!operator) throw new ExpressionError(`Símbolo inválido: ${char}`, i)
    i += operator[0].length
    tokens.push({ type: 'operator', value: operator[0], start })
    if (tokens.length > 20000) throw new ExpressionError('Expressão muito complexa')
  }
  tokens.push({ type: 'end', value: '', start: i })
  return tokens
}

const PRECEDENCE = { '??': 1, '||': 2, '&&': 3, '==': 4, '===': 4, '!=': 4, '!==': 4, '>': 5, '>=': 5, '<': 5, '<=': 5, '+': 6, '-': 6, '*': 7, '/': 7, '%': 7, '**': 8 }
const binary = (operator, left, right) => {
  switch (operator) {
    case '??': return left ?? right
    case '||': return left || right
    case '&&': return left && right
    case '==': case '===': return left === right
    case '!=': case '!==': return left !== right
    case '>': return left > right
    case '>=': return left >= right
    case '<': return left < right
    case '<=': return left <= right
    case '+': return typeof left === 'string' || typeof right === 'string' ? String(left ?? '') + String(right ?? '') : number(left) + number(right)
    case '-': return number(left) - number(right)
    case '*': return number(left) * number(right)
    case '/': if (number(right) === 0) throw new ExpressionError('Divisão por zero'); return number(left) / number(right)
    case '%': return number(left) % number(right)
    case '**': return number(left) ** number(right)
    default: throw new ExpressionError('Operador desconhecido')
  }
}

export function evaluateExpression(expression, context = {}) {
  const source = String(expression ?? '').trim().replace(/^\{\{([\s\S]*)\}\}$/, '$1').trim()
  if (!source) return undefined
  const tokens = tokenize(source)
  let index = 0
  let depth = 0
  const peek = () => tokens[index]
  const take = () => tokens[index++]
  const accept = (value) => peek().value === value ? (take(), true) : false
  const expect = (value) => { if (!accept(value)) throw new ExpressionError(`Esperado ${value}`, peek().start) }
  const parse = (minimum = 0, evaluate = true) => {
    if (++depth > 100) throw new ExpressionError('Expressão aninhada demais')
    let result = primary(evaluate)
    while (PRECEDENCE[peek().value] >= minimum) {
      const operator = take().value
      const skipRight = operator === '&&' && !result || operator === '||' && !!result || operator === '??' && result != null
      const right = parse(PRECEDENCE[operator] + (operator === '**' ? 0 : 1), evaluate && !skipRight)
      if (evaluate && !skipRight) result = binary(operator, result, right)
    }
    if (minimum === 0 && accept('?')) {
      const yes = parse(0, evaluate && !!result)
      expect(':')
      const no = parse(0, evaluate && !result)
      if (evaluate) result = result ? yes : no
    }
    depth--
    return result
  }
  const primary = (evaluate = true) => {
    const token = take()
    let result
    if (token.type === 'literal') result = token.value
    else if (token.value === '(') { result = parse(0, evaluate); expect(')') }
    else if (['!', '-', '+'].includes(token.value)) {
      const value = parse(9, evaluate)
      if (evaluate) result = token.value === '!' ? !value : token.value === '-' ? -number(value) : number(value)
    } else if (token.value === '[') {
      result = []
      if (!accept(']')) { do { result.push(parse(0, evaluate)) } while (accept(',') || accept(';')); expect(']') }
    } else if (token.value === '{') {
      result = {}
      if (!accept('}')) { do { const key = take(); if (!['literal', 'identifier'].includes(key.type) || BLOCKED.has(String(key.value))) throw new ExpressionError('Chave inválida', key.start); expect(':'); const value = parse(0, evaluate); if (evaluate) result[key.value] = value } while (accept(',') || accept(';')); expect('}') }
    } else if (token.type === 'identifier') {
      const name = token.value
      if (accept('(')) {
        if (!own(FUNCTIONS, name)) throw new ExpressionError(`Função desconhecida: ${name}`, token.start)
        const args = []
        if (!accept(')')) {
          let argument = 0
          do {
            // if and ifempty evaluate only the selected alternative.
            const evaluateArgument = evaluate && (name === 'if' && argument === 1 ? !!args[0] : name === 'if' && argument === 2 ? !args[0] : ['ifempty', 'ifEmpty'].includes(name) && argument === 1 ? args[0] == null || args[0] === '' || Array.isArray(args[0]) && !args[0].length : true)
            args.push(parse(0, evaluateArgument)); argument++
          } while (accept(',') || accept(';'))
          expect(')')
        }
        if (evaluate) {
          if (name === 'now' && context.__now) result = context.__now
          else try { result = FUNCTIONS[name](...args) } catch (error) { if (error instanceof ExpressionError) throw error; throw new ExpressionError(`${name}: ${error.message}`, token.start) }
        }
      } else if (name === 'true') result = true
      else if (name === 'false') result = false
      else if (name === 'null') result = null
      else if (name === 'undefined') result = undefined
      else if (evaluate) result = property(context, name.startsWith('$') ? name.slice(1) : name)
    } else throw new ExpressionError('Expressão incompleta', token.start)
    while (peek().value === '.' || peek().value === '[') {
      let key
      if (accept('.')) { const token = take(); if (!['identifier', 'literal'].includes(token.type)) throw new ExpressionError('Campo inválido', token.start); key = token.value }
      else { expect('['); key = parse(0, evaluate); expect(']') }
      if (evaluate) result = property(result, key)
    }
    return result
  }
  const result = parse()
  if (peek().type !== 'end') throw new ExpressionError('Conteúdo inesperado', peek().start)
  return result
}

export function resolveTemplate(value, context = {}) {
  if (typeof value !== 'string') return resolveValue(value, context)
  const pure = /^\s*\{\{([\s\S]*?)\}\}\s*$/.exec(value)
  if (pure && !pure[1].includes('}}')) return evaluateExpression(pure[1], context)
  return value.replace(/\{\{([\s\S]*?)\}\}/g, (_, expression) => {
    const result = evaluateExpression(expression, context)
    return result == null ? '' : typeof result === 'object' ? JSON.stringify(result) : String(result)
  })
}

export function resolveValue(value, context = {}, depth = 0) {
  if (depth > 100) throw new ExpressionError('Valor aninhado demais')
  if (typeof value === 'string') return resolveTemplate(value, context)
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, context, depth + 1))
  if (value && typeof value === 'object') {
    const result = {}
    for (const [key, item] of Object.entries(value)) {
      if (BLOCKED.has(key)) throw new ExpressionError(`Chave não permitida: ${key}`)
      result[key] = resolveValue(item, context, depth + 1)
    }
    return result
  }
  return value
}
