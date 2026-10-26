import { initNavigation } from './ui.js';
import { CONTACT_SERVICES, commercialEvent, prepareContact } from './commercial-contact-model.js';

export function trackCommercial(name, properties = {}) {
  const page = location.pathname.replace(/\/$/, '') || '/';
  const event = commercialEvent(name, { ...properties, page });
  if (!event) return;
  document.dispatchEvent(new CustomEvent('caramelo:commercial', { detail: event }));
  // Reuse a provider only if the owner already configured it. No tracker is loaded here.
  const { event: eventName, ...attributes } = event;
  try {
    if (typeof window.gtag === 'function') window.gtag('event', eventName, attributes);
    else if (typeof window.plausible === 'function') window.plausible(eventName, { props: attributes });
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push(event);
  } catch { /* Measurement must never block navigation or contact. */ }
}

function initCommercialContact() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const submit = form.querySelector('[data-contact-submit]');
  const status = document.querySelector('[data-contact-status]');
  const preview = document.querySelector('[data-contact-preview]');
  const message = preview?.querySelector('[data-contact-message]');
  const whatsapp = preview?.querySelector('[data-whatsapp-preview]');
  const summary = form.querySelector('[data-form-errors]');
  const service = form.elements.namedItem('service');
  if (!submit || !status || !preview || !message || !whatsapp || !service) return;

  const invalidatePreview = () => {
    if (preview.hidden) return;
    preview.hidden = true;
    whatsapp.removeAttribute('href');
    status.textContent = 'Os dados mudaram. Prepare a mensagem novamente antes de abrir o WhatsApp.';
  };
  const chooseService = value => {
    if (Object.hasOwn(CONTACT_SERVICES, value) && service.value !== value) {
      service.value = value;
      invalidatePreview();
    }
  };
  chooseService(new URLSearchParams(location.search).get('servico'));
  if (new URLSearchParams(location.search).get('interesse') === 'workshop') {
    form.elements.namedItem('description').value = 'Gostaria de saber mais sobre o workshop Sites que se Sentem.';
  }
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a[data-service]') : null;
    if (link?.hash === '#contato') chooseService(link.dataset.service);
  });

  let started = false;
  const changed = event => {
    if (!started) {
      started = true;
      trackCommercial('contact_form_started', { source: 'contact-form', service: service.value });
    }
    invalidatePreview();
    const field = event.target;
    if (field instanceof HTMLElement && field.hasAttribute('aria-invalid')) {
      field.removeAttribute('aria-invalid');
      const error = form.querySelector(`[data-error-for="${field.getAttribute('name')}"]`);
      if (error) error.textContent = '';
    }
  };
  form.addEventListener('input', changed);
  form.addEventListener('change', changed);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const result = prepareContact(Object.fromEntries(new FormData(form)));
    form.querySelectorAll('[data-error-for]').forEach(node => {
      const fieldName = node.dataset.errorFor;
      const error = result.errors[fieldName];
      node.textContent = error || '';
      const field = form.elements.namedItem(fieldName);
      if (error) field?.setAttribute('aria-invalid', 'true');
      else field?.removeAttribute('aria-invalid');
    });
    const errors = Object.entries(result.errors);
    if (errors.length) {
      preview.hidden = true;
      whatsapp.removeAttribute('href');
      if (summary) { summary.hidden = false; summary.textContent = 'Confira os campos destacados para preparar sua mensagem.'; }
      status.textContent = '';
      form.elements.namedItem(errors[0][0])?.focus();
      trackCommercial('contact_form_invalid', { source: 'contact-form', field: errors[0][0] });
      return;
    }
    if (summary) summary.hidden = true;
    message.textContent = result.message;
    whatsapp.href = result.url;
    whatsapp.dataset.service = result.values.service;
    preview.hidden = false;
    status.textContent = 'Mensagem preparada para revisão. Nada foi enviado.';
    trackCommercial('contact_message_prepared', { source: 'contact-form', service: result.values.service });
    preview.focus();
  });
  preview.querySelector('[data-edit-contact]')?.addEventListener('click', () => {
    preview.hidden = true;
    whatsapp.removeAttribute('href');
    status.textContent = 'Você pode ajustar os dados e preparar a mensagem novamente.';
    form.elements.namedItem('name')?.focus();
  });
  submit.disabled = false;
}

if (document.body.dataset.commercialPage) {
  if (document.body.classList.contains('service-page')) initNavigation(() => null);
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-event]') : null;
    if (!target || target.matches(':disabled')) return;
    trackCommercial(target.dataset.event, { source: target.dataset.source, service: target.dataset.service });
  });
  document.querySelectorAll('.case-details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open) trackCommercial('case_opened', { source: details.dataset.case });
    });
  });
  initCommercialContact();
  trackCommercial('commercial_page_viewed', { source: document.body.dataset.commercialPage });
}
