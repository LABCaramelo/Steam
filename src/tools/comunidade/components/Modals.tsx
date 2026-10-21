import { useEffect, useState } from 'react';
import { CameraIcon, ChevronRight, Close, Hash, Plus, Speaker } from '../icons';
import { createServer, iconFromFile, inviteLink, makeChannel, parseInvite, TEMPLATES, type Template } from '../servers';
import type { Action } from '../store';
import type { ChannelKind, Server } from '../types';

/** Moldura comum: fundo escuro, fecha com Esc ou clicando fora. */
function ModalShell({
  label,
  onClose,
  className = '',
  children,
}: {
  label: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fechar" title="Fechar">
          <Close size={24} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- criar / entrar em servidor */

type Step = 'start' | 'about' | 'customize' | 'join';

export function AddServerModal({
  invite,
  profileName,
  dispatch,
}: {
  /** Código ou link de convite; presente quando o modal abre direto em "Entrar em um servidor". */
  invite?: string;
  profileName: string;
  dispatch: (a: Action) => void;
}) {
  const [step, setStep] = useState<Step>(invite !== undefined ? 'join' : 'start');
  const [template, setTemplate] = useState<Template>(TEMPLATES[0]);
  const [community, setCommunity] = useState(false);
  const close = () => dispatch({ type: 'closeModal' });

  return (
    <ModalShell label="Adicionar um servidor" onClose={close} className="add-server">
      {step === 'start' && (
        <>
          <div className="dialog-head">
            <h2>Criar seu servidor</h2>
            <p>Seu servidor é onde você e seus amigos se reúnem. Crie o seu e comece a interagir.</p>
          </div>
          <div className="dialog-body template-list">
            <TemplateButton
              template={TEMPLATES[0]}
              onClick={() => {
                setTemplate(TEMPLATES[0]);
                setStep('about');
              }}
            />
            <h3 className="dialog-section">Começar de um molde</h3>
            {TEMPLATES.slice(1).map((t) => (
              <TemplateButton
                key={t.id}
                template={t}
                onClick={() => {
                  setTemplate(t);
                  setStep('about');
                }}
              />
            ))}
          </div>
          <div className="dialog-foot column">
            <h3>Já tem um convite?</h3>
            <button className="button secondary wide" onClick={() => setStep('join')}>
              Entrar em um servidor
            </button>
          </div>
        </>
      )}

      {step === 'about' && (
        <>
          <div className="dialog-head">
            <h2>Conte-nos mais sobre o seu servidor</h2>
            <p>
              Para podermos te ajudar com as configurações, seu novo servidor é para alguns amigos ou uma grande
              comunidade?
            </p>
          </div>
          <div className="dialog-body template-list">
            {[
              { label: 'Para um clube ou comunidade', emoji: '🌐', value: true },
              { label: 'Para meus amigos e eu', emoji: '👥', value: false },
            ].map((o) => (
              <button
                key={o.label}
                className="template-button"
                onClick={() => {
                  setCommunity(o.value);
                  setStep('customize');
                }}
              >
                <span className="template-emoji">{o.emoji}</span>
                <span>{o.label}</span>
                <ChevronRight size={20} />
              </button>
            ))}
            <p className="dialog-note">
              Não sabe? Você pode{' '}
              <button className="link-button" onClick={() => setStep('customize')}>
                pular essa pergunta
              </button>{' '}
              por enquanto.
            </p>
          </div>
          <div className="dialog-foot">
            <button className="button text" onClick={() => setStep('start')}>
              Voltar
            </button>
          </div>
        </>
      )}

      {step === 'customize' && (
        <CustomizeStep
          defaultName={`Servidor de ${profileName || 'você'}`}
          onBack={() => setStep('about')}
          onCreate={(name, icon) => dispatch({ type: 'createServer', server: createServer(template, name, icon, community) })}
        />
      )}

      {step === 'join' && (
        <JoinStep
          initial={invite ?? ''}
          onBack={() => setStep('start')}
          onJoin={(server) => dispatch({ type: 'createServer', server })}
        />
      )}
    </ModalShell>
  );
}

function TemplateButton({ template, onClick }: { template: Template; onClick: () => void }) {
  return (
    <button className="template-button" onClick={onClick}>
      <span className="template-emoji">{template.emoji}</span>
      <span>{template.name}</span>
      <ChevronRight size={20} />
    </button>
  );
}

function CustomizeStep({
  defaultName,
  onBack,
  onCreate,
}: {
  defaultName: string;
  onBack: () => void;
  onCreate: (name: string, icon?: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [icon, setIcon] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onCreate(name, icon);
      }}
    >
      <div className="dialog-head">
        <h2>Personalize o seu servidor</h2>
        <p>Deixe seu novo servidor com a sua cara dando um nome e um ícone a ele. Se quiser, é possível mudar depois.</p>
      </div>
      <div className="dialog-body">
        <label className="icon-upload" title="Enviar ícone">
          {icon ? (
            <img src={icon} alt="Ícone do servidor" />
          ) : (
            <>
              <CameraIcon size={24} />
              <span>Enviar</span>
            </>
          )}
          <span className="icon-upload-plus">
            <Plus size={16} />
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              iconFromFile(file)
                .then((url) => {
                  setIcon(url);
                  setError(null);
                })
                .catch(() => setError('Não deu para usar essa imagem.'));
            }}
          />
        </label>
        {error && <p className="field-error center">{error}</p>}
        <label className="field-label" htmlFor="server-name">
          Nome do servidor <span className="required">*</span>
        </label>
        <input
          id="server-name"
          className="field-input"
          value={name}
          maxLength={100}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        <p className="dialog-small">Ao criar um servidor, você concorda com as diretrizes da comunidade.</p>
      </div>
      <div className="dialog-foot">
        <button type="button" className="button text" onClick={onBack}>
          Voltar
        </button>
        <button type="submit" className="button brand" disabled={!name.trim()}>
          Criar
        </button>
      </div>
    </form>
  );
}

