import { computed, ref } from 'vue'
// Identity and data live only in memory; the LAB supplies the verified Supabase session.
const user = ref(null)
const selectedOrgId = ref(null)
const ready = ref(false)
const isLogged = computed(() => !!user.value?.id)
export function useSession() {
  function setUser(value) { user.value = value?.id ? value : null }
  function updateUser(patch) { if (user.value) user.value = { ...user.value, ...patch } }
  function selectOrg(id) { selectedOrgId.value = id || null }
  function markReady() { ready.value = true }
  return { user, selectedOrgId, ready, isLogged, setUser, updateUser, selectOrg, markReady }
}
