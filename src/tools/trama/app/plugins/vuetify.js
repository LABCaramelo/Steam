import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { VAlert, VApp, VAvatar, VBadge, VBtn, VBtnToggle, VCard, VCardActions, VCardText, VCardTitle, VCheckbox, VChip, VCol, VContainer, VDataTable, VDialog, VDivider, VExpandTransition, VExpansionPanel, VExpansionPanelText, VExpansionPanelTitle, VExpansionPanels, VFadeTransition, VFooter, VForm, VIcon, VImg, VItem, VItemGroup, VList, VListItem, VListItemSubtitle, VListItemTitle, VMain, VMenu, VPagination, VProgressCircular, VProgressLinear, VRow, VSelect, VSheet, VSkeletonLoader, VSlideXReverseTransition, VSpacer, VSwitch, VTab, VTabs, VTextField, VTextarea, VToolbar, VTooltip, VWindow, VWindowItem } from 'vuetify/components'
const components = { VAlert, VApp, VAvatar, VBadge, VBtn, VBtnToggle, VCard, VCardActions, VCardText, VCardTitle, VCheckbox, VChip, VCol, VContainer, VDataTable, VDialog, VDivider, VExpandTransition, VExpansionPanel, VExpansionPanelText, VExpansionPanelTitle, VExpansionPanels, VFadeTransition, VFooter, VForm, VIcon, VImg, VItem, VItemGroup, VList, VListItem, VListItemSubtitle, VListItemTitle, VMain, VMenu, VPagination, VProgressCircular, VProgressLinear, VRow, VSelect, VSheet, VSkeletonLoader, VSlideXReverseTransition, VSpacer, VSwitch, VTab, VTabs, VTextField, VTextarea, VToolbar, VTooltip, VWindow, VWindowItem }
import { Ripple } from 'vuetify/directives'
const directives = { Ripple }
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { customIconSet } from '@trama/components/icons'
const common = { 'on-primary': '#101014', secondary: '#FF3D8D', 'on-secondary': '#101014', progressbar: '#FF701A', 'on-progressbar': '#101014', purple: '#9A85FF', 'on-purple': '#101014', pink: '#FF3D8D', 'on-pink': '#101014', orange: '#FF701A', 'on-orange': '#101014', blue: '#25BFFF', 'on-blue': '#101014', yellow: '#FFD52A', 'on-yellow': '#101014', indigo: '#9A85FF', 'on-indigo': '#101014', 'if-color': '#F1EFFF', teal: '#3DDC97', amber: '#FFD52A' }
const dark = { dark: true, colors: { ...common, primary: '#FF701A', secondarybtn: '#2B1608', 'on-secondarybtn': '#FFF4E8', success: '#3DDC97', 'on-success': '#101014', info: '#25BFFF', 'on-info': '#101014', warning: '#FFD52A', 'on-warning': '#101014', error: '#FF3D8D', 'on-error': '#101014', muted: '#A3A3B0', gray: '#8B8B98', 'on-gray': '#101014', background: '#0A0A0D', 'on-background': '#FFF4E8', fluxBackground: '#0A0A0D', 'on-fluxBackground': '#FFF4E8', surface: '#101014', 'on-surface': '#FFF4E8', 'black-white': '#FFF4E8', faded: '#18181D', 'background-pattern-color': '#3A3A44', 'card-outline': '#27272F' }, variables: { 'border-color': '#3A3A44', 'medium-emphasis-opacity': 0.78, 'disabled-opacity': 0.5 } }
const light = { dark: false, colors: { ...common, primary: '#AB3B00', 'on-primary': '#FFF4E8', secondarybtn: '#FFE6D3', 'on-secondarybtn': '#101014', success: '#0B6B45', 'on-success': '#FFF4E8', info: '#0B6E99', 'on-info': '#FFF4E8', warning: '#7A5600', 'on-warning': '#FFF4E8', error: '#C0185E', 'on-error': '#FFF4E8', purple: '#5B3FE0', pink: '#C0185E', orange: '#AB3B00', blue: '#0B6E99', yellow: '#7A5600', indigo: '#5B3FE0', muted: '#5E5A55', gray: '#6B6862', background: '#FFF4E8', 'on-background': '#101014', fluxBackground: '#FFF4E8', 'on-fluxBackground': '#101014', surface: '#FFFAF4', 'on-surface': '#101014', 'black-white': '#101014', faded: '#F5E6D4', 'background-pattern-color': '#D4BC9F', 'card-outline': '#E8D2BB' }, variables: { 'border-color': '#D4BC9F', 'medium-emphasis-opacity': 0.78, 'disabled-opacity': 0.5 } }
export const THEME_STORAGE_KEY = 'caramelo-theme'
export default createVuetify({
  components, directives,
  theme: { defaultTheme: document.documentElement.dataset.carameloTheme === 'light' ? 'light' : 'dark', themes: { light, dark } },
  icons: { defaultSet: 'mdi', aliases, sets: { mdi, custom: customIconSet } },
  defaults: {
    VTextField: { density: 'comfortable', variant: 'outlined', hideDetails: true, rounded: 'lg' },
    VTextarea: { noResize: true, variant: 'outlined', hideDetails: true, rounded: 'lg' },
    VSelect: { density: 'comfortable', variant: 'outlined', hideDetails: true, rounded: 'lg' },
    VForm: { VTextField: { hideDetails: false }, VTextarea: { hideDetails: false }, VSelect: { hideDetails: false } },
    VBtn: { flat: true, type: 'button' }, VCard: { rounded: 'lg', flat: true }, VDivider: { color: 'card-outline', thickness: 1, opacity: 1 },
    VDialog: { class: 'trama-overlay', scrim: true, transition: 'fade-transition' },
    VMenu: { class: 'trama-overlay trama-menu', transition: 'fade-transition' },
    VTooltip: { class: 'trama-tooltip', openDelay: 300, transition: 'fade-transition' },
  },
})
