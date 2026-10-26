import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUSINESS_WHATSAPP,
  commercialEvent,
  prepareContact,
  validateContact,
} from '../public/assets/js/commercial-contact-model.js';

const contact = (overrides = {}) => ({
  name: 'Joana Gonçalves',
  email: 'joana@example.test',
  whatsapp: '(31) 98586-9015',
  company: '',
  service: 'conteudo',
  description: 'Quero organizar a comunicação da minha marca.',
  deadline: '',
  ...overrides,
});

const serviceLabels = new Map([
  ['conteudo', 'Head de Conteúdo'],
  ['site', 'Landing Page ou Site'],
  ['experiencia', 'Experiência Digital Interativa'],
  ['outro', 'Outro projeto criativo'],
  ['diagnostico', 'Ainda não sei exatamente o que preciso'],
]);

test('empty submission identifies the five required fields and cannot open WhatsApp', () => {
  const validated = validateContact();
  assert.deepEqual(Object.keys(validated.errors).sort(), ['description', 'email', 'name', 'service', 'whatsapp']);
  const prepared = prepareContact({});
  assert.equal(prepared.url, '');
  assert.equal(prepared.message, '');
});

test('missing or non-text required values stay invalid instead of becoming user data', () => {
  for (const field of ['name', 'email', 'whatsapp', 'service', 'description']) {
    for (const value of [undefined, null, false, 42, {}, []]) {
      const result = prepareContact(contact({ [field]: value }));
      assert.ok(result.errors[field], `${field} must reject ${typeof value}`);
      assert.equal(result.url, '');
      assert.equal(result.message, '');
    }
  }
});

test('a valid conversation does not require company, deadline, or budget', () => {
  const result = prepareContact(contact({ company: ' \t\n ', deadline: '  ' }));
  assert.deepEqual(result.errors, {});
  assert.ok(result.url);
  assert.doesNotMatch(result.message, /Minha marca é:|Prazo desejado:|orçamento|investimento/i);
  assert.equal(result.values.company, '');
  assert.equal(result.values.deadline, '');
});

test('Brazilian area codes and international telephone formats are accepted', () => {
  for (const whatsapp of ['31985869015', '(31) 8586-9015', '+55 (31) 98586-9015', '+44 20 7946 0958', '+351 912 345 678']) {
    const result = prepareContact(contact({ whatsapp }));
    assert.deepEqual(result.errors, {}, whatsapp);
    assert.ok(result.message.includes(`WhatsApp: ${whatsapp}`));
  }
});

test('short, excessive, alphabetic, and URL-shaped WhatsApp values are rejected', () => {
  for (const whatsapp of ['98586-9015', '1234567890123456', '+55 31 ligar agora', 'https://wa.me/5531985869015', '31;985869015']) {
    const result = prepareContact(contact({ whatsapp }));
    assert.ok(result.errors.whatsapp, whatsapp);
    assert.equal(result.url, '');
  }
});

test('invalid email addresses and insufficient descriptions do not prepare a contact', () => {
  for (const email of ['joana', 'joana@localhost', '@example.test', 'joana @example.test', 'joana@@example.test']) {
    assert.ok(validateContact(contact({ email })).errors.email, email);
  }
  assert.ok(validateContact(contact({ description: ' \r\n\t ' })).errors.description);
  assert.ok(validateContact(contact({ description: 'Muito bom' })).errors.description);
  assert.ok(validateContact(contact({ name: ' J ' })).errors.name);
});

test('only configured service choices can become human-readable message labels', () => {
  for (const [service, label] of serviceLabels) {
    const result = prepareContact(contact({ service }));
    assert.deepEqual(result.errors, {});
    assert.ok(result.message.includes(`Tenho interesse em: ${label}`));
  }
  for (const service of ['', 'unknown', 'constructor', 'prototype', '__proto__', 'toString', 'hasOwnProperty', 'site?email=private@example.test']) {
    const result = prepareContact(contact({ service }));
    assert.ok(result.errors.service, service || '(empty)');
    assert.equal(result.url, '');
    assert.equal(result.message, '');
  }
});

test('input limits prevent oversized names, contact details, and free text from entering the URL', () => {
  const tooLong = {
    name: 'J'.repeat(101),
    email: `${'j'.repeat(243)}@example.com`,
    whatsapp: `+55 (31) 98586-9015${'.'.repeat(31)}`,
    company: 'Marca'.repeat(29),
    description: 'a'.repeat(1601),
    deadline: 'a'.repeat(121),
  };
  for (const [field, value] of Object.entries(tooLong)) {
    const result = prepareContact(contact({ [field]: value }));
    assert.ok(result.errors[field], field);
    assert.equal(result.url, '');
    assert.equal(result.message, '');
  }
  const boundary = prepareContact(contact({
    name: 'J'.repeat(100),
    email: `${'j'.repeat(242)}@example.com`,
    company: 'M'.repeat(140),
    description: 'a'.repeat(1600),
    deadline: 'd'.repeat(120),
  }));
  assert.deepEqual(boundary.errors, {});
  assert.ok(boundary.url);
});

