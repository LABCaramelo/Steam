import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { directMessages, users } from '../data';
import { Close, Hash, Megaphone, Search, Speaker } from '../icons';
import type { Server } from '../types';
import { Avatar } from './Avatar';
import '../quick-switcher.css';

export type QuickDestination =
  | { kind: 'channel'; serverId: string; channelId: string }
  | { kind: 'server'; serverId: string }
  | { kind: 'dm'; dmId: string };

interface Result {
  id: string;
  name: string;
  context: string;
  icon: React.ReactNode;
  destination: QuickDestination;
}

interface Props {
  servers: Server[];
  returnFocus: HTMLElement | null;
  onClose: () => void;
  onSelect: (destination: QuickDestination) => void;
}

/** A busca ignora maiúsculas e acentos, sem interpretar o texto como expressão regular. */
function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function QuickSwitcher({ servers, returnFocus, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const listId = `${id}-results`;
  const titleId = `${id}-title`;
  const hintId = `${id}-hint`;

  const results = useMemo(() => {
    const candidates: Result[] = [];
    for (const server of servers) {
      for (const category of server.categories) {
        for (const channel of category.channels) {
          candidates.push({
            id: `channel:${server.id}:${channel.id}`,
            name: channel.name,
            context: `${server.name} · ${category.name}${channel.kind === 'voice' ? ' · Canal de voz' : ''}`,
            icon: channel.kind === 'voice' ? <Speaker size={24} /> : channel.kind === 'announcement' ? <Megaphone size={24} /> : <Hash size={24} />,
            destination: { kind: 'channel', serverId: server.id, channelId: channel.id },
          });
        }
      }
    }
    for (const dm of directMessages) {
      const user = users[dm.userId];
      if (!user) continue;
      candidates.push({
        id: `dm:${dm.id}`,
        name: user.name,
        context: 'Mensagem direta',
        icon: <Avatar user={user} size={28} status={user.status} ring="var(--bg-primary)" />,
        destination: { kind: 'dm', dmId: dm.id },
      });
    }
    for (const server of servers) {
      candidates.push({
        id: `server:${server.id}`,
        name: server.name,
        context: 'Servidor',
        icon: server.icon ? <img className="quick-switcher-server" src={server.icon} alt="" /> : <span className="quick-switcher-server" style={{ background: server.color }}>{server.acronym}</span>,
        destination: { kind: 'server', serverId: server.id },
      });
    }

    const normalized = normalize(query);
    const prefix = normalized[0];
    const term = (prefix === '#' || prefix === '@' ? normalized.slice(1) : normalized).trim();
    const words = term.split(/\s+/).filter(Boolean);
    return candidates
      .filter((result) => (prefix !== '#' || result.destination.kind === 'channel') && (prefix !== '@' || result.destination.kind === 'dm'))
      .filter((result) => words.every((word) => normalize(`${result.name} ${result.context}`).includes(word)))
      .map((result, order) => {
        const name = normalize(result.name);
        const score = !term ? 0 : name === term ? 0 : name.startsWith(term) ? 1 : name.includes(term) ? 2 : 3;
        return { result, score, order };
      })
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .map(({ result }) => result);
  }, [servers, query]);

  const selectedIndex = results.length ? Math.min(active, results.length - 1) : -1;
  const activeOptionId = selectedIndex >= 0 ? `${id}-option-${selectedIndex}` : undefined;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // showModal coloca o diálogo acima do app e torna o conteúdo de fundo inerte.
    dialog.showModal();
    inputRef.current?.focus();
    return () => {
      dialog.close();
      const trigger = returnFocus?.isConnected
        ? returnFocus
        : document.querySelector<HTMLElement>('.search-trigger, [aria-label="Configurações de usuário"]');
      trigger?.focus();
    };
  }, [returnFocus]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, query, results.length]);

  return (
    <dialog
      ref={dialogRef}
      className="quick-switcher"
      aria-labelledby={titleId}
      aria-describedby={hintId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (results.length) setActive((index) => (Math.min(index, results.length - 1) + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
          inputRef.current?.focus();
        } else if (event.key === 'Enter' && event.target === inputRef.current) {
          event.preventDefault();
          if (selectedIndex >= 0) onSelect(results[selectedIndex].destination);
        } else if (event.key === 'Tab') {
          // Mantém o ciclo entre a busca e o botão de fechar também com Shift+Tab.
          const stops = [...event.currentTarget.querySelectorAll<HTMLElement>('input, button:not([disabled])')];
          const first = stops[0];
          const last = stops[stops.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="quick-switcher-heading">
        <h2 id={titleId}>Encontre ou comece uma conversa</h2>
        <button type="button" className="quick-switcher-close" onClick={onClose} aria-label="Fechar busca rápida" title="Fechar (Esc)">
          <Close size={20} />
        </button>
      </div>
      <div className="quick-switcher-search">
        <Search size={22} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          role="combobox"
          aria-label="Buscar canais, servidores e mensagens diretas"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeOptionId}
          aria-describedby={hintId}
          placeholder="Buscar canais, servidores ou pessoas"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div className="quick-switcher-results" id={listId} role="listbox" aria-label="Resultados da busca">
        {results.map((result, index) => (
          <div
            key={result.id}
            id={`${id}-option-${index}`}
            ref={index === selectedIndex ? activeRef : undefined}
            role="option"
            aria-selected={index === selectedIndex}
            className={`quick-switcher-result ${index === selectedIndex ? 'selected' : ''}`}
            onMouseEnter={() => setActive(index)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(result.destination)}
          >
            <span className="quick-switcher-result-icon">{result.icon}</span>
            <span className="quick-switcher-result-text">
              <strong>{result.name}</strong>
              <span>{result.context}</span>
            </span>
            {index === selectedIndex && <span className="quick-switcher-enter" aria-hidden="true">↵</span>}
          </div>
        ))}
      </div>
      {!results.length && (
        <div className="quick-switcher-empty">
          <Search size={32} />
          <strong>Nenhum resultado encontrado</strong>
          <p>Tente outro nome de canal, servidor ou pessoa.</p>
        </div>
      )}
      <span className="quick-switcher-sr-only" role="status" aria-live="polite">{results.length} {results.length === 1 ? 'resultado disponível' : 'resultados disponíveis'}</span>
      <footer className="quick-switcher-hint" id={hintId}>
        <span><kbd>↑</kbd> <kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir · <kbd>Esc</kbd> fechar</span>
        <span>Use <b>#</b> para canais ou <b>@</b> para pessoas</span>
      </footer>
    </dialog>
  );
}
