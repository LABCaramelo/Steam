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
  DEFAULT_COWORKING_PLAYLIST,
  loadPlaylist,
  parseMusicUrl,
  resolveTrackMetadata,
  savePlaylist,
  type PlaylistItem,
} from '../music';
import type { VoiceMember, VoiceSession } from '../voice';

interface Props {
  channelId: string;
  session?: VoiceSession;
  userName?: string;
  members?: VoiceMember[];
  isFocusMode?: boolean;
  layout?: 'stage' | 'chat';
}

export function MusicStation({
  channelId,
  session,
  userName = 'Membro do LAB',
  isFocusMode = false,
  layout = 'chat',
}: Props) {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => loadPlaylist(channelId));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(layout !== 'chat');

  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Sincronização em tempo real via LiveKit Data/Text Stream
  useEffect(() => {
    if (!session?.onMusicPacket) return;

    const cleanup = session.onMusicPacket((packet) => {
      if (packet.type === 'music:sync') {
        const remotePlaylist = packet.playlist as PlaylistItem[];
        const remoteIndex = typeof packet.currentIndex === 'number' ? packet.currentIndex : 0;
        const remotePlaying = typeof packet.isPlaying === 'boolean' ? packet.isPlaying : true;

        if (Array.isArray(remotePlaylist) && remotePlaylist.length > 0) {
          setPlaylist(remotePlaylist);
          savePlaylist(channelId, remotePlaylist);
          setCurrentIndex(Math.min(remoteIndex, remotePlaylist.length - 1));
          setIsPlaying(remotePlaying);
        }
      } else if (packet.type === 'music:request') {
        // Envia o estado atual da playlist para quem acabou de entrar
        if (session.sendMusicPacket && playlistRef.current.length > 0) {
          void session.sendMusicPacket({
            type: 'music:sync',
            playlist: playlistRef.current,
            currentIndex: currentIndexRef.current,
            isPlaying: true,
          });
        }
      }
    });

    // Pede o estado da playlist ao conectar
    if (session.sendMusicPacket) {
      void session.sendMusicPacket({ type: 'music:request' });
    }

    return cleanup;
  }, [session, channelId]);

  const currentTrack = playlist[currentIndex] ?? playlist[0] ?? DEFAULT_COWORKING_PLAYLIST[0];

  const broadcastUpdate = (newPlaylist: PlaylistItem[], newIndex: number, newPlaying: boolean) => {
    setPlaylist(newPlaylist);
    savePlaylist(channelId, newPlaylist);
    setCurrentIndex(newIndex);
    setIsPlaying(newPlaying);

    if (session?.sendMusicPacket) {
      void session.sendMusicPacket({
        type: 'music:sync',
        playlist: newPlaylist,
        currentIndex: newIndex,
        isPlaying: newPlaying,
      });
    }
  };

  const handleNext = () => {
    if (!playlist.length) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    broadcastUpdate(playlist, nextIndex, true);
  };

  const handlePrev = () => {
    if (!playlist.length) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    broadcastUpdate(playlist, prevIndex, true);
  };

  const handleSelectTrack = (index: number) => {
    if (index < 0 || index >= playlist.length) return;
    broadcastUpdate(playlist, index, true);
  };

  const handleRemoveTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.length <= 1) {
      setErrorMessage('A playlist precisa ter pelo menos uma música.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const filtered = playlist.filter((item) => item.id !== id);
    let nextIndex = currentIndex;
    if (currentIndex >= filtered.length) {
      nextIndex = 0;
    } else if (playlist[currentIndex]?.id === id) {
      nextIndex = Math.min(currentIndex, filtered.length - 1);
    }
    broadcastUpdate(filtered, nextIndex, isPlaying);
  };

  const handleAddTrack = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsed = parseMusicUrl(urlInput);
    if (!parsed) {
      setErrorMessage('Link inválido. Insira um link válido do YouTube (vídeo/playlist) ou Spotify (música/álbum/playlist).');
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

      const updated = [...playlist, newItem];
      broadcastUpdate(updated, currentIndex, isPlaying);
      setUrlInput('');
      setSuccessMessage(`"${newItem.title}" foi adicionada à playlist!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setErrorMessage('Não foi possível obter detalhes do link. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modo focado (quando uma tela compartilhada está ampliada)
  if (isFocusMode) {
    return (
      <div className="music-compact-bar" aria-label="Player de música compacto">
        <div className="music-compact-meta">
          <span className="music-source-icon">
            {currentTrack.source === 'youtube' ? <YoutubeIcon size={18} /> : <SpotifyIcon size={18} />}
          </span>
          <div className="music-compact-text">
            <strong>{currentTrack.title}</strong>
            {currentTrack.artist && <span>{currentTrack.artist}</span>}
          </div>
        </div>
        <div className="music-compact-controls">
          <button onClick={handlePrev} title="Faixa anterior" aria-label="Faixa anterior">
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => broadcastUpdate(playlist, currentIndex, !isPlaying)}
            title={isPlaying ? 'Pausar' : 'Tocar'}
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}
            className="play-btn"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={handleNext} title="Próxima faixa" aria-label="Próxima faixa">
            <SkipForward size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Layout compacto quando renderizado dentro do chat da sala de voz
  if (layout === 'chat') {
    return (
      <div className="music-station-chat" aria-label="Controle de música e playlist">
        <div className="music-chat-header">
          <div className="music-chat-source-tag">
            {currentTrack.source === 'youtube' ? (
              <span className="tag-youtube">
                <YoutubeIcon size={13} /> YouTube
              </span>
            ) : (
              <span className="tag-spotify">
                <SpotifyIcon size={13} /> Spotify
              </span>
            )}
            <span className="track-counter">
              {currentIndex + 1}/{playlist.length}
            </span>
          </div>
          {currentTrack.addedBy && (
            <span className="added-by" title={`Adicionado por ${currentTrack.addedBy}`}>
              por {currentTrack.addedBy}
            </span>
          )}
        </div>

        <div className="music-embed-wrapper music-embed-wrapper-chat">
          {isPlaying ? (
            <iframe
              key={currentTrack.embedUrl}
              src={currentTrack.embedUrl}
              title={currentTrack.title}
              className={`music-embed-iframe ${currentTrack.source === 'spotify' ? 'spotify-frame' : 'youtube-frame'}`}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          ) : (
            <div className="music-paused-placeholder music-paused-placeholder-chat">
              <button
                type="button"
                className="resume-play-btn"
                onClick={() => broadcastUpdate(playlist, currentIndex, true)}
              >
                <Play size={24} />
                <span>Retomar Música</span>
              </button>
            </div>
          )}
        </div>

        <div className="music-player-controls-bar music-chat-controls-bar">
          <div className="track-titles">
            <h4 className="track-title" title={currentTrack.title}>
              {currentTrack.title}
            </h4>
            {currentTrack.artist && (
              <p className="track-artist">{currentTrack.artist}</p>
            )}
          </div>

          <div className="playback-buttons">
            <button
              type="button"
              className="control-btn"
              onClick={handlePrev}
              title="Faixa anterior"
              aria-label="Faixa anterior"
            >
              <SkipBack size={15} />
            </button>
            <button
              type="button"
              className="control-btn primary-play"
              onClick={() => broadcastUpdate(playlist, currentIndex, !isPlaying)}
              title={isPlaying ? 'Pausar' : 'Tocar'}
              aria-label={isPlaying ? 'Pausar' : 'Tocar'}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button
              type="button"
              className="control-btn"
              onClick={handleNext}
              title="Próxima faixa"
              aria-label="Próxima faixa"
            >
              <SkipForward size={15} />
            </button>
          </div>
        </div>

        {/* Adicionar música na playlist */}
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
              title="Adicionar à playlist"
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
            <span>Playlist Colaborativa ({playlist.length})</span>
            <span>{showQueue ? '▲ Ocultar fila' : '▼ Ver fila'}</span>
          </button>
        </div>

        {showQueue && (
          <div className="playlist-queue-list playlist-queue-list-chat" role="list">
            {playlist.map((item, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <div
                  key={item.id}
                  className={`queue-item ${isCurrent ? 'active' : ''}`}
                  onClick={() => handleSelectTrack(idx)}
                  role="button"
                  tabIndex={0}
                  title={`Tocar ${item.title}`}
                >
                  <div className="queue-item-left">
                    <span className="queue-index">
                      {isCurrent && isPlaying ? (
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
                    title="Remover da playlist"
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

  return (
    <section className="music-station-stage" aria-label="Coworking Silencioso e Playlist">
      {/* Banner de Boas-Vindas e Regras do Canal */}
      <div className="coworking-banner">
        <div className="coworking-banner-left">
          <div className="coworking-badge">
            <Music size={18} />
            <span>Coworking Silencioso</span>
          </div>
          <span className="coworking-rules-tag">
            🔇 Somente Música • Microfone & Câmera Desativados
          </span>
        </div>
        <p className="coworking-desc">
          Ambiente para foco individual e trabalho compartilhado. Compartilhamento de tela liberado. Qualquer membro pode editar a playlist coletiva.
        </p>
      </div>

      <div className="music-station-container">
        {/* Lado Esquerdo: Player Principal & Controles */}
        <div className="music-player-card">
          <div className="music-player-header">
            <div className="music-player-tag">
              {currentTrack.source === 'youtube' ? (
                <span className="tag-youtube">
                  <YoutubeIcon size={16} /> YouTube
                </span>
              ) : (
                <span className="tag-spotify">
                  <SpotifyIcon size={16} /> Spotify
                </span>
              )}
              <span className="track-counter">
                Faixa {currentIndex + 1} de {playlist.length}
              </span>
            </div>
            {currentTrack.addedBy && (
              <span className="added-by">Adicionado por {currentTrack.addedBy}</span>
            )}
          </div>

          <div className="music-embed-wrapper">
            {isPlaying ? (
              <iframe
                key={currentTrack.embedUrl}
                src={currentTrack.embedUrl}
                title={currentTrack.title}
                className={`music-embed-iframe ${currentTrack.source === 'spotify' ? 'spotify-frame' : 'youtube-frame'}`}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            ) : (
              <div className="music-paused-placeholder">
                <button
                  className="resume-play-btn"
                  onClick={() => broadcastUpdate(playlist, currentIndex, true)}
                >
                  <Play size={36} />
                  <span>Retomar Reprodução</span>
                </button>
              </div>
            )}
          </div>

          <div className="music-player-controls-bar">
            <div className="track-titles">
              <h3 className="track-title" title={currentTrack.title}>
                {currentTrack.title}
              </h3>
              {currentTrack.artist && (
                <p className="track-artist">{currentTrack.artist}</p>
              )}
            </div>

            <div className="playback-buttons">
              <button
                className="control-btn"
                onClick={handlePrev}
                title="Faixa anterior"
                aria-label="Faixa anterior"
              >
                <SkipBack size={20} />
              </button>
              <button
                className="control-btn primary-play"
                onClick={() => broadcastUpdate(playlist, currentIndex, !isPlaying)}
                title={isPlaying ? 'Pausar' : 'Tocar'}
                aria-label={isPlaying ? 'Pausar' : 'Tocar'}
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
              </button>
              <button
                className="control-btn"
                onClick={handleNext}
                title="Próxima faixa"
                aria-label="Próxima faixa"
              >
                <SkipForward size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulário de Adicionar + Fila da Playlist */}
        <div className="music-playlist-panel">
          <div className="playlist-panel-header">
            <div className="panel-title-row">
              <h3>Playlist Colaborativa</h3>
              <span className="badge-count">{playlist.length}</span>
            </div>
            <button
              className="toggle-queue-btn"
              onClick={() => setShowQueue(!showQueue)}
            >
              {showQueue ? 'Ocultar fila' : 'Mostrar fila'}
            </button>
          </div>

          {/* Form para adicionar músicas */}
          <form className="add-track-form" onSubmit={handleAddTrack}>
            <div className="add-input-wrapper">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Cole o link do YouTube ou Spotify..."
                className="add-track-input"
                disabled={isSubmitting}
                required
              />
              <button
                type="submit"
                className="add-track-btn"
                disabled={isSubmitting || !urlInput.trim()}
                title="Adicionar à playlist"
              >
                <Plus size={18} />
                <span>{isSubmitting ? 'Adicionando…' : 'Adicionar'}</span>
              </button>
            </div>
            {errorMessage && <p className="music-form-error">{errorMessage}</p>}
            {successMessage && <p className="music-form-success">{successMessage}</p>}
          </form>

          {/* Fila / Queue de Músicas */}
          {showQueue && (
            <div className="playlist-queue-list" role="list">
              {playlist.map((item, idx) => {
                const isCurrent = idx === currentIndex;
                return (
                  <div
                    key={item.id}
                    className={`queue-item ${isCurrent ? 'active' : ''}`}
                    onClick={() => handleSelectTrack(idx)}
                    role="listitem"
                    title={`Tocar ${item.title}`}
                  >
                    <div className="queue-item-left">
                      <span className="queue-index">
                        {isCurrent && isPlaying ? (
                          <span className="soundwave-anim">▶</span>
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="queue-source-icon">
                        {item.source === 'youtube' ? (
                          <YoutubeIcon size={16} />
                        ) : (
                          <SpotifyIcon size={16} />
                        )}
                      </span>
                      <div className="queue-track-info">
                        <strong className="queue-title">{item.title}</strong>
                        <span className="queue-artist">
                          {item.artist || (item.source === 'youtube' ? 'YouTube' : 'Spotify')}
                          {item.addedBy && ` • por ${item.addedBy}`}
                        </span>
                      </div>
                    </div>

                    <button
                      className="queue-remove-btn"
                      onClick={(e) => handleRemoveTrack(item.id, e)}
                      title="Remover da playlist"
                      aria-label={`Remover ${item.title} da playlist`}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
