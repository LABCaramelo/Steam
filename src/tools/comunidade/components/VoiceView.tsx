import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { Track } from 'livekit-client';
import {
  ChatBubble,
  Close,
  Fullscreen,
  FullscreenExit,
  Grid,
  Hangup,
  Headphones,
  Mic,
  ScreenShare,
  Speaker,
  Video,
} from '../icons';
import type { Action, State } from '../store';
import type { Channel, Message } from '../types';
import { memberUser, type Occupancy, type VoiceMember, type VoiceSession } from '../voice';
import { NavButton } from '../ui';
import { Avatar } from './Avatar';
import { Conversation } from './Chat';

interface Props {
  serverId: string;
  channel: Channel;
  state: State;
  session: VoiceSession;
  occupancy: Occupancy;
  /** Mensagens novas no chat da sala desde a última vez que ele esteve à vista (ver useUnread). */
  unread: number;
  dispatch: (a: Action) => void;
}

export function TrackVideo({ track, mirrored }: { track: Track; mirrored?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);
  return <video ref={ref} className={`stream-video ${mirrored ? 'mirrored' : ''}`} autoPlay muted playsInline />;
}

export function VoiceView({ serverId, channel, state, session, occupancy, unread, dispatch }: Props) {
  const connected = state.voice?.channelId === channel.id;
  const messages = state.messages[channel.id] ?? [];
  const showChat = state.showVoiceChat;
  // A tela cheia leva a chamada inteira (vídeo ampliado, controles e chat), como no Discord.
  const viewRef = useRef<HTMLElement>(null);
  const fullscreen = useFullscreen(viewRef);
  const idle = useIdle(fullscreen.active);

  // Sair da chamada também sai da tela cheia.
  const { active: isFullscreen, exit: exitFullscreen } = fullscreen;
  useEffect(() => {
    if (!connected && isFullscreen) exitFullscreen();
  }, [connected, isFullscreen, exitFullscreen]);

  return (
    <main ref={viewRef} className="voice-view" data-idle={idle ? '' : undefined}>
      <section className="voice-stage">
        <header className="voice-view-header">
          <NavButton />
          <Speaker size={24} />
          <h1>{channel.name}</h1>
          <div className="voice-view-tools">
            <button
              className={showChat ? 'on' : ''}
              onClick={() => dispatch({ type: 'toggleVoiceChat' })}
              aria-pressed={showChat}
              aria-label={
                showChat ? 'Ocultar chat' : unread ? `Mostrar chat (${unread} ${unread === 1 ? 'nova' : 'novas'})` : 'Mostrar chat'
              }
              title={showChat ? 'Ocultar chat' : 'Mostrar chat'}
            >
              <ChatBubble size={24} />
              {unread > 0 && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
            </button>
            {connected && fullscreen.supported && (
              <button
                onClick={fullscreen.active ? fullscreen.exit : fullscreen.enter}
                aria-label={fullscreen.active ? 'Sair da tela cheia' : 'Tela cheia'}
                title={fullscreen.active ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
              >
                {fullscreen.active ? <FullscreenExit size={24} /> : <Fullscreen size={24} />}
              </button>
            )}
          </div>
        </header>

        {connected ? <Call state={state} session={session} fullscreen={fullscreen} dispatch={dispatch} /> : (
          <Lobby
            channel={channel}
            people={occupancy[channel.id] ?? []}
            onJoin={() => dispatch({ type: 'joinVoice', serverId, channelId: channel.id })}
          />
        )}
      </section>

      {showChat && (
        <VoiceChat
          channel={channel}
          messages={messages}
          canSend={connected && session.status === 'connected'}
          session={session}
          onClose={() => dispatch({ type: 'toggleVoiceChat' })}
          dispatch={dispatch}
        />
      )}
    </main>
  );
}

/** Tela cheia de um elemento; no iPhone o navegador só permite isso para vídeos (ver CallTile). */
interface FullscreenControl {
  supported: boolean;
  active: boolean;
  enter: () => void;
  exit: () => void;
}

function useFullscreen(ref: RefObject<HTMLElement | null>): FullscreenControl {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const update = () => setActive(!!ref.current && document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, [ref]);
  const enter = useCallback(() => {
    ref.current?.requestFullscreen().catch(() => {});
  }, [ref]);
  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  return { supported: !!document.fullscreenEnabled, active, enter, exit };
}

const IDLE_MS = 3000;

/** Mouse parado por alguns segundos: em tela cheia, os controles somem para não cobrir o vídeo. */
function useIdle(enabled: boolean) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    let timer = 0;
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    const events = ['pointermove', 'pointerdown', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, wake));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [enabled]);
  return idle;
}

