import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Music,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  SpotifyIcon,
  Trash,
  YoutubeIcon,
} from '../icons';
import {
  broadcastRadioLocal,
  getRadioEmbedUrl,
  loadRadioState,
  parseMusicUrl,
  resolveTrackMetadata,
  saveRadioState,
  subscribeRadioState,
  type PlaylistItem,
  type RadioState,
} from '../music';
import type { VoiceSession } from '../voice';

/**
 * Motor invisível de reprodução de áudio da Rádio Coworking.
 * Fica montado no App SOMENTE enquanto o usuário estiver conectado à sala de voz do Coworking.
 * Se o usuário não entrou na sala ou se desconectou, este componente é desmontado e NENHUM som é emitido.
 */
export function CoworkingRadioAudioHost({
  channelId = 'ch-pair',
  session,
}: {
  channelId?: string;
  session: VoiceSession;
}) {
  const [radio, setRadio] = useState<RadioState>(() => loadRadioState(channelId));
  const radioRef = useRef(radio);
  radioRef.current = radio;

  // 1. Escuta alterações locais disparadas pelo painel de controle ou chat
  useEffect(() => {
    return subscribeRadioState(channelId, (updated) => {
      setRadio(updated);
    });
  }, [channelId]);

  // 2. Escuta pacotes de sincronização da Rádio via LiveKit entre os participantes da sala
  useEffect(() => {
    if (!session.onMusicPacket) return;

    const cleanup = session.onMusicPacket((packet) => {
      if (packet.type === 'music:sync') {
        const remotePlaylist = packet.playlist as PlaylistItem[];
        const remoteIndex = typeof packet.currentIndex === 'number' ? packet.currentIndex : 0;
        const remoteStartedAt = typeof packet.trackStartedAt === 'number' ? packet.trackStartedAt : Date.now();
        const remotePlaying = typeof packet.isPlaying === 'boolean' ? packet.isPlaying : true;

        if (Array.isArray(remotePlaylist) && remotePlaylist.length > 0) {
          const updated: RadioState = {
            playlist: remotePlaylist,
            currentIndex: Math.min(remoteIndex, remotePlaylist.length - 1),
            trackStartedAt: remoteStartedAt,
            isPlaying: remotePlaying,
            updatedAt: Date.now(),
          };
          saveRadioState(channelId, updated);
          setRadio(updated);
          broadcastRadioLocal(channelId, updated);
        }
      } else if (packet.type === 'music:request') {
        // Envia o estado sincronizado da rádio para quem acabou de entrar na chamada
        if (session.sendMusicPacket && radioRef.current.playlist.length > 0) {
          void session.sendMusicPacket({
            type: 'music:sync',
            playlist: radioRef.current.playlist,
            currentIndex: radioRef.current.currentIndex,
            trackStartedAt: radioRef.current.trackStartedAt,
            isPlaying: radioRef.current.isPlaying,
          });
        }
      }
    });

    // Pede o estado da rádio para quem já estiver na chamada
    if (session.sendMusicPacket) {
      void session.sendMusicPacket({ type: 'music:request' });
    }

    return cleanup;
  }, [session, channelId]);

  // 3. Auto-avanço da rádio quando a faixa termina (via postMessage da API do YouTube)
  useEffect(() => {
    const onWindowMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data !== 'string') return;
        const data = JSON.parse(e.data);
        const state = data?.info?.playerState ?? (data?.event === 'onStateChange' ? data?.data : null);
        if (state === 0) {
          // Faixa finalizou: avança a rádio coletiva para a próxima música
          const cur = radioRef.current;
          if (cur.playlist.length > 0) {
            const nextIndex = (cur.currentIndex + 1) % cur.playlist.length;
            const updated: RadioState = {
              ...cur,
              currentIndex: nextIndex,
              trackStartedAt: Date.now(),
              isPlaying: true,
              updatedAt: Date.now(),
            };
            saveRadioState(channelId, updated);
            setRadio(updated);
            broadcastRadioLocal(channelId, updated);
            if (session.sendMusicPacket) {
              void session.sendMusicPacket({
                type: 'music:sync',
                playlist: updated.playlist,
                currentIndex: updated.currentIndex,
                trackStartedAt: updated.trackStartedAt,
                isPlaying: true,
              });
            }
          }
        }
      } catch {
        // ignora mensagens não-JSON ou de outros iframes
      }
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, [session, channelId]);

  const currentTrack = radio.playlist[radio.currentIndex] ?? radio.playlist[0];
  if (!currentTrack || !radio.isPlaying) return null;

  return (
    <div className="music-audio-engine" aria-hidden="true">
      <iframe
        key={`${currentTrack.id}-${radio.trackStartedAt}`}
        src={getRadioEmbedUrl(currentTrack, radio.trackStartedAt)}
        title={currentTrack.title}
        allow="autoplay; encrypted-media"
        tabIndex={-1}
      />
    </div>
  );
}

interface Props {
  channelId: string;
  session?: VoiceSession;
  userName?: string;
  isConnectedToVoice?: boolean;
  onJoinVoice?: () => void;
  isFocusMode?: boolean;
  layout?: 'stage' | 'chat';
}