function JoinStep({
  initial,
  onBack,
  onJoin,
}: {
  initial: string;
  onBack: () => void;
  onJoin: (server: Server) => void;
}) {
  const [value, setValue] = useState(initial);
  const [tried, setTried] = useState(false);
  const server = parseInvite(value);
  const channels = server?.categories.flatMap((c) => c.channels) ?? [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (server) onJoin(server);
      }}
    >
      <div className="dialog-head">
        <h2>Entrar em um servidor</h2>
        <p>Insira um convite abaixo para entrar em um servidor existente</p>
      </div>
      <div className="dialog-body">
        <label className="field-label" htmlFor="invite-link">
          Link de convite <span className="required">*</span>
        </label>
        <input
          id="invite-link"
          className="field-input"
          value={value}
          autoFocus
          placeholder={`${location.origin}/?convite=…`}
          onChange={(e) => setValue(e.target.value)}
        />
        {tried && !server && <p className="field-error">O convite é inválido ou está incompleto.</p>}
        {server ? (
          <div className="invite-preview">
            <span className="invite-preview-icon" style={{ background: server.color }}>
              {server.icon ? <img src={server.icon} alt="" /> : server.acronym}
            </span>
            <span>
              <strong>{server.name}</strong>
              <span className="invite-preview-sub">
                {channels.filter((c) => c.kind !== 'voice').length} canais de texto ·{' '}
                {channels.filter((c) => c.kind === 'voice').length} de voz
              </span>
            </span>
          </div>
        ) : (
          <>
            <h3 className="dialog-section">Convites devem ser mais ou menos assim</h3>
            <p className="dialog-small">{location.origin}/?convite=eyJ2IjoxLCJpZCI6...</p>
          </>
        )}
      </div>
      <div className="dialog-foot">
        <button type="button" className="button text" onClick={onBack}>
          Voltar
        </button>
        <button type="submit" className="button brand" disabled={!value.trim()}>
          Entrar no servidor
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------- convidar */

