export const BUSINESS_WHATSAPP = '5531985869015';

export const CONTACT_SERVICES = Object.freeze({
  conteudo: 'Head de Conteúdo',
  site: 'Landing Page ou Site',
  experiencia: 'Experiência Digital Interativa',
  outro: 'Outro projeto criativo',
  diagnostico: 'Ainda não sei exatamente o que preciso'
});

const limits = { name: 100, email: 254, whatsapp: 30, company: 140, description: 1600, deadline: 120 };
const fields = [...Object.keys(limits), 'service'];
const singleLine = value => typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim() : '';

export function validateContact(input = {}) {
  const values = Object.fromEntries(fields.map(field => [field, singleLine(input[field])]));
  values.description = typeof input.description === 'string' ? input.description.replace(/\r\n?/g, '\n').trim() : '';
  const errors = {};
  if (values.name.length < 2) errors.name = 'Informe seu nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Informe um e-mail válido.';
  const digits = values.whatsapp.replace(/\D/g, '');
  if (!/^[+()\d\s.-]+$/.test(values.whatsapp) || digits.length < 10 || digits.length > 15) {
    errors.whatsapp = 'Informe seu WhatsApp com DDD ou código do país.';
  }
  if (!Object.hasOwn(CONTACT_SERVICES, values.service)) errors.service = 'Escolha uma opção de interesse.';
  if (values.description.length < 10) errors.description = 'Conte um pouco sobre o que você precisa (ao menos 10 caracteres).';
  for (const [field, limit] of Object.entries(limits)) {
    if (values[field].length > limit) errors[field] = `Use até ${limit} caracteres neste campo.`;
  }
  return { values, errors };
}

export function prepareContact(input) {
  const result = validateContact(input);
  if (Object.keys(result.errors).length) return { ...result, message: '', url: '' };
  const data = result.values;
  const lines = [
    'Olá! Conheci o Estúdio Um Cara Caramelo e gostaria de conversar sobre um projeto.', '',
    `Meu nome é: ${data.name}`, `E-mail: ${data.email}`, `WhatsApp: ${data.whatsapp}`
  ];
  if (data.company) lines.push(`Minha marca é: ${data.company}`);
  lines.push(`Tenho interesse em: ${CONTACT_SERVICES[data.service]}`, '', `Minha ideia ou necessidade é:\n${data.description}`);
  if (data.deadline) lines.push('', `Prazo desejado: ${data.deadline}`);
  lines.push('', 'Podemos conversar sobre as possibilidades?');
  const message = lines.join('\n');
  const url = new URL(`https://wa.me/${BUSINESS_WHATSAPP}`);
  url.searchParams.set('text', message);
  return { ...result, message, url: url.href };
}

const eventNames = new Set([
  'commercial_page_viewed', 'commercial_cta_clicked', 'service_clicked', 'project_clicked',
  'case_opened', 'contact_form_started', 'contact_form_invalid', 'contact_message_prepared', 'whatsapp_clicked'
]);
const pages = new Set(['/', '/head-de-conteudo', '/sites-e-experiencias', '/workshop.html']);

// Only fixed categories reach the measurement hook; form values and query strings never do.
export function commercialEvent(name, properties = {}) {
  if (!eventNames.has(name)) return null;
  const event = { event: name };
  if (pages.has(properties.page)) event.page = properties.page;
  if (typeof properties.source === 'string' && /^[a-z0-9_-]{1,60}$/.test(properties.source)) event.source = properties.source;
  if (typeof properties.service === 'string' && Object.hasOwn(CONTACT_SERVICES, properties.service)) event.service = properties.service;
  if (fields.includes(properties.field)) event.field = properties.field;
  return event;
}