test('normalization keeps single-line fields single-line and preserves paragraph boundaries', () => {
  const original = contact({
    name: '  Joana\r\nGonçalves\tSilva  ',
    company: ' Marca\n\tCaramelo ',
    deadline: ' Novembro\rde 2026 ',
    description: ' \r\nPrimeiro parágrafo.\r\n\r\nSegundo parágrafo.\rTerceiro parágrafo. \r\n',
  });
  const unchanged = structuredClone(original);
  const result = prepareContact(original);
  assert.deepEqual(result.errors, {});
  assert.equal(result.values.name, 'Joana Gonçalves Silva');
  assert.equal(result.values.company, 'Marca Caramelo');
  assert.equal(result.values.deadline, 'Novembro de 2026');
  assert.equal(result.values.description, 'Primeiro parágrafo.\n\nSegundo parágrafo.\nTerceiro parágrafo.');
  assert.deepEqual(original, unchanged, 'validation must not modify the form data supplied by its caller');
});

test('accented text, query delimiters, percent signs, emoji, and HTML remain literal message text', () => {
  const description = 'Página ação & estratégia? #1 / 100% + revisão 🐕 <img src=x onerror="alert(1)"> https://example.test/?nome=Joana&email=private@example.test';
  const result = prepareContact(contact({ name: 'João d’Ávila 🐕', description, company: '<b>Criação & Cia.</b>' }));
  assert.deepEqual(result.errors, {});
  const destination = new URL(result.url);
  assert.equal(destination.protocol, 'https:');
  assert.equal(destination.hostname, 'wa.me');
  assert.equal(destination.pathname, '/5531985869015');
  assert.equal(BUSINESS_WHATSAPP, '5531985869015', 'the existing business number must remain the destination');
  assert.equal(destination.hash, '');
  assert.deepEqual([...destination.searchParams.keys()], ['text']);
  assert.equal(destination.searchParams.get('text'), result.message);
  assert.ok(result.message.includes(description));
  assert.ok(result.message.includes('Meu nome é: João d’Ávila 🐕'));
  assert.ok(result.message.includes('Minha marca é: <b>Criação & Cia.</b>'));
});

test('prepared contact describes an invitation, never a successful delivery', () => {
  const result = prepareContact(contact({ company: 'Marca Caramelo', deadline: 'Após a campanha atual' }));
  assert.ok(result.message.startsWith('Olá! Conheci o Estúdio Um Cara Caramelo'));
  assert.ok(result.message.endsWith('Podemos conversar sobre as possibilidades?'));
  assert.ok(result.message.includes('Prazo desejado: Após a campanha atual'));
  assert.doesNotMatch(result.message, /enviad[oa] com sucesso|solicitação enviada|recebemos sua|mensagem entregue/i);
  assert.equal(Object.hasOwn(result, 'sent'), false);
});

test('commercial measurement accepts only intended event names, including interest rather than delivery', () => {
  for (const name of [
    'commercial_page_viewed', 'commercial_cta_clicked', 'service_clicked', 'project_clicked',
    'case_opened', 'contact_form_started', 'contact_form_invalid', 'contact_message_prepared', 'whatsapp_clicked',
  ]) assert.deepEqual(commercialEvent(name), { event: name });
  for (const name of [undefined, null, '', 'constructor', '__proto__', 'purchase', 'form_sent', 'contact_form_submitted', 'private@example.test']) {
    assert.equal(commercialEvent(name), null);
  }
});

test('measurement discards personal form data and unrecognized properties', () => {
  const properties = {
    page: '/head-de-conteudo', source: 'head-service', service: 'conteudo', field: 'email',
    name: 'Joana Gonçalves', email: 'private@example.test', whatsapp: '+55 31 98586-9015',
    company: 'Marca privada', description: 'Minha necessidade confidencial.', deadline: 'Amanhã',
    url: 'https://wa.me/5531985869015?text=Joana', text: 'Mensagem com dados pessoais',
    query: '?email=private@example.test', budget: 'Nunca coletado',
  };
  const event = commercialEvent('contact_form_started', properties);
  assert.deepEqual(event, {
    event: 'contact_form_started', page: '/head-de-conteudo', source: 'head-service', service: 'conteudo', field: 'email',
  });
  assert.doesNotMatch(JSON.stringify(event), /private@example|Joana|98586|confidencial|Marca privada|Nunca coletado/);
});

test('page and source metadata reject URLs and query strings containing personal information', () => {
  for (const value of [
    '/?email=private@example.test', '/head-de-conteudo?nome=Joana', '/sites-e-experiencias#private',
    'https://www.umcaracaramelo.com.br/?whatsapp=5531985869015',
    'https://wa.me/5531985869015?text=Joana', 'private@example.test',
  ]) {
    const event = commercialEvent('commercial_cta_clicked', { page: value, source: value });
    assert.deepEqual(event, { event: 'commercial_cta_clicked' });
  }
  for (const page of ['/', '/head-de-conteudo', '/sites-e-experiencias', '/workshop.html']) {
    assert.equal(commercialEvent('commercial_page_viewed', { page }).page, page);
  }
});

test('measurement rejects prototype-like service names and non-category field values', () => {
  for (const value of ['constructor', '__proto__', 'toString', 'private@example.test', 'Minha necessidade confidencial.']) {
    assert.deepEqual(commercialEvent('contact_form_invalid', { service: value, field: value }), { event: 'contact_form_invalid' });
  }
});

test('measurement never accepts a service object through property-key coercion', () => {
  const disguised = { email: 'private@example.test', toString: () => 'site' };
  const event = commercialEvent('service_clicked', { service: disguised });
  assert.deepEqual(event, { event: 'service_clicked' });
});
