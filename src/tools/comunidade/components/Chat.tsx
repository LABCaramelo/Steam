import { Fragment, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react';
import {
  checkFiles,
  deleteBlobs,
  formatBytes,
  isImage,
  isVideo,
  storeFiles,
  useAttachmentUrl,
} from '../attachments';
import { ME, users } from '../data';
import { Bell, Close, Emoji, FileIcon, Members, Pin, Plus, Search, Threads, Trash } from '../icons';
import type { Action } from '../store';
import type { Attachment, Message, User } from '../types';
import { NavButton, SettingsContext } from '../ui';
import { memberUser } from '../voice';
import { Avatar } from './Avatar';
import '../chat-interactions.css';

/** Mensagens do mesmo autor com menos de 7 minutos de intervalo são agrupadas. */
const GROUP_WINDOW_MS = 7 * 60_000;

interface Props {
  conversationId: string;
  title: string;
  icon: React.ReactNode;
  topic?: string;
  placeholder: string;
  welcome: React.ReactNode;
  messages: Message[];
  showMembers: boolean;
  membersToggle: boolean;
  dispatch: (a: Action) => void;
}

export function Chat(p: Props) {
  const [panel, setPanel] = useState<'search' | 'pins' | null>(null);
  const [query, setQuery] = useState('');
  const [jump, setJump] = useState<{ id: string; sequence: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const pinsRef = useRef<HTMLButtonElement>(null);
  const panelId = `chat-panel-${p.conversationId}`;

  useEffect(() => {
    setPanel(null);
    setQuery('');
    setJump(null);
  }, [p.conversationId]);

  const closePanel = () => {
    const previous = panel;
    setPanel(null);
    setQuery('');
    if (previous === 'pins') pinsRef.current?.focus();
    else searchRef.current?.focus();
  };
  const normalizedQuery = normalizeSearch(query.trim());
  const panelMessages = p.messages.filter((message) => panel === 'pins'
    ? message.pinned
    : normalizedQuery && normalizeSearch([message.content, ...(message.attachments?.map((a) => a.name) ?? [])].join(' ')).includes(normalizedQuery)
  ).reverse();

  return (
    <main className="chat" onKeyDown={(e) => {
      if (e.key === 'Escape' && panel) {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
      }
    }}>
      <header className="chat-header">
        <NavButton />
        <span className="chat-header-icon">{p.icon}</span>
        <h1 className="chat-header-title">{p.title}</h1>
        {p.topic && (
          <>
            <span className="chat-header-divider" />
            <span className="chat-header-topic">{p.topic}</span>
          </>
        )}
        <div className="chat-header-tools">
          {p.membersToggle && (
            <button className="optional" title="Threads" aria-label="Threads">
              <Threads size={24} />
            </button>
          )}
          <button className="optional" title="Notificações" aria-label="Notificações">
            <Bell size={24} />
          </button>
          <button
            ref={pinsRef}
            className={`chat-pins-toggle ${panel === 'pins' ? 'on' : ''}`}
            title="Mensagens fixadas"
            aria-label="Mensagens fixadas"
            aria-expanded={panel === 'pins'}
            aria-controls={panel === 'pins' ? panelId : undefined}
            onClick={() => setPanel((current) => current === 'pins' ? null : 'pins')}
          >
            <Pin size={24} />
          </button>
          {p.membersToggle && (
            <button
              className={`members-toggle ${p.showMembers ? 'on' : ''}`}
              onClick={() => p.dispatch({ type: 'toggleMembers' })}
              title="Lista de membros"
              aria-label="Lista de membros"
              aria-pressed={p.showMembers}
            >
              <Members size={24} />
            </button>
          )}
          <label className="header-search chat-local-search">
            <input
              ref={searchRef}
              placeholder="Buscar"
              aria-label="Buscar mensagens nesta conversa"
              aria-controls={panel === 'search' ? panelId : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPanel('search');
              }}
              onClick={() => setPanel('search')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setPanel('search');
              }}
            />
            {query ? <button type="button" title="Limpar busca" aria-label="Limpar busca" onClick={() => {
              setQuery('');
              searchRef.current?.focus();
            }}><Close size={14} /></button> : <Search size={16} />}
          </label>
        </div>
      </header>

      <div className="chat-body">
      <Conversation
        conversationId={p.conversationId}
        title={p.title}
        welcome={p.welcome}
        messages={p.messages}
        placeholder={p.placeholder}
        onSend={async (content, files) => {
          const attachments = files.length ? await storeFiles(files) : undefined;
          p.dispatch({ type: 'send', conversationId: p.conversationId, content, attachments });
        }}
        onDelete={(id) => p.dispatch({ type: 'delete', conversationId: p.conversationId, messageId: id })}
        onEdit={(id, content) => p.dispatch({ type: 'edit', conversationId: p.conversationId, messageId: id, content })}
        onPin={(id) => p.dispatch({ type: 'togglePin', conversationId: p.conversationId, messageId: id })}
        jump={jump}
      />
      {panel && (
        <aside className="chat-message-panel" id={panelId} aria-label={panel === 'pins' ? 'Mensagens fixadas' : 'Resultados da busca'}>
          <div className="chat-message-panel-header">
            <h2>{panel === 'pins' ? 'Mensagens fixadas' : 'Resultados da busca'}</h2>
            <button type="button" title="Fechar painel" aria-label="Fechar painel" onClick={closePanel}><Close size={20} /></button>
          </div>
          <p className="chat-panel-summary" role="status">
            {panel === 'search' && !normalizedQuery ? 'Busque por texto ou nome de arquivo.' : `${panelMessages.length} ${panelMessages.length === 1 ? 'mensagem' : 'mensagens'}`}
          </p>
          <div className="chat-panel-results">
            {panelMessages.map((message) => (
              <button
                type="button"
                className="chat-panel-result"
                key={message.id}
                onClick={() => {
                  setJump((previous) => ({ id: message.id, sequence: (previous?.sequence ?? 0) + 1 }));
                  if (window.matchMedia('(max-width: 1100px)').matches) setPanel(null);
                }}
                aria-label={`Ir à mensagem de ${users[message.authorId]?.name ?? message.authorName ?? 'Alguém'}: ${message.content || 'Anexo'}`}
              >
                <span className="chat-panel-result-meta">
                  <strong>{users[message.authorId]?.name ?? message.authorName ?? 'Alguém'}</strong>
                  <time>{formatDateTime(message.timestamp)}</time>
                </span>
                {message.content && <span className="chat-panel-result-text">{message.content}</span>}
                {message.attachments?.map((attachment) => <span className="chat-panel-result-file" key={attachment.id}><FileIcon size={16} />{attachment.name}</span>)}
              </button>
            ))}
            {!panelMessages.length && (
              <div className="chat-panel-empty">
                {panel === 'pins' ? <Pin size={32} /> : <Search size={32} />}
                <strong>{panel === 'pins' ? 'Nenhuma mensagem fixada' : normalizedQuery ? 'Nenhuma mensagem encontrada' : 'Encontre uma mensagem'}</strong>
                <p>{panel === 'pins' ? 'Use o alfinete ao lado de uma mensagem para guardá-la aqui.' : normalizedQuery ? 'Experimente outro texto ou nome de arquivo nesta conversa.' : 'Os resultados desta conversa aparecerão aqui.'}</p>
              </div>
            )}
          </div>
          <p className="chat-panel-local-note">{panel === 'pins' ? 'Fixadas neste navegador.' : 'Buscando apenas nesta conversa.'}</p>
        </aside>
      )}
      </div>
    </main>
  );
}

