import { RuntimeError } from './errors.js'

const forbidden = new Set(['__proto__', 'prototype', 'constructor'])
const knownKeys = new Set(['$schema', 'title', 'description', 'default', 'examples', 'type', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const', 'minimum', 'maximum', 'minItems', 'maxItems', 'minLength', 'maxLength'])
export function validateToolSchema(schema, depth = 0) {
  if (depth > 20 || !schema || typeof schema !== 'object' || Array.isArray(schema)) throw new RuntimeError('TOOL_SCHEMA_UNSUPPORTED', 'Schema de ferramenta inválido ou aninhado demais.')
  for (const key of Object.keys(schema)) if (!knownKeys.has(key)) throw new RuntimeError('TOOL_SCHEMA_UNSUPPORTED', 'Keyword JSON Schema não suportada neste executor: ' + key)
  if (schema.type && !['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(schema.type)) throw new RuntimeError('TOOL_SCHEMA_UNSUPPORTED', 'Tipo JSON Schema não suportado.')
  if (schema.required && (!Array.isArray(schema.required) || schema.required.some(key => typeof key !== 'string' || forbidden.has(key)))) throw new RuntimeError('TOOL_SCHEMA_UNSUPPORTED', 'required deve ser um array de nomes seguros.')
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== 'boolean') throw new RuntimeError('TOOL_SCHEMA_UNSUPPORTED', 'additionalProperties deve ser booleano neste executor.')
  for (const [key, value] of Object.entries(schema.properties ?? {})) { if (forbidden.has(key)) throw new RuntimeError('TOOL_SCHEMA_UNSUPPORTED', 'Campo de ferramenta não permitido.'); validateToolSchema(value, depth + 1) }
  if (schema.items) validateToolSchema(schema.items, depth + 1)
  return schema
}
export function validateToolArguments(value, schema, path = 'arguments', depth = 0) {
  if (depth > 20) throw new RuntimeError('TOOL_ARGUMENTS_INVALID', 'Argumentos aninhados demais.')
  const mismatch = message => { throw new RuntimeError('TOOL_ARGUMENTS_INVALID', path + ': ' + message) }
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  if (schema.type && (schema.type === 'integer' ? !Number.isInteger(value) : type !== schema.type)) mismatch('tipo esperado: ' + schema.type)
  if (schema.enum && !schema.enum.some(option => JSON.stringify(option) === JSON.stringify(value))) mismatch('valor fora do enum')
  if (Object.hasOwn(schema, 'const') && JSON.stringify(schema.const) !== JSON.stringify(value)) mismatch('valor diferente do const')
  if (type === 'object') {
    for (const key of Object.keys(value)) if (forbidden.has(key)) mismatch('campo não permitido')
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) mismatch('campo obrigatório: ' + key)
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) validateToolArguments(item, schema.properties[key], path + '.' + key, depth + 1)
      else if (schema.additionalProperties === false) mismatch('campo extra: ' + key)
    }
  }
  if (type === 'array') {
    if (schema.minItems != null && value.length < schema.minItems || schema.maxItems != null && value.length > schema.maxItems) mismatch('tamanho de array inválido')
    if (schema.items) value.forEach((item, index) => validateToolArguments(item, schema.items, path + '[' + index + ']', depth + 1))
  }
  if (type === 'string' && (schema.minLength != null && value.length < schema.minLength || schema.maxLength != null && value.length > schema.maxLength)) mismatch('comprimento de texto inválido')
  if (type === 'number' && (!Number.isFinite(value) || schema.minimum != null && value < schema.minimum || schema.maximum != null && value > schema.maximum)) mismatch('número fora do intervalo')
  return value
}
