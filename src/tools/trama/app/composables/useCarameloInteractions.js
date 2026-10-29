import { onBeforeUnmount, onMounted, unref } from 'vue'

// Vue adapter for the official Caramelo styles.css interactions. It never
// intercepts a click, moves a graph node, or rewrites Vue-owned label content.
const OVERLAYS = '.trama-overlay,.trama-menu,.trama-tooltip'
const SURFACES = '[data-cm-spotlight],.cm-surface--spotlight,.flux-node,.node-dialog,.node-picker,.agent-slot-picker,.node-test-data,.picker-item,.slot-choice,.connection-card,.flow-library,.dashboard-chart-panel,.dashboard-logs'
const TABS = '.return-tabs,.node-input-tabs,.flow-list-tabs,.node-dialog__mobile-tabs,[data-cm-tabs]'
const LABELS = '[data-cm-glitch],.node-caption strong,.node-dialog__identity h2,.node-picker h3,.slot-heading h2,.dashboard-heading h1,.editable-title>span'
const ACTIONS = '[data-cm-action],.node-save,.picker-save,.slot-save,.run-button,.cm-glow-btn,.cm-magnetic'

export function installCarameloInteractions(root) {
  if (!root?.ownerDocument) return () => {}
  const doc = root.ownerDocument
  const view = doc.defaultView
  const owned = new Map()
  const tabs = new Map()
  const pulseTimers = new Map()
  const lastPulse = new WeakMap()
  const reduce = view.matchMedia('(prefers-reduced-motion: reduce)')
  const coarse = view.matchMedia('(pointer: coarse)')
  let disposed = false
  let scanFrame = 0
  let pointerFrame = 0
  let pendingPointer = null
  let magneticTarget = null
  const elementOf = target => target?.nodeType === 1 ? target : target?.parentElement
  const inScope = el => !!el && (el === root || root.contains(el) || !!el.closest(OVERLAYS))
  const motionAllowed = () => !reduce.matches && doc.documentElement.dataset.motion !== 'off'
  const pointerAllowed = event => motionAllowed() && !coarse.matches && event?.pointerType !== 'touch'

  function state(el) {
    if (!owned.has(el)) owned.set(el, { classes: new Set(), attributes: new Map(), styles: new Map() })
    return owned.get(el)
  }
  function addClass(el, ...names) {
    for (const name of names) if (!el.classList.contains(name)) { state(el).classes.add(name); el.classList.add(name) }
  }
  function attribute(el, name, value) {
    if (el.getAttribute(name) === value) return
    const record = state(el)
    if (!record.attributes.has(name)) record.attributes.set(name, el.getAttribute(name))
    if (value === null) el.removeAttribute(name)
    else el.setAttribute(name, value)
  }
  function style(el, name, value) {
    if (el.style.getPropertyValue(name) === value) return
    const record = state(el)
    if (!record.styles.has(name)) record.styles.set(name, [el.style.getPropertyValue(name), el.style.getPropertyPriority(name)])
    el.style.setProperty(name, value)
  }
  function restore(el) {
    const record = owned.get(el)
    if (!record) return
    for (const name of record.classes) el.classList.remove(name)
    for (const [name, value] of record.attributes) value === null ? el.removeAttribute(name) : el.setAttribute(name, value)
    for (const [name, [value, priority]] of record.styles) value ? el.style.setProperty(name, value, priority) : el.style.removeProperty(name)
    owned.delete(el)
  }
  function each(scope, selector, callback) {
    if (scope.matches?.(selector)) callback(scope)
    scope.querySelectorAll(selector).forEach(callback)
  }
  function position(el, event) {
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    // Vue Flow zoom changes CSS pixels relative to viewport pixels.
    style(el, '--mx', `${(event.clientX - rect.left) * (el.offsetWidth || rect.width) / rect.width}px`)
    style(el, '--my', `${(event.clientY - rect.top) * (el.offsetHeight || rect.height) / rect.height}px`)
  }
  function resetMagnet() {
    if (!magneticTarget) return
    style(magneticTarget, '--cm-mag-x', '0px')
    style(magneticTarget, '--cm-mag-y', '0px')
    magneticTarget = null
  }
  function pulse(label) {
    if (!label || !inScope(label) || !motionAllowed() || Date.now() - (lastPulse.get(label) || 0) < 800) return
    lastPulse.set(label, Date.now())
    attribute(label, 'data-cm-glitch-active', 'true')
    clearTimeout(pulseTimers.get(label))
    pulseTimers.set(label, view.setTimeout(() => {
      pulseTimers.delete(label)
      if (!disposed) attribute(label, 'data-cm-glitch-active', null)
    }, 420))
  }
  function labelFor(target) {
    const el = elementOf(target)
    const direct = el?.closest(LABELS)
    if (direct && inScope(direct)) return direct
    const control = el?.closest('button,a,[role="button"]')
    return control && inScope(control) ? control.querySelector(LABELS) : null
  }
  function updateTab(container, entry) {
    const buttons = [...container.children].filter(el => el.matches('button,[role="tab"]'))
    for (const button of entry.buttons) if (!buttons.includes(button)) resize?.unobserve(button)
    for (const button of buttons) if (!entry.buttons.has(button)) resize?.observe(button)
    entry.buttons = new Set(buttons)
    const active = buttons.find(el => el.matches('[aria-selected="true"],[aria-pressed="true"],[aria-current="page"],.selected,.active'))
    // Preserve each view's tab state; the adapter only supplies keyboard order.
    if (container.matches('[role="tablist"]')) for (const button of buttons) attribute(button, 'tabindex', button === active ? '0' : '-1')
    const rect = container.getBoundingClientRect()
    if (!active || !rect.width || !active.getClientRects().length) { attribute(container, 'data-cm-tabs-ready', null); return }
    const activeRect = active.getBoundingClientRect()
    const scale = rect.width / (container.offsetWidth || rect.width)
    const x = (activeRect.left - rect.left) / scale - container.clientLeft + container.scrollLeft
    style(container, '--cm-ind-x', `${Math.round(x * 100) / 100}px`)
    style(container, '--cm-ind-w', `${Math.round(activeRect.width / scale * 100) / 100}px`)
    attribute(container, 'data-cm-tabs-ready', '')
  }
  function enhanceTabs(container) {
    addClass(container, 'trama-showcase-tabs')
    let entry = tabs.get(container)
    if (!entry) {
      const indicator = doc.createElement('span')
      indicator.className = 'cm-tabs__indicator trama-tabs-indicator'
      indicator.setAttribute('aria-hidden', 'true')
      indicator.setAttribute('data-cm-decoration', 'tabs')
      entry = { indicator, buttons: new Set() }
      tabs.set(container, entry)
      resize?.observe(container)
    }
    // Vue may replace conditional children; only reattach the decorative span.
    if (entry.indicator.parentNode !== container) container.append(entry.indicator)
    updateTab(container, entry)
  }
  function enhance(scope) {
    each(scope, SURFACES, el => { addClass(el, 'cm-surface', 'cm-surface--spotlight'); attribute(el, 'data-trama-spotlight', '') })
    each(scope, LABELS, el => { addClass(el, 'cm-glitch'); attribute(el, 'data-trama-glitch', '') })
    each(scope, ACTIONS, el => {
      if (el.matches('.run-button,[data-cm-action="run"]')) {
        addClass(el, 'cm-btn', 'cm-btn--accent', 'cm-btn--fill', 'cm-magnetic')
        attribute(el, 'data-cm-action', 'run')
      } else if (el.matches('.node-save,.picker-save,.slot-save,[data-cm-action="save"]')) {
        addClass(el, 'cm-glow-btn')
        attribute(el, 'data-cm-action', 'save')
      }
    })
    each(scope, TABS, enhanceTabs)
  }
  function refresh() {
    scanFrame = 0
    if (disposed) return
    if (magneticTarget && (!magneticTarget.isConnected || !inScope(magneticTarget) || magneticTarget.matches(':disabled,[aria-disabled="true"],.running') || !magneticTarget.getClientRects().length)) resetMagnet()
    for (const [container, entry] of tabs) if (!container.isConnected || !inScope(container)) {
      resize?.unobserve(container)
      entry.buttons.forEach(button => resize?.unobserve(button))
      entry.indicator.remove()
      tabs.delete(container)
    }
    for (const el of owned.keys()) if (!el.isConnected || !inScope(el)) { clearTimeout(pulseTimers.get(el)); pulseTimers.delete(el); restore(el) }
    enhance(root)
    doc.querySelectorAll(OVERLAYS).forEach(enhance)
  }
  function schedule() { if (!disposed && !scanFrame) scanFrame = view.requestAnimationFrame(refresh) }
  const resize = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : null
  const mutations = new view.MutationObserver(records => {
    if (records.some(record => record.target === doc.documentElement && record.attributeName === 'data-motion')) preferencesChanged()
    else if (records.some(record => inScope(elementOf(record.target)) || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (inScope(node) || owned.has(node) || node.matches(OVERLAYS) || node.querySelector(OVERLAYS))))) schedule()
  })
  mutations.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-disabled', 'aria-selected', 'aria-pressed', 'aria-current', 'data-motion'], characterData: true })

  function pointerMove(event) {
    const target = elementOf(event.target)
    if (!inScope(target) || !pointerAllowed(event)) { pendingPointer = null; resetMagnet(); return }
    pendingPointer = { target, clientX: event.clientX, clientY: event.clientY, buttons: event.buttons, pointerType: event.pointerType }
    if (pointerFrame) return
    pointerFrame = view.requestAnimationFrame(() => {
      pointerFrame = 0
      const point = pendingPointer
      pendingPointer = null
      if (disposed || !point || !point.target.isConnected || !inScope(point.target) || !pointerAllowed(point)) { resetMagnet(); return }
      const surface = point.target.closest('[data-trama-spotlight]')
      const action = point.target.closest('.cm-glow-btn,.cm-magnetic')
      if (surface && inScope(surface)) position(surface, point)
      if (action && inScope(action)) position(action, point)
      const magnet = point.target.closest('[data-cm-action="run"].cm-magnetic,[data-cm-magnetic].cm-magnetic')
      if (magnet !== magneticTarget) resetMagnet()
      if (!magnet || !inScope(magnet) || magnet.matches(':disabled,[aria-disabled="true"],.running') || point.buttons || magnet.closest('.vue-flow__node')) { resetMagnet(); return }
      magneticTarget = magnet
      const rect = magnet.getBoundingClientRect()
      const clamp = value => Math.max(-8, Math.min(8, value * 0.3))
      style(magnet, '--cm-mag-x', `${clamp(point.clientX - rect.left - rect.width / 2)}px`)
      style(magnet, '--cm-mag-y', `${clamp(point.clientY - rect.top - rect.height / 2)}px`)
    })
  }
  function pointerOver(event) {
    const label = labelFor(event.target)
    if (label && !label.contains(elementOf(event.relatedTarget))) pulse(label)
  }
  function pointerOut(event) {
    const related = elementOf(event.relatedTarget)
    if (!inScope(related)) pendingPointer = null
    const pendingMagnet = pendingPointer?.target.closest('.cm-magnetic')
    if (pendingMagnet && !pendingMagnet.contains(related)) pendingPointer = null
    if (magneticTarget && !magneticTarget.contains(related)) resetMagnet()
  }
  function focusIn(event) {
    pulse(labelFor(event.target))
    const target = elementOf(event.target)?.closest('.cm-glow-btn,[data-trama-spotlight]')
    if (target && inScope(target)) { style(target, '--mx', '50%'); style(target, '--my', '50%') }
  }
  function pointerDown(event) { pendingPointer = null; resetMagnet(); if (event.pointerType === 'touch') pulse(labelFor(event.target)) }
  function tabKeyDown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const target = elementOf(event.target)
    const container = target?.closest(`${TABS}`)
    if (!container || !tabs.has(container) || !inScope(container)) return
    const buttons = [...tabs.get(container).buttons].filter(button => !button.matches(':disabled,[aria-disabled="true"]') && button.getClientRects().length)
    const current = buttons.indexOf(target?.closest('button,[role="tab"]'))
    if (current < 0 || !buttons.length) return
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
    event.preventDefault()
    buttons[next].focus()
    buttons[next].click()
  }
  function preferencesChanged() { resetMagnet(); pendingPointer = null; if (!motionAllowed()) for (const [label, timer] of pulseTimers) { view.clearTimeout(timer); attribute(label, 'data-cm-glitch-active', null) }; pulseTimers.clear(); schedule() }
  const listeners = [['pointermove', pointerMove], ['pointerover', pointerOver], ['pointerout', pointerOut], ['pointerdown', pointerDown], ['focusin', focusIn], ['keydown', tabKeyDown]]
  listeners.forEach(([name, listener]) => doc.addEventListener(name, listener, { passive: name !== 'keydown' }))
  view.addEventListener('resize', schedule, { passive: true })
  reduce.addEventListener('change', preferencesChanged)
  coarse.addEventListener('change', preferencesChanged)
  doc.fonts?.ready.then(() => { if (!disposed) schedule() })
  refresh()

  return () => {
    if (disposed) return
    disposed = true
    mutations.disconnect()
    resize?.disconnect()
    view.cancelAnimationFrame(scanFrame)
    view.cancelAnimationFrame(pointerFrame)
    pulseTimers.forEach(timer => view.clearTimeout(timer))
    listeners.forEach(([name, listener]) => doc.removeEventListener(name, listener))
    view.removeEventListener('resize', schedule)
    reduce.removeEventListener('change', preferencesChanged)
    coarse.removeEventListener('change', preferencesChanged)
    tabs.forEach(entry => entry.indicator.remove())
    tabs.clear()
    pulseTimers.clear()
    for (const el of owned.keys()) restore(el)
    magneticTarget = pendingPointer = null
  }
}

export function useCarameloInteractions(target) {
  let cleanup = () => {}
  onMounted(() => { cleanup = installCarameloInteractions(unref(target)) })
  onBeforeUnmount(() => cleanup())
}