export function InviteModal({ server, dispatch }: { server: Server; dispatch: (a: Action) => void }) {
  const link = inviteLink(server);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <ModalShell label={`Convidar para ${server.name}`} onClose={() => dispatch({ type: 'closeModal' })} className="left">
      <div className="dialog-head">
        <h2>Convide amigos para {server.name}</h2>
      </div>
      <div className="dialog-body">
        <label className="field-label" htmlFor="invite-out">
          Envie este link de convite para um amigo
        </label>
        <div className="copy-field">
          <input id="invite-out" value={link} readOnly onFocus={(e) => e.target.select()} />
          <button
            className={`button ${copied ? 'green' : 'brand'}`}
            onClick={() => {
              void navigator.clipboard
                ?.writeText(link)
                .then(() => setCopied(true))
                .catch(() => {});
            }}
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <p className="dialog-small">
          Quem abrir o link entra numa cópia deste servidor com os mesmos canais. As salas de voz e o chat delas são
          compartilhados; os canais de texto ainda ficam só no navegador de cada um.
        </p>
      </div>
    </ModalShell>
  );
}

/* ---------------------------------------------------------------- criar canal */

export function CreateChannelModal({
  server,
  categoryId,
  dispatch,
}: {
  server: Server;
  categoryId: string | null;
  dispatch: (a: Action) => void;
}) {
  const [kind, setKind] = useState<ChannelKind>('text');
  const [name, setName] = useState('');
  const category = server.categories.find((c) => c.id === categoryId) ?? server.categories[0];
  const kinds: { kind: ChannelKind; label: string; hint: string; icon: React.ReactNode }[] = [
    { kind: 'text', label: 'Texto', hint: 'Envie mensagens, imagens, opiniões e piadas', icon: <Hash size={24} /> },
    { kind: 'voice', label: 'Voz', hint: 'Converse com voz, vídeo e compartilhamento de tela', icon: <Speaker size={24} /> },
  ];

  return (
    <ModalShell label="Criar canal" onClose={() => dispatch({ type: 'closeModal' })} className="left">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          dispatch({ type: 'createChannel', serverId: server.id, categoryId: category?.id ?? null, channel: makeChannel(name, kind) });
        }}
      >
        <div className="dialog-head">
          <h2>Criar canal</h2>
          {category && <p>em {category.name}</p>}
        </div>
        <div className="dialog-body">
          <span className="field-label">Tipo de canal</span>
          <div className="radio-cards" role="radiogroup" aria-label="Tipo de canal">
            {kinds.map((k) => (
              <button
                key={k.kind}
                type="button"
                role="radio"
                aria-checked={kind === k.kind}
                className={`radio-card ${kind === k.kind ? 'checked' : ''}`}
                onClick={() => setKind(k.kind)}
              >
                <span className="radio-card-icon">{k.icon}</span>
                <span className="radio-card-text">
                  <strong>{k.label}</strong>
                  <span>{k.hint}</span>
                </span>
                <span className="radio-dot" />
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="channel-name">
            Nome do canal
          </label>
          <div className="field-with-icon">
            {kind === 'voice' ? <Speaker size={16} /> : <Hash size={16} />}
            <input
              id="channel-name"
              value={name}
              maxLength={100}
              autoFocus
              placeholder={kind === 'voice' ? 'Nova sala' : 'novo-canal'}
              onChange={(e) => setName(kind === 'voice' ? e.target.value : e.target.value.toLowerCase().replace(/\s/g, '-'))}
            />
          </div>
        </div>
        <div className="dialog-foot">
          <button type="button" className="button text" onClick={() => dispatch({ type: 'closeModal' })}>
            Cancelar
          </button>
          <button type="submit" className="button brand" disabled={!name.trim()}>
            Criar canal
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ---------------------------------------------------------------- confirmação */

export function ConfirmModal({
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell label={title} onClose={onClose} className="left">
      <div className="dialog-head">
        <h2>{title}</h2>
      </div>
      <div className="dialog-body">
        <p className="dialog-text">{children}</p>
      </div>
      <div className="dialog-foot">
        <button className="button text" onClick={onClose}>
          Cancelar
        </button>
        <button className="button danger" onClick={onConfirm} autoFocus>
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
