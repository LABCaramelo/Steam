import { useCallback, useEffect, useRef, useState } from 'react';
import { ME, users } from '../data';
import { ArrowLeft, Check, Close, DoorExit, Search } from '../icons';
import type { Action, Profile, Settings as SettingsState, SettingsSection, Theme } from '../store';
import type { Status } from '../types';
import { colorFor, PALETTE } from '../voice';
import { Avatar, statusLabel } from './Avatar';

interface Props {
  section: SettingsSection;
  profile: Profile;
  settings: SettingsState;
  myStatus: Status;
  dispatch: (a: Action) => void;
}

const NAV: { group: string; items: { id: SettingsSection; label: string }[] }[] = [
  {
    group: 'Geral',
    items: [
      { id: 'conta', label: 'Conta' },
      { id: 'perfis', label: 'Perfis' },
      { id: 'notificacoes', label: 'Notificações' },
    ],
  },
  {
    group: 'Experiência',
    items: [
      { id: 'voz', label: 'Voz e vídeo' },
      { id: 'aparencia', label: 'Aparência' },
      { id: 'acessibilidade', label: 'Acessibilidade' },
    ],
  },
];

const TITLES = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.id, i.label]))) as Record<SettingsSection, string>;

/**
 * Configurações de usuário, no formato do Discord atual: um painel sobre o app com a
 * navegação à esquerda. No celular, a navegação e a página aparecem uma de cada vez.
 */
export function SettingsView({ section, profile, settings, myStatus, dispatch }: Props) {
  const [query, setQuery] = useState('');
  // Pela engrenagem (Conta) o celular mostra a lista primeiro; por um atalho, já a página.
  const [mobilePage, setMobilePage] = useState<'nav' | 'content'>(section === 'conta' ? 'nav' : 'content');
  const close = useCallback(() => dispatch({ type: 'closeModal' }), [dispatch]);
  const open = (s: SettingsSection) => {
    dispatch({ type: 'openModal', modal: { kind: 'settings', section: s } });
    setMobilePage('content');
  };
  const update = (patch: Partial<SettingsState>) => dispatch({ type: 'updateSettings', patch });
  const me = users[ME];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const q = query.trim().toLowerCase();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) })).filter(
    (g) => g.items.length,
  );

  return (
    <div className="settings-layer" onMouseDown={close}>
      <div
        className="settings"
        data-page={mobilePage}
        role="dialog"
        aria-modal="true"
        aria-label="Configurações de usuário"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <nav className="settings-nav" aria-label="Barra lateral de configurações">
          <div className="settings-nav-head">
            <button className="settings-me" onClick={() => open('perfis')}>
              <Avatar user={me} size={40} />
              <span>
                <strong>{me.name}</strong>
                <span>Editar perfil</span>
              </span>
            </button>
            <button className="settings-close mobile-only" onClick={close} aria-label="Fechar configurações">
              <Close size={24} />
            </button>
          </div>
          <label className="settings-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" aria-label="Buscar" />
          </label>
          <div className="settings-nav-scroll">
            {groups.map((g) => (
              <section key={g.group}>
                <h3>{g.group}</h3>
                {g.items.map((i) => (
                  <button
                    key={i.id}
                    className={`settings-nav-item ${i.id === section ? 'active' : ''}`}
                    aria-current={i.id === section ? 'page' : undefined}
                    onClick={() => open(i.id)}
                  >
                    {i.label}
                  </button>
                ))}
              </section>
            ))}
            {!groups.length && <p className="settings-empty">Nada encontrado.</p>}
            <div className="settings-separator" />
            <button className="settings-nav-item danger" onClick={() => dispatch({ type: 'openModal', modal: { kind: 'logout' } })}>
              Sair
              <DoorExit size={18} />
            </button>
            <p className="settings-version">Comunidade · LAB 0.1.0</p>
          </div>
        </nav>

        <section className="settings-content">
          <header className="settings-content-head">
            <button className="settings-back mobile-only" onClick={() => setMobilePage('nav')} aria-label="Voltar">
              <ArrowLeft size={24} />
            </button>
            <h2>{TITLES[section]}</h2>
            <button className="settings-close" onClick={close} aria-label="Fechar configurações" title="Fechar (Esc)">
              <Close size={24} />
            </button>
          </header>
          <div className="settings-scroll">
            <div className="settings-page">
              {section === 'conta' && <AccountPage profile={profile} myStatus={myStatus} dispatch={dispatch} />}
              {section === 'perfis' && <ProfilePage key={profile.id} profile={profile} dispatch={dispatch} />}
              {section === 'notificacoes' && <NotificationsPage settings={settings} update={update} />}
              {section === 'voz' && <VoicePage settings={settings} update={update} />}
              {section === 'aparencia' && <AppearancePage settings={settings} update={update} />}
              {section === 'acessibilidade' && <AccessibilityPage settings={settings} update={update} />}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

type Update = (patch: Partial<SettingsState>) => void;

/* ---------------------------------------------------------------- peças */

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <span className="setting-label">{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob">{checked && <Check size={12} />}</span>
      </button>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="setting-block">
      <span className="field-label">{label}</span>
      <span className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="slider-value">{value}%</span>
      </span>
    </label>
  );
}

