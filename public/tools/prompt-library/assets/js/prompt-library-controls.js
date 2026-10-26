(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PromptLibraryControls = api;
})(typeof window === 'object' ? window : globalThis, () => {
  const count = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  function getPriorityTier(item) {
    if (!item) return 99;
    const category = item.category || '';
    const type = item.type || '';
    const id = item.id || '';
    if (category === 'Movimentos de Câmera' || type === 'camera' || id.startsWith('cam-')) return 4;
    if (type === 'motion' || id.startsWith('cui-') || id.startsWith('amix-')) return 3;
    if (category === 'Landing Pages' || category === 'Hero Sections' || category === 'Componentes UI' || id === 'vlt-00-prompt-hero') return 1;
    return 2;
  }
  function compare(a, b, order) {
    const tierA = getPriorityTier(a);
    const tierB = getPriorityTier(b);
    if (tierA !== tierB) return tierA - tierB;
    if (order === 'title') return a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id);
    if (order === 'popular') {
      const difference = count(b.verified_count) - count(a.verified_count);
      if (difference) return difference;
    }
    return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || a.id.localeCompare(b.id);
  }
  function createSelect({ id, options, value, onChange }) {
    const trigger = document.getElementById(id);
    const menu = document.getElementById(trigger.getAttribute('aria-controls'));
    let choices = options;
    let selected = value;
    let active = 0;
    let typed = '';
    let typeTimer;
    function highlight(index) {
      active = (index + choices.length) % choices.length;
      [...menu.children].forEach((option, i) => option.classList.toggle('active', i === active));
      trigger.setAttribute('aria-activedescendant', `${id}-option-${active}`);
      const option = menu.children[active];
      if (option && option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop;
      else if (option && option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight;
    }
    function close() {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
    }
    function open() {
      document.dispatchEvent(new CustomEvent('prompt-select-open', { detail: id }));
      menu.hidden = false;
      menu.classList.toggle('is-above', window.innerHeight - trigger.getBoundingClientRect().bottom < menu.offsetHeight + 18 && trigger.getBoundingClientRect().top > menu.offsetHeight + 18);
      trigger.setAttribute('aria-expanded', 'true');
      highlight(Math.max(0, choices.findIndex(option => option.value === selected)));
    }
    function setValue(next, notify = false) {
      selected = next;
      const choice = choices.find(option => option.value === next) || choices[0];
      trigger.querySelector('.select-value').textContent = choice.label;
      [...menu.children].forEach((option, i) => option.setAttribute('aria-selected', String(choices[i].value === selected)));
      close();
      if (notify) onChange(selected);
    }
    function setOptions(next) {
      choices = next;
      menu.replaceChildren(...choices.map((choice, index) => {
        const option = document.createElement('div');
        option.id = `${id}-option-${index}`;
        option.setAttribute('role', 'option');
        option.textContent = choice.label;
        option.addEventListener('pointermove', () => highlight(index));
        option.addEventListener('click', () => { setValue(choice.value, true); trigger.focus({ preventScroll: true }); });
        return option;
      }));
      setValue(choices.some(option => option.value === selected) ? selected : choices[0].value);
    }
    trigger.addEventListener('click', () => menu.hidden ? open() : close());
    trigger.addEventListener('keydown', event => {
      const key = event.key;
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
        event.preventDefault();
        if (menu.hidden) open();
        else highlight(key === 'Home' ? 0 : key === 'End' ? choices.length - 1 : active + (key === 'ArrowDown' ? 1 : -1));
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (menu.hidden) open(); else setValue(choices[active].value, true);
      } else if (key === 'Escape') {
        if (!menu.hidden) event.preventDefault();
        close();
      } else if (key === 'Tab') close();
      else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        clearTimeout(typeTimer);
        typed += key.toLocaleLowerCase('pt-BR');
        const match = choices.findIndex(option => option.label.toLocaleLowerCase('pt-BR').startsWith(typed));
        if (menu.hidden) open();
        if (match >= 0) highlight(match);
        typeTimer = setTimeout(() => { typed = ''; }, 700);
      }
    });
    document.addEventListener('pointerdown', event => { if (!trigger.parentElement.contains(event.target)) close(); });
    document.addEventListener('prompt-select-open', event => { if (event.detail !== id) close(); });
    setOptions(options);
    return { setValue, setOptions, close };
  }
  return { compare, getPriorityTier, createSelect };
});