/**
 * Painel interativo de controle da Rádio Coworking (visualizado no chat).
 * Não renderiza nenhum iframe diretamente — a reprodução sonora é centralizada no CoworkingRadioAudioHost.
 */
export function MusicStation({
  channelId,
  session,
  userName = 'Membro do LAB',
  isConnectedToVoice = false,
  onJoinVoice,
  layout = 'chat',
}: Props) {
  const [radio, setRadio] = useState<RadioState>(() => loadRadioState(channelId));
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(layout !== 'chat');

  // Sincroniza com alterações locais disparadas por outros componentes ou pelo host
  useEffect(() => {
    return subscribeRadioState(channelId, (updated) => {
      setRadio(updated);
    });
  }, [channelId]);

  const currentTrack = radio.playlist[radio.currentIndex] ?? radio.playlist[0];

  const broadcastRadio = (updated: RadioState) => {
    saveRadioState(channelId, updated);
    setRadio(updated);
    broadcastRadioLocal(channelId, updated);

    if (session?.sendMusicPacket) {
      void session.sendMusicPacket({
        type: 'music:sync',
        playlist: updated.playlist,
        currentIndex: updated.currentIndex,
        trackStartedAt: updated.trackStartedAt,
        isPlaying: updated.isPlaying,
      });
    }
  };

  const handleNext = () => {
    if (!isConnectedToVoice) {
      onJoinVoice?.();
      return;
    }
    if (!radio.playlist.length) return;
    const nextIndex = (radio.currentIndex + 1) % radio.playlist.length;
    broadcastRadio({
      ...radio,
      currentIndex: nextIndex,
      trackStartedAt: Date.now(),
      isPlaying: true,
      updatedAt: Date.now(),
    });
  };

  const handlePrev = () => {
    if (!isConnectedToVoice) {
      onJoinVoice?.();
      return;
    }
    if (!radio.playlist.length) return;
    const prevIndex = (radio.currentIndex - 1 + radio.playlist.length) % radio.playlist.length;
    broadcastRadio({
      ...radio,
      currentIndex: prevIndex,
      trackStartedAt: Date.now(),
      isPlaying: true,
      updatedAt: Date.now(),
    });
  };

  const handleTogglePlay = () => {
    if (!isConnectedToVoice) {
      onJoinVoice?.();
      return;
    }
    const nextPlaying = !radio.isPlaying;
    broadcastRadio({
      ...radio,
      isPlaying: nextPlaying,
      trackStartedAt: nextPlaying ? Date.now() : radio.trackStartedAt,
      updatedAt: Date.now(),
    });
  };

  const handleSelectTrack = (index: number) => {
    if (!isConnectedToVoice) {
      onJoinVoice?.();
      return;
    }
    if (index < 0 || index >= radio.playlist.length) return;
    broadcastRadio({
      ...radio,
      currentIndex: index,
      trackStartedAt: Date.now(),
      isPlaying: true,
      updatedAt: Date.now(),
    });
  };

  const handleRemoveTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (radio.playlist.length <= 1) {
      setErrorMessage('A playlist da rádio precisa ter pelo menos uma música.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const filtered = radio.playlist.filter((item) => item.id !== id);
    let nextIndex = radio.currentIndex;
    if (radio.currentIndex >= filtered.length) {
      nextIndex = 0;
    } else if (radio.playlist[radio.currentIndex]?.id === id) {
      nextIndex = Math.min(radio.currentIndex, filtered.length - 1);
    }

    broadcastRadio({
      ...radio,
      playlist: filtered,
      currentIndex: nextIndex,
      trackStartedAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const handleAddTrack = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsed = parseMusicUrl(urlInput);
    if (!parsed) {
      setErrorMessage('Link inválido. Insira um link válido do YouTube ou Spotify.');
      return;
    }

    setIsSubmitting(true);
    try {
      const meta = await resolveTrackMetadata(parsed);
      const newItem: PlaylistItem = {
        id: `track-${crypto.randomUUID().slice(0, 8)}`,
        source: parsed.source,
        type: parsed.type,
        url: urlInput.trim(),
        embedUrl: parsed.embedUrl,
        title: meta.title,
        artist: meta.artist,
        thumbnailUrl: meta.thumbnailUrl,
        addedBy: userName,
        addedAt: Date.now(),
      };

      const updatedPlaylist = [...radio.playlist, newItem];
      broadcastRadio({
        ...radio,
        playlist: updatedPlaylist,
        updatedAt: Date.now(),
      });
      setUrlInput('');
      setSuccessMessage(`"${newItem.title}" adicionada à rádio!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setErrorMessage('Não foi possível obter detalhes do link. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="music-station-chat" aria-label="Controle da Rádio Coworking">
      {/* Card Compacto da Rádio */}
      <div className={`music-audio-card ${isConnectedToVoice ? 'connected' : 'disconnected'}`}>
        <div className="music-audio-thumb-col">
          {currentTrack.thumbnailUrl ? (
            <img
              src={currentTrack.thumbnailUrl}
              alt={currentTrack.title}
              className="music-audio-thumb"
            />
          ) : (
            <div className="music-audio-icon-box">
              <Music size={22} />
            </div>
          )}
          {isConnectedToVoice && radio.isPlaying && (
            <span className="soundwave-badge" title="No ar agora">
              <span className="bar bar-1" />
              <span className="bar bar-2" />
              <span className="bar bar-3" />
            </span>
          )}
        </div>

        <div className="music-audio-details">
          <div className="music-audio-tags-row">
            {isConnectedToVoice ? (
              <span className="tag-radio-live">
                <span className="live-pulse" /> AO VIVO
              </span>
            ) : (
              <span className="tag-radio-off">RÁDIO COWORKING</span>
            )}

            {currentTrack.source === 'youtube' ? (
              <span className="tag-youtube">
                <YoutubeIcon size={12} /> YouTube
              </span>
            ) : (
              <span className="tag-spotify">
                <SpotifyIcon size={12} /> Spotify
              </span>
            )}
            <span className="track-counter">
              {radio.currentIndex + 1} de {radio.playlist.length}
            </span>
          </div>

          <h4 className="music-audio-title" title={currentTrack.title}>
            {currentTrack.title}
          </h4>
          {currentTrack.artist && (
            <p className="music-audio-artist">{currentTrack.artist}</p>
          )}

          {!isConnectedToVoice && (
            <div className="music-radio-connect-prompt">
              <button
                type="button"
                className="join-radio-inline-btn"
                onClick={onJoinVoice}
                title="Conectar ao canal para ouvir a rádio ao vivo com todos"
              >
                <Play size={12} />
                <span>Entrar no canal para ouvir junto</span>
              </button>
            </div>
          )}
        </div>

        {isConnectedToVoice && (
          <div className="music-audio-controls">
            <button
              type="button"
              className="control-btn sm"
              onClick={handlePrev}
              title="Faixa anterior (sincronizada)"
              aria-label="Faixa anterior"
            >
              <SkipBack size={14} />
            </button>
            <button
              type="button"
              className="control-btn primary-play"
              onClick={handleTogglePlay}
              title={radio.isPlaying ? 'Pausar rádio para todos' : 'Retomar rádio'}
              aria-label={radio.isPlaying ? 'Pausar' : 'Tocar'}
            >
              {radio.isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              className="control-btn sm"
              onClick={handleNext}
              title="Próxima faixa (sincronizada)"
              aria-label="Próxima faixa"
            >
              <SkipForward size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Formulário para adicionar faixas */}
      <form className="add-track-form add-track-form-chat" onSubmit={handleAddTrack}>
        <div className="add-input-wrapper">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Cole link do YouTube ou Spotify..."
            className="add-track-input"
            disabled={isSubmitting}
            required
          />
          <button
            type="submit"
            className="add-track-btn"
            disabled={isSubmitting || !urlInput.trim()}
            title="Adicionar faixa à rádio coletiva"
          >
            <Plus size={14} />
            <span>{isSubmitting ? '…' : 'Adicionar'}</span>
          </button>
        </div>
        {errorMessage && <p className="music-form-error">{errorMessage}</p>}
        {successMessage && <p className="music-form-success">{successMessage}</p>}
      </form>

      {/* Fila / Drawer da Playlist */}
      <div className="playlist-chat-toggle-row">
        <button
          type="button"
          className="toggle-queue-btn-chat"
          onClick={() => setShowQueue(!showQueue)}
        >
          <span>Playlist da Rádio ({radio.playlist.length})</span>
          <span>{showQueue ? '▲ Ocultar fila' : '▼ Ver fila'}</span>
        </button>
      </div>

      {showQueue && (
        <div className="playlist-queue-list playlist-queue-list-chat" role="list">
          {radio.playlist.map((item, idx) => {
            const isCurrent = idx === radio.currentIndex;
            return (
              <div
                key={item.id}
                className={`queue-item ${isCurrent ? 'active' : ''}`}
                onClick={() => handleSelectTrack(idx)}
                role="button"
                tabIndex={0}
                title={isConnectedToVoice ? `Tocar ${item.title} na rádio` : 'Conecte-se para tocar'}
              >
                <div className="queue-item-left">
                  <span className="queue-index">
                    {isCurrent && isConnectedToVoice && radio.isPlaying ? (
                      <span className="soundwave-anim">▶</span>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span className="queue-source-icon">
                    {item.source === 'youtube' ? (
                      <YoutubeIcon size={14} />
                    ) : (
                      <SpotifyIcon size={14} />
                    )}
                  </span>
                  <div className="queue-track-info">
                    <strong className="queue-title">{item.title}</strong>
                    <span className="queue-artist">
                      {item.artist || (item.source === 'youtube' ? 'YouTube' : 'Spotify')}
                      {item.addedBy && ` • ${item.addedBy}`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="queue-remove-btn"
                  onClick={(e) => handleRemoveTrack(item.id, e)}
                  title="Remover da rádio"
                  aria-label={`Remover ${item.title}`}
                >
                  <Trash size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