/* ---------------------------------------------------------------- Conta */

function AccountPage({ profile, myStatus, dispatch }: { profile: Profile; myStatus: Status; dispatch: (a: Action) => void }) {
  const me = users[ME];
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      <div className="account-card">
        <div className="account-banner" style={{ background: me.color }} />
        <div className="account-card-head">
          <Avatar user={me} size={80} status={myStatus} ring="var(--bg-floating)" />
          <strong>{me.name}</strong>
          <button className="button brand small" onClick={() => dispatch({ type: 'openModal', modal: { kind: 'settings', section: 'perfis' } })}>
            Editar perfil
          </button>
        </div>
        <div className="account-rows">
          <div className="account-row">
            <span>
              <span className="field-label">Nome de exibição</span>
              <span>{me.name}</span>
            </span>
            <button className="button secondary small" onClick={() => dispatch({ type: 'openModal', modal: { kind: 'settings', section: 'perfis' } })}>
              Editar
            </button>
          </div>
          <div className="account-row">
            <span>
              <span className="field-label">ID de usuário</span>
              <span className="mono">{profile.id}</span>
            </span>
            <button
              className="button secondary small"
              onClick={() => void navigator.clipboard?.writeText(profile.id).then(() => setCopied(true))}
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div className="account-row">
            <span>
              <span className="field-label">Status</span>
              <span>{statusLabel[myStatus]}</span>
            </span>
            <select
              className="select small"
              value={myStatus}
              aria-label="Status"
              onChange={(e) => dispatch({ type: 'setStatus', status: e.target.value as Status })}
            >
              {(['online', 'idle', 'dnd', 'offline'] as Status[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <h3 className="settings-heading">Dados deste navegador</h3>
      <p className="setting-hint">
        Mensagens dos canais de texto, servidores criados e preferências ficam salvos só neste navegador. Apagar tudo
        volta o app ao estado inicial e cria uma nova identidade.
      </p>
      <div className="button-row">
        {confirmReset ? (
          <>
            <button className="button danger" onClick={resetEverything}>
              Sim, apagar tudo
            </button>
            <button className="button text" onClick={() => setConfirmReset(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <button className="button danger-outline" onClick={() => setConfirmReset(true)}>
            Apagar dados deste navegador
          </button>
        )}
      </div>
    </>
  );
}

function resetEverything() {
  try {
    localStorage.removeItem('discord-clone:v1');
    indexedDB.deleteDatabase('discord-clone');
  } catch {
    // nada a apagar
  }
  location.reload();
}

/* ---------------------------------------------------------------- Perfis */

function ProfilePage({ profile, dispatch }: { profile: Profile; dispatch: (a: Action) => void }) {
  const [name, setName] = useState(profile.name);
  const [color, setColor] = useState<string | undefined>(profile.color);
  const dirty = name.trim() !== profile.name || color !== profile.color;
  const shown = color ?? colorFor(profile.id);
  const preview = { id: profile.id, name: name.trim() || profile.name, color: shown, status: 'online' as const };

  return (
    <div className="profile-page">
      <div className="profile-form">
        <label className="field-label" htmlFor="profile-name">
          Nome de exibição
        </label>
        <input
          id="profile-name"
          className="field-input"
          value={name}
          maxLength={32}
          onChange={(e) => setName(e.target.value)}
        />

        <span className="field-label">Cor do avatar</span>
        <div className="swatches">
          <button
            className={`swatch auto ${color === undefined ? 'selected' : ''}`}
            style={{ background: colorFor(profile.id) }}
            onClick={() => setColor(undefined)}
            aria-label="Cor automática"
            title="Automática"
          >
            {color === undefined && <Check size={16} />}
          </button>
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`swatch ${color === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Cor ${c}`}
            >
              {color === c && <Check size={16} />}
            </button>
          ))}
          <label className="swatch custom" title="Escolher outra cor" style={{ background: shown }}>
            <input type="color" value={shown} onChange={(e) => setColor(e.target.value)} aria-label="Escolher outra cor" />
            +
          </label>
        </div>
        <p className="setting-hint">Nome e cor aparecem para os outros a partir da próxima vez que você entrar numa sala de voz.</p>
      </div>

      <div className="profile-preview" aria-label="Prévia do perfil">
        <div className="account-banner" style={{ background: shown }} />
        <Avatar user={preview} size={80} status="online" ring="var(--bg-floating)" />
        <strong>{preview.name}</strong>
        <span className="setting-hint">É assim que você aparece nas salas de voz.</span>
      </div>

      {dirty && (
        <div className="unsaved-bar" role="status">
          <span>Cuidado — você tem alterações que não foram salvas!</span>
          <button
            className="button text"
            onClick={() => {
              setName(profile.name);
              setColor(profile.color);
            }}
          >
            Redefinir
          </button>
          <button
            className="button green"
            disabled={!name.trim()}
            onClick={() => dispatch({ type: 'updateProfile', name, color: color ?? null })}
          >
            Salvar alterações
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Notificações */

function NotificationsPage({ settings, update }: { settings: SettingsState; update: Update }) {
  return (
    <>
      <h3 className="settings-heading">Sons</h3>
      <Toggle
        label="Nova mensagem no chat da sala de voz"
        hint="Toca um aviso curto quando alguém escreve no chat da sala em que você está."
        checked={settings.messageSound}
        onChange={(v) => update({ messageSound: v })}
      />
      <Toggle
        label="Entrar e sair da voz"
        hint="Toca quando você ou outra pessoa entra ou sai do canal de voz."
        checked={settings.voiceSounds}
        onChange={(v) => update({ voiceSounds: v })}
      />
    </>
  );
}

/* ---------------------------------------------------------------- Voz e vídeo */

function useDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const refresh = useCallback(() => {
    void navigator.mediaDevices
      ?.enumerateDevices()
      .then(setDevices)
      .catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    navigator.mediaDevices?.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', refresh);
  }, [refresh]);
  return [devices, refresh] as const;
}

/** Pede acesso uma vez, só para o navegador revelar os nomes dos dispositivos. */
async function unlockDeviceNames() {
  for (const constraints of [{ audio: true, video: true }, { audio: true }, { video: true }]) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((t) => t.stop());
      return;
    } catch {
      // tenta com menos dispositivos
    }
  }
}

function DeviceSelect({
  label,
  kind,
  devices,
  value,
  onChange,
  disabled,
}: {
  label: string;
  kind: MediaDeviceKind;
  devices: MediaDeviceInfo[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const list = devices.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== 'default');
  return (
    <label className="setting-block">
      <span className="field-label">{label}</span>
      <select className="select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">Padrão do sistema</option>
        {list.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function VoicePage({ settings, update }: { settings: SettingsState; update: Update }) {
  const [devices, refresh] = useDevices();
  const namesHidden = devices.some((d) => !d.label);
  const canPickOutput = 'setSinkId' in HTMLMediaElement.prototype;

  return (
    <>
      <h3 className="settings-heading">Voz</h3>
      {namesHidden && (
        <div className="notice">
          O navegador só mostra o nome dos dispositivos depois de você permitir o acesso.{' '}
          <button className="link-button" onClick={() => void unlockDeviceNames().then(refresh)}>
            Permitir acesso
          </button>
        </div>
      )}
      <div className="setting-grid">
        <DeviceSelect
          label="Microfone"
          kind="audioinput"
          devices={devices}
          value={settings.inputDevice}
          onChange={(id) => update({ inputDevice: id })}
        />
        <DeviceSelect
          label="Alto-falante"
          kind="audiooutput"
          devices={devices}
          value={settings.outputDevice}
          disabled={!canPickOutput}
          onChange={(id) => update({ outputDevice: id })}
        />
        <MicTest deviceId={settings.inputDevice} settings={settings} />
        <Slider label="Volume do alto-falante" value={settings.outputVolume} onChange={(v) => update({ outputVolume: v })} />
      </div>
      {!canPickOutput && <p className="setting-hint">Este navegador não permite escolher a saída de áudio.</p>}

      <h3 className="settings-heading">Processamento de voz</h3>
      <Toggle
        label="Supressão de ruído"
        hint="Reduz o ruído de fundo do seu microfone."
        checked={settings.noiseSuppression}
        onChange={(v) => update({ noiseSuppression: v })}
      />
      <Toggle
        label="Cancelamento de eco"
        hint="Evita que os outros ouçam o próprio som saindo do seu alto-falante."
        checked={settings.echoCancellation}
        onChange={(v) => update({ echoCancellation: v })}
      />
      <Toggle
        label="Controle automático de ganho"
        hint="Ajusta o volume do microfone para você soar sempre parecido."
        checked={settings.autoGainControl}
        onChange={(v) => update({ autoGainControl: v })}
      />

      <h3 className="settings-heading">Vídeo</h3>
      <div className="setting-grid">
        <DeviceSelect
          label="Câmera"
          kind="videoinput"
          devices={devices}
          value={settings.videoDevice}
          onChange={(id) => update({ videoDevice: id })}
        />
      </div>
      <CameraTest deviceId={settings.videoDevice} />

      <h3 className="settings-heading">Sons</h3>
      <Toggle
        label="Entrar e sair da voz"
        hint="Toca quando você ou outra pessoa entra ou sai do canal de voz."
        checked={settings.voiceSounds}
        onChange={(v) => update({ voiceSounds: v })}
      />
    </>
  );
}

/** "Teste do microfone": mostra o nível do som captado, sem enviar nada para ninguém. */
function MicTest({ deviceId, settings }: { deviceId: string; settings: SettingsState }) {
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!testing) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let frame = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            noiseSuppression: settings.noiseSuppression,
            echoCancellation: settings.echoCancellation,
            autoGainControl: settings.autoGainControl,
          },
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
          if (barRef.current) barRef.current.style.width = `${Math.min(100, (peak / 128) * 160)}%`;
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        if (!stopped) {
          setError('Sem permissão para usar o microfone.');
          setTesting(false);
        }
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [testing, deviceId, settings.noiseSuppression, settings.echoCancellation, settings.autoGainControl]);

  return (
    <div className="setting-block">
      <span className="field-label">Teste do microfone</span>
      <span className="mic-test">
        <button className="button brand small" onClick={() => setTesting((t) => !t)}>
          {testing ? 'Parar teste' : 'Testar'}
        </button>
        <span className="mic-meter" aria-hidden="true">
          <span ref={barRef} className="mic-meter-bar" style={{ width: 0 }} />
        </span>
      </span>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function CameraTest({ deviceId }: { deviceId: string }) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!on) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    navigator.mediaDevices
      .getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined } })
      .then((s) => {
        stream = s;
        if (stopped) return s.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {
        setError('Sem permissão para usar a câmera.');
        setOn(false);
      });
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on, deviceId]);

  return (
    <div className="camera-test">
      <div className="camera-preview">
        {on ? <video ref={videoRef} autoPlay muted playsInline /> : <span>Prévia da câmera</span>}
      </div>
      <button className="button brand small" onClick={() => setOn((v) => !v)}>
        {on ? 'Parar vídeo' : 'Testar vídeo'}
      </button>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------- Aparência */

const THEMES: { id: Theme; label: string; colors: [string, string] }[] = [
  { id: 'claro', label: 'Claro', colors: ['#ffffff', '#e3e5e8'] },
  { id: 'cinza', label: 'Cinza', colors: ['#3d3e45', '#2f3036'] },
  { id: 'escuro', label: 'Escuro', colors: ['#313338', '#1e1f22'] },
  { id: 'onix', label: 'Ônix', colors: ['#141417', '#000000'] },
];

function AppearancePage({ settings, update }: { settings: SettingsState; update: Update }) {
  return (
    <>
      <h3 className="settings-heading">Tema</h3>
      <div className="theme-options" role="radiogroup" aria-label="Tema">
        {THEMES.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={settings.theme === t.id}
            className={`theme-option ${settings.theme === t.id ? 'selected' : ''}`}
            onClick={() => update({ theme: t.id })}
          >
            <span className="theme-swatch" style={{ background: `linear-gradient(135deg, ${t.colors[0]} 50%, ${t.colors[1]} 50%)` }}>
              {settings.theme === t.id && <Check size={16} />}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <h3 className="settings-heading">Mensagens</h3>
      <div className="radio-list" role="radiogroup" aria-label="Exibição das mensagens">
        {[
          { compact: false, label: 'Confortável', hint: 'Moderno, bonito e agradável aos olhos.' },
          { compact: true, label: 'Compacta', hint: 'Cabem mais mensagens na tela de uma vez. #IRC' },
        ].map((o) => (
          <button
            key={o.label}
            role="radio"
            aria-checked={settings.compactMessages === o.compact}
            className={`radio-item ${settings.compactMessages === o.compact ? 'checked' : ''}`}
            onClick={() => update({ compactMessages: o.compact })}
          >
            <span className="radio-dot" />
            <span className="radio-card-text">
              <strong>{o.label}</strong>
              <span>{o.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Acessibilidade */

function AccessibilityPage({ settings, update }: { settings: SettingsState; update: Update }) {
  return (
    <>
      <h3 className="settings-heading">Saturação</h3>
      <p className="setting-hint">Diminui a intensidade das cores da interface.</p>
      <Slider label="Saturação" value={settings.saturation} onChange={(v) => update({ saturation: v })} />

      <h3 className="settings-heading">Movimento</h3>
      <Toggle
        label="Reduzir movimento"
        hint="Desativa animações e transições da interface."
        checked={settings.reducedMotion}
        onChange={(v) => update({ reducedMotion: v })}
      />
    </>
  );
}
