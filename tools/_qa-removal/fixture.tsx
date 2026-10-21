import { useSyncExternalStore } from "react";
let state = { fails: true, owned: true, calls: 0, toast: "" };
const listeners = new Set<() => void>();
function update(next: Partial<typeof state>) { state = {...state,...next}; for (const listener of listeners) listener(); }
export function useFixture() { return useSyncExternalStore((fn) => {listeners.add(fn);return () => {listeners.delete(fn);};}, () => state); }
export function allowRemoval() { update({fails:false}); }
const account = {id:"00000000-0000-4000-8000-00000000000a"};
export function useAuth() { return {user:account}; }
export function useUi() { return {toast:(message:string) => update({toast:message})}; }
export function useEntitlements() { return {release:async (_slug:string,onReleased?:()=>void) => {
  update({calls:state.calls+1});
  await new Promise((resolve) => setTimeout(resolve,1200));
  if (state.fails) throw new Error("Falha simulada. Os dados de teste foram mantidos.");
  onReleased?.();
  update({owned:false});
}}; }