function normalizeSearch(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
}

interface ConversationProps {
  conversationId: string;
  /** Nome da conversa, para o aviso de soltar arquivos. */
  title: string;
  welcome: React.ReactNode;
  messages: Message[];
  placeholder: string;
  /** Mostra a caixa de envio, mas sem deixar escrever. */
  disabled?: boolean;
  onSend: (content: string, files: File[]) => Promise<void>;
  /** Sem esta função, suas mensagens não podem ser apagadas. */
  onDelete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onPin?: (id: string) => void;
  jump?: { id: string; sequence: number } | null;
}

/** Mensagens e caixa de envio, usadas nos canais de texto e no chat das salas de voz. */
export function Conversation(p: ConversationProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Quem está no fim da conversa continua no fim; quem rolou para ler o histórico não é puxado.
  const stickToEnd = useRef(true);
  const addFilesRef = useRef<(files: File[]) => void>(() => {});
  const [dragDepth, setDragDepth] = useState(0);
  const [viewing, setViewing] = useState<{ attachment: Attachment; url: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const scrollToEnd = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useLayoutEffect(() => {
    stickToEnd.current = true;
    setEditingId(null);
    setHighlightedId(null);
  }, [p.conversationId]);

  useEffect(() => {
    if (editingId && !p.messages.some((message) => message.id === editingId)) setEditingId(null);
  }, [editingId, p.messages]);

  useEffect(() => {
    if (!p.jump) return;
    const message = Array.from(contentRef.current?.querySelectorAll<HTMLElement>('[data-message-id]') ?? [])
      .find((element) => element.dataset.messageId === p.jump!.id);
    if (!message) return;
    stickToEnd.current = false;
    setHighlightedId(p.jump.id);
    const reducedMotion = document.documentElement.dataset.reducedMotion === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    message.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    message.focus({ preventScroll: true });
    const timer = window.setTimeout(() => setHighlightedId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [p.jump]);

  const startEdit = (id: string) => {
    if (!p.onEdit || p.disabled || p.messages.find((message) => message.id === id)?.authorId !== ME) return;
    stickToEnd.current = false;
    setEditingId(id);
  };
  const finishEdit = () => {
    setEditingId(null);
    rootRef.current?.querySelector<HTMLTextAreaElement>('.composer textarea')?.focus();
  };

  const last = p.messages[p.messages.length - 1];
  useLayoutEffect(() => {
    if (stickToEnd.current || last?.authorId === ME) {
      stickToEnd.current = true;
      scrollToEnd();
    }
  }, [p.conversationId, p.messages.length, last?.authorId]);

  // Imagens que terminam de carregar mudam a altura da conversa depois da mensagem chegar.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => stickToEnd.current && scrollToEnd());
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  const hasFiles = (e: React.DragEvent) => !p.disabled && e.dataTransfer.types.includes('Files');
  const onDelete =
    p.onDelete &&
    ((id: string) => {
      deleteBlobs(p.messages.find((m) => m.id === id)?.attachments);
      p.onDelete!(id);
    });

  return (
    <div
      ref={rootRef}
      className="conversation"
      onDragEnter={(e) => hasFiles(e) && setDragDepth((d) => d + 1)}
      onDragLeave={(e) => hasFiles(e) && setDragDepth((d) => Math.max(0, d - 1))}
      onDragOver={(e) => hasFiles(e) && e.preventDefault()}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragDepth(0);
        addFilesRef.current([...e.dataTransfer.files]);
      }}
    >
      <div
        ref={scrollRef}
        className="messages"
        role="log"
        aria-live="polite"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div ref={contentRef} className="messages-content">
          <div className="messages-welcome">{p.welcome}</div>
          <MessageList
            messages={p.messages}
            onDelete={onDelete}
            onPin={p.disabled ? undefined : p.onPin}
            onStartEdit={p.onEdit && !p.disabled ? startEdit : undefined}
            editingId={editingId}
            highlightedId={highlightedId}
            onSaveEdit={(id, content) => {
              p.onEdit?.(id, content);
              finishEdit();
            }}
            onCancelEdit={finishEdit}
            onOpen={(attachment, url) => setViewing({ attachment, url })}
          />
        </div>
      </div>

      <Composer
        key={p.conversationId}
        conversationId={p.conversationId}
        placeholder={p.placeholder}
        disabled={p.disabled}
        onSend={p.onSend}
        addFilesRef={addFilesRef}
        onEditLast={p.onEdit && !p.disabled ? () => {
          const ownLast = [...p.messages].reverse().find((message) => message.authorId === ME);
          if (ownLast) startEdit(ownLast.id);
        } : undefined}
      />

      {dragDepth > 0 && (
        <div className="drop-overlay">
          <div className="drop-card">
            <FileIcon size={40} />
            <strong>Enviar para {p.title}</strong>
            <span>Solte os arquivos para anexar à mensagem.</span>
          </div>
        </div>
      )}
      {viewing && <Lightbox {...viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function MessageList({
  messages,
  onDelete,
  onPin,
  onStartEdit,
  editingId,
  highlightedId,
  onSaveEdit,
  onCancelEdit,
  onOpen,
}: {
  messages: Message[];
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onStartEdit?: (id: string) => void;
  editingId: string | null;
  highlightedId: string | null;
  onSaveEdit: (id: string, content: string) => void;
  onCancelEdit: () => void;
  onOpen: (a: Attachment, url: string) => void;
}) {
  const { compactMessages: compact } = useContext(SettingsContext);
  return (
    <>
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || !sameDay(prev.timestamp, m.timestamp);
        const grouped = !!prev && !newDay && prev.authorId === m.authorId && m.timestamp - prev.timestamp < GROUP_WINDOW_MS;
        // Quem fala nas salas de voz não está no diretório local: usa o nome que veio com a mensagem.
        const author =
          users[m.authorId] ?? memberUser({ identity: m.authorId, name: m.authorName ?? 'Alguém', color: m.authorColor });
        const name = (
          <span className="message-author" style={{ color: author.color }}>
            {author.name}
          </span>
        );
        const body = (
          <>
            {editingId === m.id ? (
              <InlineMessageEditor message={m} onSave={(content) => onSaveEdit(m.id, content)} onCancel={onCancelEdit} />
            ) : (m.content || m.editedAt) ? (
              <div className="message-content">
                <RichText text={m.content} />
                {m.editedAt ? <span className="message-edited" title={`Editada em ${formatDateTime(m.editedAt)}`}>(editado)</span> : null}
              </div>
            ) : null}
            {m.attachments?.length ? <Attachments items={m.attachments} onOpen={onOpen} /> : null}
          </>
        );
        const interactionClass = `${highlightedId === m.id ? ' message-jump-highlight' : ''}${editingId === m.id ? ' message-editing' : ''}`;
        const actions = <MessageActions message={m} onDelete={onDelete} onPin={onPin} onStartEdit={onStartEdit} />;
        return (
          <Fragment key={m.id}>
            {newDay && (
              <div className="day-divider">
                <span>{formatDay(m.timestamp)}</span>
              </div>
            )}
            {compact ? (
              <article className={`message compact${interactionClass}`} data-message-id={m.id} tabIndex={-1}>
                <time className="message-time">{formatTime(m.timestamp)}</time>
                <div className="message-body">
                  {name}
                  {author.bot && <span className="bot-tag">APP</span>}
                  {body}
                </div>
                {actions}
              </article>
            ) : (
              <article className={`message ${grouped ? 'grouped' : ''}${interactionClass}`} data-message-id={m.id} tabIndex={-1}>
                {grouped ? (
                  <time className="message-hover-time">{formatTime(m.timestamp)}</time>
                ) : (
                  <div className="message-avatar">
                    <Avatar user={author} size={40} />
                  </div>
                )}
                <div className="message-body">
                  {!grouped && (
                    <h3 className="message-meta">
                      {name}
                      {author.bot && <span className="bot-tag">APP</span>}
                      <time className="message-time">{formatDateTime(m.timestamp)}</time>
                    </h3>
                  )}
                  {body}
                </div>
                {actions}
              </article>
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function MessageActions({ message, onDelete, onPin, onStartEdit }: {
  message: Message;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onStartEdit?: (id: string) => void;
}) {
  const own = message.authorId === ME;
  if (!onPin && !(own && (onDelete || onStartEdit))) return null;
  return (
    <div className="message-actions" role="group" aria-label="Ações da mensagem">
      {onPin && <button
        onClick={() => onPin(message.id)}
        title={message.pinned ? 'Desfixar mensagem' : 'Fixar mensagem'}
        aria-label={message.pinned ? 'Desfixar mensagem' : 'Fixar mensagem'}
        aria-pressed={!!message.pinned}
      ><Pin size={18} /></button>}
      {own && onStartEdit && <button onClick={() => onStartEdit(message.id)} title="Editar mensagem" aria-label="Editar mensagem">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m17.3 3.3 3.4 3.4a1 1 0 0 1 0 1.4L9 19.8l-5 1.3a1 1 0 0 1-1.2-1.2l1.3-5L15.9 3.3a1 1 0 0 1 1.4 0ZM6 15.9l-.7 2.8 2.8-.7L17.6 8.5l-2.1-2.1L6 15.9Z" /></svg>
      </button>}
      {own && onDelete && <button className="message-delete" onClick={() => onDelete(message.id)} title="Excluir mensagem" aria-label="Excluir mensagem">
        <Trash size={18} />
      </button>}
    </div>
  );
}

function InlineMessageEditor({ message, onSave, onCancel }: {
  message: Message;
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(message.content);
  const ref = useRef<HTMLTextAreaElement>(null);
  const valid = !!value.trim() || !!message.attachments?.length;
  const save = () => {
    if (!valid) return;
    if (value === message.content) onCancel();
    else onSave(value);
  };
  useEffect(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(message.content.length, message.content.length);
    ref.current?.scrollIntoView({ block: 'nearest' });
  }, [message.id]);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 300)}px`;
  }, [value]);
  return (
    <form className="message-inline-editor" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <textarea
        ref={ref}
        value={value}
        rows={1}
        aria-label="Editar mensagem"
        aria-describedby={`edit-help-${message.id}`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          } else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          }
        }}
      />
      <div className="message-edit-footer">
        <span id={`edit-help-${message.id}`}>{valid ? 'Enter para salvar • Esc para cancelar' : 'Escreva uma mensagem para salvar.'}</span>
        <button type="button" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="message-edit-save" disabled={!valid}>Salvar</button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- anexos */

const IMAGE_BOX = { width: 400, height: 300 };

function Attachments({ items, onOpen }: { items: Attachment[]; onOpen: (a: Attachment, url: string) => void }) {
  return (
    <div className="attachments">
      {items.map((a) => (
        <AttachmentView key={a.id} attachment={a} onOpen={onOpen} />
      ))}
    </div>
  );
}

function AttachmentView({ attachment: a, onOpen }: { attachment: Attachment; onOpen: (a: Attachment, url: string) => void }) {
  const url = useAttachmentUrl(a.id);

  if (url === null) {
    return (
      <div className="attachment-file missing">
        <FileIcon size={28} />
        <span className="attachment-file-text">
          <span className="attachment-file-name">{a.name}</span>
          <span className="attachment-file-size">Arquivo indisponível neste navegador</span>
        </span>
      </div>
    );
  }

  if (isImage(a)) {
    // Reserva o espaço da imagem antes de carregar, para a conversa não pular.
    const w = a.width ?? IMAGE_BOX.width;
    const h = a.height ?? IMAGE_BOX.height;
    const scale = Math.min(1, IMAGE_BOX.width / w, IMAGE_BOX.height / h);
    return (
      <button
        className="attachment-image"
        style={{ width: Math.round(w * scale), aspectRatio: `${w} / ${h}` }}
        onClick={() => url && onOpen(a, url)}
        aria-label={`Ampliar ${a.name}`}
      >
        {url && <img src={url} alt={a.name} />}
      </button>
    );
  }

  if (isVideo(a) && url) {
    return <video className="attachment-video" src={url} controls preload="metadata" />;
  }

  return (
    <div className="attachment-file">
      <FileIcon size={28} />
      <span className="attachment-file-text">
        {url ? (
          <a className="attachment-file-name" href={url} download={a.name}>
            {a.name}
          </a>
        ) : (
          <span className="attachment-file-name">{a.name}</span>
        )}
        <span className="attachment-file-size">{formatBytes(a.size)}</span>
      </span>
    </div>
  );
}

function Lightbox({ attachment, url, onClose }: { attachment: Attachment; url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lightbox" role="dialog" aria-label={attachment.name} onClick={onClose}>
      <img src={url} alt={attachment.name} onClick={(e) => e.stopPropagation()} />
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span>{attachment.name}</span>
        <a href={url} download={attachment.name}>
          Baixar
        </a>
        <button onClick={onClose} aria-label="Fechar" title="Fechar">
          <Close size={20} />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- texto */

/** Links http(s), sem a pontuação que costuma vir colada no fim da frase. */
const URL_PATTERN = /https?:\/\/[^\s<]+[^\s<.,:;"')\]!?]/;
const TOKEN_PATTERN = new RegExp(`(\`[^\`]+\`|${URL_PATTERN.source}|${/@\w+/.source})`, 'g');

/** Destaca menções (@Nome), links e trechos `código`, preservando quebras de linha. */
function RichText({ text }: { text: string }) {
  const names = Object.values(users).map((u: User) => u.name);
  const parts = text.split(TOKEN_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={i} className="message-link" href={part} target="_blank" rel="noopener noreferrer">
              {part}
            </a>
          );
        }
        if (part.startsWith('@') && names.includes(part.slice(1))) {
          return (
            <span key={i} className="mention">
              {part}
            </span>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/* ---------------------------------------------------------------- caixa de mensagem */

interface PendingFile {
  id: string;
  file: File;
  preview?: string;
}

interface MessageDraft {
  value: string;
  files: PendingFile[];
  sending: boolean;
  error: string | null;
}

// Rascunhos de texto e anexos sobrevivem à troca de conversa durante esta sessão.
// Uma operação de envio continua ligada à conversa de origem até terminar.
const EMPTY_DRAFT: MessageDraft = { value: '', files: [], sending: false, error: null };
const messageDrafts = new Map<string, MessageDraft>();
const draftListeners = new Set<() => void>();
const subscribeDrafts = (listener: () => void) => {
  draftListeners.add(listener);
  return () => { draftListeners.delete(listener); };
};
const getDraft = (conversationId: string) => messageDrafts.get(conversationId) ?? EMPTY_DRAFT;
const updateDraft = (conversationId: string, update: (draft: MessageDraft) => MessageDraft) => {
  const next = update(getDraft(conversationId));
  if (next === EMPTY_DRAFT) messageDrafts.delete(conversationId);
  else messageDrafts.set(conversationId, next);
  draftListeners.forEach((listener) => listener());
};

function Composer({
  conversationId,
  placeholder,
  disabled,
  onSend,
  addFilesRef,
  onEditLast,
}: {
  conversationId: string;
  placeholder: string;
  disabled?: boolean;
  onSend: (content: string, files: File[]) => Promise<void>;
  /** Por onde a conversa entrega arquivos soltos sobre ela. */
  addFilesRef: MutableRefObject<(files: File[]) => void>;
  onEditLast?: () => void;
}) {
  const { value, files, error, sending } = useSyncExternalStore(subscribeDrafts, () => getDraft(conversationId));
  const setValue = (next: string | ((previous: string) => string)) => updateDraft(conversationId, (draft) => ({
    ...draft,
    value: typeof next === 'function' ? next(draft.value) : next,
  }));
  const blocked = disabled || sending;
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!blocked) ref.current?.focus();
  }, [blocked]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
  }, [value]);

  const addFiles = (list: File[]) => {
    const draft = getDraft(conversationId);
    if (disabled || draft.sending || !list.length) return;
    const problem = checkFiles([...draft.files.map((f) => f.file), ...list]);
    updateDraft(conversationId, (current) => ({
      ...current,
      error: problem,
      files: problem ? current.files : [
        ...current.files,
        ...list.map((file) => ({
          id: crypto.randomUUID(),
          file,
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        })),
      ],
    }));
    ref.current?.focus();
  };
  addFilesRef.current = addFiles;

  const removeFile = (id: string) => {
    const draft = getDraft(conversationId);
    if (disabled || draft.sending) return;
    const f = draft.files.find((x) => x.id === id);
    if (f?.preview) URL.revokeObjectURL(f.preview);
    updateDraft(conversationId, (current) => ({ ...current, files: current.files.filter((x) => x.id !== id) }));
  };

  const submit = async () => {
    const draft = getDraft(conversationId);
    if (disabled || draft.sending || (!draft.value.trim() && !draft.files.length)) return;
    updateDraft(conversationId, (current) => ({ ...current, sending: true, error: null }));
    try {
      await onSend(draft.value, draft.files.map((f) => f.file));
      updateDraft(conversationId, () => EMPTY_DRAFT);
      draft.files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      ref.current?.focus();
    } catch {
      updateDraft(conversationId, (current) => ({ ...current, sending: false, error: 'Não foi possível enviar. Seu rascunho foi mantido; tente novamente.' }));
    }
  };

  return (
    <form
      className="composer"
      aria-busy={sending}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {error && <p className="composer-error" role="alert">{error}</p>}
      {sending && <p className="composer-sending" role="status">Enviando mensagem…</p>}
      <div className={`composer-box ${blocked ? 'disabled' : ''}`}>
        {files.length > 0 && (
          <ul className="composer-files">
            {files.map((f) => (
              <li key={f.id} className="composer-file">
                {f.preview ? <img src={f.preview} alt="" /> : <FileIcon size={40} />}
                <span className="composer-file-name">{f.file.name}</span>
                <button type="button" disabled={blocked} onClick={() => removeFile(f.id)} aria-label={`Remover ${f.file.name}`} title="Remover">
                  <Trash size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="composer-row">
          <button
            type="button"
            className="composer-attach"
            aria-label="Enviar arquivo"
            title="Enviar arquivo"
            disabled={blocked}
            onClick={() => fileInput.current?.click()}
          >
            <Plus size={20} />
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            disabled={blocked}
            onChange={(e) => {
              addFiles([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
          <textarea
            ref={ref}
            rows={1}
            value={value}
            disabled={blocked}
            placeholder={placeholder}
            aria-label={placeholder}
            onChange={(e) => setValue(e.target.value)}
            onPaste={(e) => {
              const pasted = [...e.clipboardData.files];
              if (!pasted.length) return;
              e.preventDefault();
              addFiles(pasted);
            }}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra a linha.
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              } else if (e.key === 'ArrowUp' && !value.trim() && !files.length && onEditLast) {
                e.preventDefault();
                onEditLast();
              }
            }}
          />
          <div className="composer-tools">
            <button type="button" aria-label="Emoji" disabled={blocked} onClick={() => setValue((v) => v + '😄')}>
              <Emoji size={24} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- datas */

function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(ts, now.getTime())) return `Hoje às ${formatTime(ts)}`;
  if (sameDay(ts, yesterday.getTime())) return `Ontem às ${formatTime(ts)}`;
  return `${d.toLocaleDateString('pt-BR')} ${formatTime(ts)}`;
}