function VoiceChat({
  channel,
  messages,
  canSend,
  session,
  onClose,
  dispatch,
}: {
  channel: Channel;
  messages: Message[];
  canSend: boolean;
  session: VoiceSession;
  onClose: () => void;
  dispatch: (a: Action) => void;
}) {
  return (
    <aside className="voice-chat" aria-label={`Chat de ${channel.name}`}>
      <header className="voice-chat-header">
        <Speaker size={20} />
        <h2>{channel.name}</h2>
        <button onClick={onClose} aria-label="Fechar chat" title="Fechar chat">
          <Close size={20} />
        </button>
      </header>
      <Conversation
        conversationId={channel.id}
        title={channel.name}
        welcome={
          <>
            <div className="welcome-icon">
              <Speaker size={36} />
            </div>
            <h2>Bem-vindo(a) a {channel.name}!</h2>
            <p>As mensagens deste chat chegam a todos que estão na sala de voz.</p>
          </>
        }
        messages={messages}
        placeholder={canSend ? `Conversar em ${channel.name}` : 'Entre na sala de voz para conversar'}
        disabled={!canSend}
        onSend={session.sendChat}
        onDelete={canSend ? session.deleteChat : undefined}
        onSelectUser={(u) => dispatch({ type: 'openModal', modal: { kind: 'userProfile', user: u } })}
      />
    </aside>
  );
}

/* ---------------------------------------------------------------- chamada */

/** Um quadro da chamada: a tela compartilhada de alguém ou a própria pessoa (câmera ou avatar). */
interface TileInfo {
  key: string;
  member: VoiceMember;
  screen: boolean;
}

function videoOf(tile: TileInfo) {
  return tile.screen ? tile.member.screen : tile.member.camera;
}

