export type MusicSource = 'youtube' | 'spotify';
export type MusicItemType = 'track' | 'playlist';

export interface PlaylistItem {
  id: string;
  source: MusicSource;
  type: MusicItemType;
  url: string;
  embedUrl: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  addedBy?: string;
  addedAt: number;
}

export interface ParsedMusic {
  source: MusicSource;
  id: string;
  type: MusicItemType;
  embedUrl: string;
  fallbackTitle: string;
}

export const DEFAULT_COWORKING_PLAYLIST: PlaylistItem[] = [
  {
    id: 'lofi-girl-live',
    source: 'youtube',
    type: 'track',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    embedUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1',
    title: 'Lofi Hip Hop Radio 📚 Beats to Relax / Study to',
    artist: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    addedBy: 'LAB Caramelo',
    addedAt: 1730000000000,
  },
  {
    id: 'spotify-study-beats',
    source: 'spotify',
    type: 'playlist',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator&theme=0',
    title: 'Chill Lofi Study Beats',
    artist: 'Spotify',
    addedBy: 'LAB Caramelo',
    addedAt: 1730000100000,
  },
  {
    id: 'lofi-synthwave-live',
    source: 'youtube',
    type: 'track',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    embedUrl: 'https://www.youtube-nocookie.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1',
    title: 'Synthwave Radio 🌌 Chill Synth Beats',
    artist: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    addedBy: 'LAB Caramelo',
    addedAt: 1730000200000,
  },
];

export function parseMusicUrl(rawUrl: string): ParsedMusic | null {
  const url = rawUrl.trim();
  if (!url) return null;

  // 1. YouTube
  const ytPlaylistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  const ytVideoMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);

  if (ytPlaylistMatch && !ytVideoMatch) {
    const listId = ytPlaylistMatch[1];
    return {
      source: 'youtube',
      id: listId,
      type: 'playlist',
      embedUrl: `https://www.youtube-nocookie.com/embed/videoseries?list=${listId}&autoplay=1&enablejsapi=1`,
      fallbackTitle: 'Playlist do YouTube',
    };
  }

  if (ytVideoMatch) {
    const videoId = ytVideoMatch[1];
    const listParam = ytPlaylistMatch ? `&list=${ytPlaylistMatch[1]}` : '';
    return {
      source: 'youtube',
      id: videoId,
      type: ytPlaylistMatch ? 'playlist' : 'track',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1${listParam}`,
      fallbackTitle: 'Vídeo do YouTube',
    };
  }

  // 2. Spotify
  const spotifyMatch = url.match(/open\.spotify\.com\/(?:intl-[a-z]{2,5}\/)?(track|playlist|album)\/([a-zA-Z0-9]+)/i);
  if (spotifyMatch) {
    const [, kind, spotifyId] = spotifyMatch;
    return {
      source: 'spotify',
      id: spotifyId,
      type: kind === 'track' ? 'track' : 'playlist',
      embedUrl: `https://open.spotify.com/embed/${kind}/${spotifyId}?utm_source=generator&theme=0`,
      fallbackTitle: kind === 'playlist' ? 'Playlist do Spotify' : kind === 'album' ? 'Álbum do Spotify' : 'Faixa do Spotify',
    };
  }

  return null;
}

export async function resolveTrackMetadata(parsed: ParsedMusic): Promise<{
  title: string;
  artist?: string;
  thumbnailUrl?: string;
}> {
  if (parsed.source === 'spotify') {
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/${parsed.type === 'playlist' ? 'playlist' : 'track'}/${parsed.id}`);
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title || parsed.fallbackTitle,
          thumbnailUrl: data.thumbnail_url,
        };
      }
    } catch {
      // continua para o fallback
    }
    return { title: parsed.fallbackTitle };
  }

  if (parsed.source === 'youtube') {
    const thumbnailUrl = parsed.id && parsed.type === 'track' ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg` : undefined;
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${parsed.id}&format=json`);
      if (res.ok) {
        const data = await res.json();
        const htmlMatch = data.html && typeof data.html === 'string' ? data.html.match(/title="([^"]+)"/) : null;
        const title = data.title || (htmlMatch ? htmlMatch[1] : null);
        return {
          title: title || parsed.fallbackTitle,
          artist: data.author_name,
          thumbnailUrl: data.thumbnail_url || thumbnailUrl,
        };
      }
    } catch {
      // continua para o fallback
    }
    return { title: parsed.fallbackTitle, thumbnailUrl };
  }

  return { title: parsed.fallbackTitle };
}

const STORAGE_PREFIX = 'comunidade:music:';

export function loadPlaylist(channelId: string): PlaylistItem[] {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${channelId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_COWORKING_PLAYLIST;
}

export function savePlaylist(channelId: string, items: PlaylistItem[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${channelId}`, JSON.stringify(items));
  } catch {
    // localStorage indisponível
  }
}

export interface RadioState {
  playlist: PlaylistItem[];
  currentIndex: number;
  trackStartedAt: number;
  isPlaying: boolean;
  updatedAt: number;
}

const RADIO_PREFIX = 'comunidade:radio:';
const radioListeners = new Map<string, Set<(s: RadioState) => void>>();

export function subscribeRadioState(channelId: string, callback: (s: RadioState) => void): () => void {
  if (!radioListeners.has(channelId)) {
    radioListeners.set(channelId, new Set());
  }
  radioListeners.get(channelId)!.add(callback);
  return () => {
    radioListeners.get(channelId)?.delete(callback);
  };
}

export function broadcastRadioLocal(channelId: string, state: RadioState): void {
  const set = radioListeners.get(channelId);
  if (set) {
    set.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        console.error('[radio] erro no listener local:', err);
      }
    });
  }
}

export function loadRadioState(channelId: string): RadioState {
  try {
    const saved = localStorage.getItem(`${RADIO_PREFIX}${channelId}`);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<RadioState>;
      if (Array.isArray(parsed.playlist) && parsed.playlist.length > 0) {
        return {
          playlist: parsed.playlist,
          currentIndex: typeof parsed.currentIndex === 'number' ? Math.min(parsed.currentIndex, parsed.playlist.length - 1) : 0,
          trackStartedAt: typeof parsed.trackStartedAt === 'number' ? parsed.trackStartedAt : Date.now(),
          isPlaying: typeof parsed.isPlaying === 'boolean' ? parsed.isPlaying : true,
          updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
        };
      }
    }
  } catch {
    // fallback
  }
  const playlist = loadPlaylist(channelId);
  return {
    playlist,
    currentIndex: 0,
    trackStartedAt: Date.now(),
    isPlaying: true,
    updatedAt: Date.now(),
  };
}

export function saveRadioState(channelId: string, state: RadioState): void {
  try {
    localStorage.setItem(`${RADIO_PREFIX}${channelId}`, JSON.stringify(state));
    savePlaylist(channelId, state.playlist);
  } catch {
    // ignore
  }
}

export function getRadioEmbedUrl(track: PlaylistItem, trackStartedAt: number): string {
  if (track.source === 'spotify') {
    return track.embedUrl;
  }
  const now = Date.now();
  const elapsedSec = Math.max(0, Math.floor((now - trackStartedAt) / 1000));

  // Se for live stream ou início recente (menos de 3s), usa a URL base
  if (elapsedSec < 3 || track.id.includes('live') || track.url.includes('live')) {
    return track.embedUrl;
  }

  try {
    const u = new URL(track.embedUrl);
    u.searchParams.set('start', String(elapsedSec));
    return u.toString();
  } catch {
    return `${track.embedUrl}&start=${elapsedSec}`;
  }
}
