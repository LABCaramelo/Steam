// Formulários declarativos do editor. Os dados de conexão são resolvidos pelo servidor.
const f = (key, label, type = 'text', extra = {}) => ({ key, label, type, ...extra })
const json = (key, label, extra = {}) => f(key, label, 'json', extra)
const select = (key, label, options, extra = {}) => f(key, label, 'select', { options, ...extra })
const httpFields = (advanced = false) => [
  select('method', 'Método HTTP', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], { required: true, default: 'GET', advanced }),
  f('url', 'URL da ação', 'text', { required: true, placeholder: 'https://api.exemplo.com/recurso', advanced }),
  json('headers', 'Headers', { default: {}, rows: 4, advanced }),
  json('query', 'Query parameters', { default: {}, rows: 4, advanced }),
  json('body', 'Body', { default: {}, rows: 12, advanced }),
]

export const APP_ALIASES = { javascript: 'code', http: 'requester', foreach: 'for_each', uazapi: 'whatsapp', supabase: 'database', set_variable: 'set_variables', openai: 'chatgpt' }
export const canonicalApp = (app) => APP_ALIASES[app] || app

export const NODE_SCHEMAS = {
  webhook: { title: 'Webhook', description: 'Recebe uma requisição HTTP e inicia sua integração.', fields: [] },
  scheduler: { title: 'Agendamento', description: 'Inicia a integração na periodicidade configurada.', fields: [f('interval_minutes', 'Intervalo em minutos', 'number', { required: true, default: 10, min: 1 }), f('timezone', 'Fuso horário', 'text', { default: 'America/Sao_Paulo' })] },
  requester: { title: 'Requester', description: 'Realiza chamadas HTTP para APIs.', fields: [select('method', 'Método', ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'], { required: true, default: 'GET' }), f('url', 'URL', 'text', { required: true, placeholder: 'https://api.exemplo.com/recurso' }), json('query', 'Query parameters', { default: {}, rows: 4 }), json('headers', 'Headers', { default: {}, rows: 4 }), json('body', 'Body', { default: {}, rows: 9 }), f('timeout', 'Timeout em milissegundos', 'number', { default: 30000, min: 100, max: 300000 })] },
  code: { title: 'Javascript', description: 'Transforma os dados recebidos e retorna o resultado do código.', fields: [f('code', 'Código JavaScript', 'code', { required: true, rows: 22, default: 'return input;', language: 'javascript', hint: 'O objeto input contém a entrada. Retorne o valor que será disponibilizado em result.' })] },
  filter: { title: 'Filtro', description: 'Continua o fluxo se a condição for verdadeira.', fields: [f('field', 'Valor a comparar', 'text', { required: true, placeholder: '{{$IN.BODY.valor}}' }), select('operator', 'Operador', [{ title: 'Igual a', value: 'eq' }, { title: 'Diferente de', value: 'neq' }, { title: 'Maior que', value: 'gt' }, { title: 'Maior ou igual a', value: 'gte' }, { title: 'Menor que', value: 'lt' }, { title: 'Menor ou igual a', value: 'lte' }, { title: 'Contém', value: 'contains' }, { title: 'Não contém', value: 'not_contains' }, { title: 'Existe', value: 'exists' }, { title: 'Não existe', value: 'not_exists' }], { required: true, default: 'eq' }), f('value', 'Valor de comparação')] },
  router: { title: 'Roteador', description: 'Divide o fluxo em caminhos independentes, executados na ordem das conexões.', fields: [] },
  for_each: { title: 'For Each', description: 'Executa os componentes do caminho para cada item da coleção.', fields: [f('iterable', 'Array ou objeto', 'text', { required: true, placeholder: '{{$IN.BODY.items}}', hint: 'O item atual será disponibilizado na variável iterable deste componente.' })] },
  delay: { title: 'Delay', description: 'Aguarda um tempo antes de prosseguir.', fields: [f('amount', 'Tempo de espera', 'number', { default: 1, required: true, min: 0 }), select('unit', 'Unidade', [{ title: 'Milissegundos', value: 'ms' }, { title: 'Segundos', value: 'seconds' }, { title: 'Minutos', value: 'minutes' }, { title: 'Horas', value: 'hours' }], { default: 'seconds' })] },
  return: { title: 'Retorno', description: 'Define a resposta do Webhook síncrono.', fields: [f('status', 'Código HTTP', 'number', { default: 200, min: 100, max: 599, required: true }), f('content_type', 'Content-Type', 'text', { default: 'application/json' }), json('headers', 'Headers', { default: {}, rows: 4 }), json('body', 'Body', { default: {}, rows: 16 })] },
  set_variables: { title: 'Definir variáveis', description: 'Cria variáveis para os próximos componentes.', fields: [json('values', 'Variáveis e valores', { default: {}, rows: 18, required: true })] },
  chatgpt: { title: 'ChatGPT', connection: true, description: 'Envia mensagens para o modelo configurado na conexão.', fields: [f('model', 'Modelo', 'text', { required: true, placeholder: 'Identificador do modelo' }), f('system_prompt', 'Instruções do sistema', 'textarea', { rows: 6 }), f('user_prompt', 'Mensagem', 'textarea', { required: true, rows: 9 }), f('temperature', 'Temperatura', 'number', { min: 0, max: 2, step: 0.1 })] },
  ai_agent: { title: 'Agente IA', connection: true, description: 'Executa um agente com instruções, modelo e mensagem.', fields: [f('model', 'Modelo', 'text', { required: true, placeholder: 'Identificador do modelo' }), f('system_prompt', 'Instruções do sistema', 'textarea', { rows: 9 }), f('user_prompt', 'Mensagem do usuário', 'textarea', { required: true, rows: 6 }), f('session_id', 'ID da sessão', 'text', { hint: 'Identifica uma conversa para a memória configurada.' }), f('max_iterations', 'Máximo de interações com ferramentas', 'number', { default: 8, min: 1, max: 32 }), f('provider', 'Provedor', 'text', { advanced: true, hint: 'Opcional. Usa o provedor da conexão quando vazio.' }), json('tools', 'Ferramentas do agente', { default: [], rows: 18, advanced: true, hint: 'Array de ferramentas HTTP com name, description, parameters (JSON Schema) e request (url, method, headers, query, body), ou ferramentas MCP com type:"mcp" e config. Argumentos ficam em $AI.args. Ferramentas requerem um provedor compatível com OpenAI.' })] },
  mcp_client: { title: 'Cliente MCP', connection: true, connectionOptional: true, description: 'Lista ou executa ferramentas de um servidor MCP com transporte Streamable HTTP.', fields: [f('server_url', 'URL do servidor MCP', 'text', { required: true, placeholder: 'https://servidor.exemplo.com/mcp' }), select('operation', 'Operação', [{ title: 'Listar ferramentas', value: 'list' }, { title: 'Executar ferramenta', value: 'call' }], { default: 'list' }), select('tools_mode', 'Ferramentas disponíveis', [{ title: 'Todas', value: 'all' }, { title: 'Selecionadas', value: 'selected' }], { default: 'all' }), json('selected_tools', 'Nomes das ferramentas selecionadas', { default: [], rows: 5, hint: 'Array dos nomes retornados pelo servidor, por exemplo ["buscar_pedido"].' }), f('tool_name', 'Nome da ferramenta', 'text', { required: true }), json('arguments', 'Argumentos', { default: {}, rows: 12 }), f('timeout_ms', 'Timeout em milissegundos', 'number', { default: 30000, min: 100, max: 300000, advanced: true }), f('protocol_version', 'Versão do protocolo', 'text', { advanced: true, hint: 'Opcional. Deixe vazio para negociar a versão com o servidor.' })] },
  whatsapp: { title: 'Uazapi', connection: true, description: 'Envia uma mensagem de texto.', fields: [f('phone', 'Número do contato', 'text', { required: true, placeholder: '{{$IN.BODY.chat.phone}}' }), f('text', 'Texto', 'textarea', { required: true, rows: 2, placeholder: '{{$1.response}}' }), select('read', 'Marcar chat como lido', [{ title: 'Sim', value: true }, { title: 'Não', value: false }], { default: true, custom: true })] },
  database: { title: 'Supabase', connection: true, description: 'Cria um novo registro ou atualiza um existente.', fields: [f('table', 'Tabela', 'text', { required: true }), json('values', 'JSON coluna-valor', { default: {}, rows: 23, required: true }), select('operation', 'Operação', [{ title: 'Criar ou atualizar registro', value: 'upsert' }, { title: 'Criar registro', value: 'insert' }, { title: 'Buscar registros', value: 'select' }, { title: 'Atualizar registros', value: 'update' }, { title: 'Excluir registros', value: 'delete' }], { default: 'upsert', advanced: true }), json('query', 'Filtros da consulta', { default: {}, rows: 5, advanced: true, hint: 'Objeto de parâmetros REST, por exemplo {"id":"eq.123"}. Atualizar e excluir exigem um filtro.' }), f('on_conflict', 'Colunas de conflito', 'text', { advanced: true, hint: 'Nomes das colunas únicas, separados por vírgula.' })] },
  telegram: { title: 'Telegram Bot', connection: true, description: 'Envia uma mensagem de texto para uma conversa.', fields: [f('chat_id', 'ID do chat', 'text', { required: true }), f('message', 'Texto', 'textarea', { required: true, rows: 5 }), select('parse_mode', 'Formatação', ['', 'HTML', 'MarkdownV2'], { default: '' })] },
  sheets: { title: 'Google Sheets', connection: true, description: 'Lê ou adiciona valores em uma planilha.', fields: [select('operation', 'Operação', [{ title: 'Adicionar linha', value: 'append' }, { title: 'Buscar linhas', value: 'get' }, { title: 'Atualizar valores', value: 'update' }], { default: 'append' }), f('spreadsheet_id', 'ID da planilha', 'text', { required: true }), f('range', 'Intervalo', 'text', { required: true, default: 'Página1!A:Z' }), json('values', 'Valores das colunas', { default: [[]], rows: 10 })] },
  accumulator: { title: 'Acumulador', description: 'Acumula valores por uma chave e janela configurada.', fields: [f('key', 'Chave de identificação', 'text', { required: true }), f('value', 'Mensagem', 'textarea', { required: true, rows: 4 }), f('window_seconds', 'Janela em segundos', 'number', { default: 5, min: 0 })] },
  aggregate: { title: 'Agregador', description: 'Agrega os valores de uma coleção.', fields: [f('iterable', 'Coleção', 'text', { required: true }), select('operation', 'Operação', ['collect', 'sum', 'count', 'join'], { default: 'collect' }), f('field', 'Campo'), f('separator', 'Separador', 'text', { default: ', ' })] },
  remap: { title: 'Remapear', description: 'Define a estrutura de saída do componente.', fields: [json('values', 'Mapeamento', { default: {}, rows: 20, required: true })] },
  for: { title: 'For', description: 'Executa os componentes para uma sequência numérica.', fields: [f('from', 'De', 'number', { default: 0, required: true }), f('to', 'Até', 'number', { default: 1, required: true }), f('step', 'Incremento', 'number', { default: 1, required: true })] },
  while: { title: 'While', description: 'Repete o caminho enquanto a condição for verdadeira.', fields: [f('expression', 'Condição', 'text', { required: true }), f('max_iterations', 'Limite de iterações', 'number', { default: 100, min: 1, max: 1000 })] },
  filter_log: { title: 'Filtro de Logs', description: 'Oculta os caminhos configurados nos próximos registros do log.', fields: [json('paths', 'Caminhos ocultados', { default: [], rows: 8, hint: 'Array de caminhos a ocultar, por exemplo ["body.document"].' })] },
}

export function schemaForStep(step) {
  const schema = NODE_SCHEMAS[canonicalApp(step.app)]
  if (schema) {
    if (canonicalApp(step.app) === 'mcp_client') {
      return { ...schema, fields: schema.fields.filter(field => (step.config?.operation === 'call' || !['tool_name', 'arguments'].includes(field.key)) && (step.config?.tools_mode === 'selected' || field.key !== 'selected_tools')) }
    }
    if (canonicalApp(step.app) === 'database' && ['select', 'get', 'delete'].includes(step.config?.operation)) {
      return { ...schema, fields: schema.fields.filter(field => field.key !== 'values') }
    }
    return schema
  }
  const declared = step.parameters_json || step.schema || []
  const fields = Array.isArray(declared) ? declared.flatMap(group => group.inputs || group.fields || [group]).filter(item => item && (item.key || item.name)).map(item => ({ ...item, key: item.key || item.name, label: item.label || item.title || item.name, type: item.type === 'select' ? 'select' : ['number', 'boolean', 'json', 'textarea', 'code'].includes(item.type) ? item.type : 'text', options: item.options || item.items || [] })) : []
  if (step.module_id && step.definition) return { title: step.title || step.app, connection: true, connectionOptional: true, description: step.description || step.action || '', fields }
  return { title: step.title || step.app, connection: !step.middleware, description: step.description || 'Configure a requisição desta ação. A conexão fornece a autenticação.', fields: fields.length ? [...fields, ...httpFields(true).filter(field => !fields.some(item => item.key === field.key))] : httpFields() }
}

export function createStepDraft(step) {
  const draft = structuredClone(JSON.parse(JSON.stringify(step)))
  draft.config ||= {}
  const app = canonicalApp(step.app)
  const aliases = { code: { code_snippet: 'code' }, requester: { http_method: 'method' }, chatgpt: { prompt: 'user_prompt' }, whatsapp: { message: 'text' }, sheets: { sheet: 'spreadsheet_id', tab: 'range' } }[app] || {}
  for (const [oldKey, newKey] of Object.entries(aliases)) if (draft.config[newKey] === undefined && draft.config[oldKey] !== undefined) draft.config[newKey] = draft.config[oldKey]
  if (!NODE_SCHEMAS[app] && draft.config.request && typeof draft.config.request === 'object') {
    for (const key of ['url', 'method', 'headers', 'query', 'body']) if (draft.config[key] === undefined && draft.config.request[key] !== undefined) draft.config[key] = structuredClone(draft.config.request[key])
  }
  if (app === 'database' && draft.config.query === undefined) {
    if (draft.config.filters !== undefined) draft.config.query = draft.config.filters
    else if (typeof draft.config.filter === 'string') draft.config.query = Object.fromEntries(new URLSearchParams(draft.config.filter))
  }
  if (app === 'accumulator' && draft.config.window_seconds === undefined && draft.config.window_ms !== undefined) draft.config.window_seconds = Number(draft.config.window_ms) / 1000
  for (const field of schemaForStep(draft).fields) if (draft.config[field.key] === undefined && field.default !== undefined) draft.config[field.key] = structuredClone(field.default)
  draft.is_fatal = draft.is_fatal !== false
  return draft
}

export function validateStepDraft(draft) {
  const errors = {}
  for (const field of schemaForStep(draft).fields) {
    const value = draft.config[field.key]
    if (field.required && (value === undefined || value === null || typeof value === 'string' && !value.trim())) errors[field.key] = 'Preencha este campo.'
    if (field.type === 'number' && value !== undefined && value !== '' && value !== null) {
      if (!Number.isFinite(Number(value))) errors[field.key] = 'Informe um número válido.'
      else if (field.min !== undefined && Number(value) < field.min) errors[field.key] = `O mínimo é ${field.min}.`
      else if (field.max !== undefined && Number(value) > field.max) errors[field.key] = `O máximo é ${field.max}.`
    }
    if (field.type === 'json' && typeof value === 'string' && value.trim() && !/^\s*\{\{[\s\S]+\}\}\s*$/.test(value)) {
      try { JSON.parse(value) } catch { errors[field.key] = 'JSON inválido. Revise as aspas, vírgulas e chaves.' }
    }
  }
  if (canonicalApp(draft.app) === 'database' && ['update', 'delete'].includes(draft.config.operation) && !errors.query) {
    const raw = draft.config.query
    if (!(typeof raw === 'string' && /^\s*\{\{[\s\S]+\}\}\s*$/.test(raw))) {
      const query = typeof raw === 'string' && raw.trim() ? JSON.parse(raw) : raw
      if (!query || typeof query !== 'object' || Array.isArray(query) || !Object.keys(query).length) errors.query = 'Informe um filtro antes de atualizar ou excluir registros.'
    }
  }
  return errors
}

export function prepareStepDraft(draft) {
  const result = JSON.parse(JSON.stringify(draft))
  for (const field of schemaForStep(result).fields) {
    const value = result.config[field.key]
    if (field.type === 'json' && typeof value === 'string' && value.trim() && !/^\s*\{\{[\s\S]+\}\}\s*$/.test(value)) result.config[field.key] = JSON.parse(value)
    if (field.type === 'number' && value !== '' && value !== undefined && value !== null) result.config[field.key] = Number(value)
  }
  if (canonicalApp(result.app) === 'accumulator' && result.config.window_seconds !== undefined) result.config.window_ms = Number(result.config.window_seconds) * 1000
  if (!NODE_SCHEMAS[canonicalApp(result.app)] && !(result.module_id && result.definition)) {
    result.config.request = Object.fromEntries(['url', 'method', 'headers', 'query', 'body'].filter(key => result.config[key] !== undefined).map(key => [key, result.config[key]]))
  }
  return result
}