function Call({
  state,
  session,
  fullscreen,
  dispatch,
}: {
  state: State;
  session: VoiceSession;
  fullscreen: FullscreenControl;
  dispatch: (a: Action) => void;
}) {
  const tiles: TileInfo[] = [
    ...session.members.filter((m) => m.screen).map((m) => ({ key: `${m.identity}:tela`, member: m, screen: true })),
    ...session.members.map((m) => ({ key: m.identity, member: m, screen: false })),
  ];
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  // Se a transmissão ampliada acabar (ou a câmera desligar), volta sozinho para a grade.
  const focused = tiles.find((t) => t.key === focusedKey && videoOf(t)) ?? null;
  const gridRef = useRef<HTMLDivElement>(null);
  const showsGrid = !focused && (session.status === 'connected' || session.status === 'reconnecting');
  const tileWidth = useTileWidth(gridRef, tiles.length, showsGrid);

  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('textarea, input');
      if (e.key === 'Escape' && !typing && !document.fullscreenElement) setFocusedKey(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);

  // Pôr um vídeo em tela cheia também o amplia; no vídeo já ampliado, o mesmo botão sai.
  const toggleFullscreen = (key: string) => {
    if (fullscreen.active && focused?.key === key) return fullscreen.exit();
    setFocusedKey(key);
    fullscreen.enter();
  };
  const fullscreenFor = (key: string) => (fullscreen.supported ? () => toggleFullscreen(key) : undefined);

  return (
    <>
      {session.status === 'error' ? (
        <div className="voice-lobby">
          <h2>Não deu para conectar</h2>
          <p>{session.error}</p>
          <button className="voice-join" onClick={session.retry}>
            Tentar de novo
          </button>
        </div>
      ) : session.status === 'connecting' ? (
        <div className="voice-lobby">
          <p>Conectando…</p>
        </div>
      ) : focused ? (
        <div className="voice-focus">
          <div className="voice-focus-main">
            <CallTile
              tile={focused}
              mode="focus"
              fullscreen={fullscreen.active}
              onGrid={() => setFocusedKey(null)}
              onFullscreen={fullscreenFor(focused.key)}
            />
          </div>
          <div className="voice-strip">
            {tiles
              .filter((t) => t !== focused)
              .map((t) => (
                <CallTile key={t.key} tile={t} mode="strip" onFocus={() => setFocusedKey(t.key)} />
              ))}
          </div>
        </div>
      ) : (
        <div className="voice-grid" ref={gridRef}>
          {tiles.map((t) => (
            <CallTile
              key={t.key}
              tile={t}
              mode="grid"
              style={{ width: tileWidth }}
              fullscreen={fullscreen.active}
              onFocus={() => setFocusedKey(t.key)}
              onFullscreen={fullscreenFor(t.key)}
            />
          ))}
        </div>
      )}

      {session.status === 'reconnecting' && <p className="voice-warning">Reconectando…</p>}
      {session.deviceError && <p className="voice-warning">{session.deviceError}</p>}
      {session.audioBlocked && (
        <p className="voice-warning">
          O navegador bloqueou o som da chamada.{' '}
          <button className="link-button" onClick={session.startAudio}>
            Clique para ouvir
          </button>
        </p>
      )}

      <div className="voice-controls">
        <button
          className={state.muted ? 'off slashed' : ''}
          onClick={() => dispatch({ type: 'toggleMute' })}
          aria-label={state.muted ? 'Ativar microfone' : 'Silenciar'}
          title={state.muted ? 'Ativar microfone' : 'Silenciar'}
        >
          <Mic size={24} />
        </button>
        <button
          className={state.deafened ? 'off slashed' : ''}
          onClick={() => dispatch({ type: 'toggleDeafen' })}
          aria-label={state.deafened ? 'Ativar áudio' : 'Desativar áudio'}
          title={state.deafened ? 'Ativar áudio' : 'Desativar áudio'}
        >
          <Headphones size={24} />
        </button>
        <button
          className={session.cameraOn ? 'on' : ''}
          onClick={session.toggleCamera}
          disabled={session.status !== 'connected'}
          aria-label={session.cameraOn ? 'Desligar câmera' : 'Ligar câmera'}
          aria-pressed={session.cameraOn}
          title={session.cameraOn ? 'Desligar câmera' : 'Ligar câmera'}
        >
          <Video size={24} />
        </button>
        <button
          className={session.screenOn ? 'on' : ''}
          onClick={session.toggleScreen}
          disabled={session.status !== 'connected'}
          aria-label={session.screenOn ? 'Parar transmissão' : 'Compartilhar tela'}
          aria-pressed={session.screenOn}
          title={session.screenOn ? 'Parar transmissão' : 'Compartilhar tela'}
        >
          <ScreenShare size={24} />
        </button>
        <button
          className="hangup"
          onClick={() => dispatch({ type: 'leaveVoice' })}
          aria-label="Desconectar"
          title="Desconectar"
        >
          <Hangup size={24} />
        </button>
      </div>
    </>
  );
}

const TILE_GAP = 8;
const TILE_RATIO = 16 / 9;

/** Largura do maior quadro 16:9 que cabe `count` vezes na área, testando cada número de colunas. */
function fitTiles(width: number, height: number, count: number) {
  let best = 0;
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const byWidth = (width - TILE_GAP * (cols - 1)) / cols;
    const byHeight = ((height - TILE_GAP * (rows - 1)) / rows) * TILE_RATIO;
    best = Math.max(best, Math.min(byWidth, byHeight));
  }
  return Math.max(0, Math.floor(best));
}

/** Mede a área da grade e recalcula o tamanho dos quadros quando a janela muda. */
function useTileWidth(ref: RefObject<HTMLElement | null>, count: number, active: boolean) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const measure = () => {
      const css = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
      const h = el.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
      setWidth(fitTiles(w, h, Math.max(1, count)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, count, active]);
  return width;
}

