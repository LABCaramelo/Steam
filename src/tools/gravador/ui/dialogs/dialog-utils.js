export const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function setupDialog(owner, label) {
  owner.events = new AbortController();
  const panel = owner.container.querySelector('.obs-modal');
  panel?.setAttribute('role', 'dialog');
  panel?.setAttribute('aria-modal', 'true');
  panel?.setAttribute('aria-label', label);
  if (panel) panel.tabIndex = -1;
  owner.container.querySelectorAll('.form-group').forEach(group => {
    const input = group.querySelector('input,select,textarea');
    const labelElement = group.querySelector('label');
    if (labelElement && input?.id) labelElement.htmlFor = input.id;
  });
  owner.container.addEventListener('keydown', event => {
    if (!owner.isOpen) return;
    if (event.key === 'Escape') { event.stopPropagation(); owner.close(); }
    if (event.key !== 'Tab') return;
    const nodes = [...owner.container.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(node => node.getClientRects().length);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }, { signal: owner.events.signal });
}
export function openDialog(owner) {
  if (!owner.isOpen) owner.previousFocus = document.activeElement;
  owner.container.classList.add('open');
  owner.isOpen = true;
  const focus = owner.container.querySelector('input:not([type=hidden]),select,button');
  (focus || owner.container.querySelector('[role=dialog]'))?.focus();
}
export function closeDialog(owner) {
  const wasOpen = owner.isOpen;
  owner.container.classList.remove('open');
  owner.isOpen = false;
  if (wasOpen && owner.previousFocus?.isConnected) owner.previousFocus.focus();
}
export function destroyDialog(owner) {
  owner.events?.abort();
  owner.container.classList.remove('open');
  owner.isOpen = false;
  owner.currentSource = null;
  owner.container.replaceChildren();
}
