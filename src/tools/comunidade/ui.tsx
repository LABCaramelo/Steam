import { createContext, useContext } from 'react';
import { MenuIcon } from './icons';
import { defaultSettings, type Settings } from './store';

/** Configurações visíveis a qualquer componente (modo compacto, etc.). */
export const SettingsContext = createContext<Settings>(defaultSettings);

/** No celular, abre a lista de servidores e canais (que ocupa a tela toda). */
export const OpenNavContext = createContext<() => void>(() => {});

/** Abre a busca rápida de canais, servidores e mensagens diretas. */
export const OpenQuickSwitcherContext = createContext<() => void>(() => {});

/** Botão de voltar aos canais; só aparece em telas estreitas (ver .nav-button no CSS). */
export function NavButton() {
  const openNav = useContext(OpenNavContext);
  return (
    <button className="nav-button" onClick={openNav} aria-label="Abrir servidores e canais" title="Canais">
      <MenuIcon size={24} />
    </button>
  );
}