/** No iPhone não há tela cheia para a página, só o player nativo do próprio vídeo. */
type NativeVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
const nativeVideoFullscreen = typeof HTMLVideoElement !== 'undefined' && 'webkitEnterFullscreen' in HTMLVideoElement.prototype;

/**
 * grid: na grade, clicar num vídeo amplia; focus: o vídeo ampliado (duplo clique = tela cheia);
 * strip: miniaturas embaixo do vídeo ampliado, clicar troca qual está ampliado.
 */
function CallTile({
  tile,
  mode,
  style,
  fullscreen = false,
  onFocus,
  onGrid,
  onFullscreen,
}: {
  tile: TileInfo;
  mode: 'grid' | 'focus' | 'strip';
  style?: CSSProperties;
  /** A chamada está em tela cheia. */
  fullscreen?: boolean;
  onFocus?: () => void;
  onGrid?: () => void;
  /** Sem esta função (navegador sem tela cheia), usa o player nativo do vídeo, se houver. */
  onFullscreen?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { member: m, screen } = tile;
  const video = videoOf(tile);
  const user = memberUser(m);
  const label = screen ? `a tela de ${m.name}` : `a câmera de ${m.name}`;
  const exits = fullscreen && mode === 'focus';

  const toggleFullscreen =
    onFullscreen ??
    (nativeVideoFullscreen
      ? () => ref.current?.querySelector<NativeVideo>('video')?.webkitEnterFullscreen?.()
      : undefined);

  return (
    <div
      ref={ref}
      style={style}
      className={`voice-tile ${mode} ${screen ? 'screen' : ''} ${video && !screen ? 'video' : ''} ${
        !screen && m.speaking ? 'speaking' : ''
      }`}
    >
      {video ? (
        // A própria câmera aparece espelhada, como num espelho.
        <TrackVideo track={video} mirrored={!screen && m.isLocal} />
      ) : (
        <>
          <div className="voice-tile-bg" style={{ background: user.color }} />
          <Avatar user={user} size={mode === 'strip' ? 48 : 80} />
        </>
      )}

      {video &&
        (mode === 'focus' ? (
          <div className="voice-tile-hit" onDoubleClick={toggleFullscreen} />
        ) : (
          <button className="voice-tile-hit" onClick={onFocus} aria-label={`Ampliar ${label}`} title="Clique para ampliar" />
        ))}

      {screen && <span className="live-badge">AO VIVO</span>}
      <span className="voice-tile-name">
        {screen ? (
          <ScreenShare size={14} />
        ) : (
          m.micMuted && (
            <span className="slashed">
              <Mic size={14} />
            </span>
          )
        )}
        {screen ? `Tela de ${m.name}` : m.name}
        {!screen && m.isLocal && ' (você)'}
      </span>

      {video && mode !== 'strip' && (
        <div className="voice-tile-actions">
          {mode === 'focus' && (
            <button onClick={onGrid} aria-label="Voltar para a grade" title="Voltar para a grade (Esc)">
              <Grid size={20} />
            </button>
          )}
          {toggleFullscreen && (
            <button
              onClick={toggleFullscreen}
              aria-label={exits ? 'Sair da tela cheia' : `Ver ${label} em tela cheia`}
              title={exits ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
            >
              {exits ? <FullscreenExit size={20} /> : <Fullscreen size={20} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Lobby({
  channel,
  people,
  onJoin,
}: {
  channel: Channel;
  people: { identity: string; name: string }[];
  onJoin: () => void;
}) {
  return (
    <div className="voice-lobby">
      <div className="voice-lobby-avatars">
        {people.map((p) => (
          <Avatar key={p.identity} user={memberUser(p)} size={48} />
        ))}
      </div>
      <h2>{channel.name}</h2>
      <p>
        {people.length
          ? `${people.map((p) => p.name).join(', ')} ${people.length === 1 ? 'está' : 'estão'} na sala.`
          : 'Ninguém está aqui ainda.'}
      </p>
      <button className="voice-join" onClick={onJoin}>
        Entrar na voz
      </button>
    </div>
  );
}
