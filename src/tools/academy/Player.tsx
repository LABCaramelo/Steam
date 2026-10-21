import { useEffect, useRef, useState } from "react";
import { safeMedia, videoId } from "./media";
import type { Lesson } from "./types";

interface YtPlayer { getCurrentTime(): number; destroy(): void; }
interface YtApi { Player: new (element: HTMLElement, options: { videoId: string; playerVars: Record<string, string | number>; events: { onReady: () => void; onStateChange: (e: { data: number }) => void; onError: () => void } }) => YtPlayer; }
type YtWindow = Window & { YT?: YtApi; onYouTubeIframeAPIReady?: () => void };
let youtubeReady: Promise<YtApi> | undefined;
function youtube(): Promise<YtApi> {
  const win = window as YtWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (!youtubeReady) youtubeReady = new Promise<YtApi>((resolve, reject) => {
    const timeout = window.setTimeout(() => { youtubeReady = undefined; reject(new Error("YouTube indisponível")); }, 20000);
    win.onYouTubeIframeAPIReady = () => { window.clearTimeout(timeout); resolve(win.YT!); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => { window.clearTimeout(timeout); youtubeReady = undefined; reject(new Error("YouTube indisponível")); };
    document.head.append(script);
  });
  return youtubeReady;
}

export function Player({ lesson, start, onProgress, onEnded }: { lesson: Lesson; start: number; onProgress: (seconds: number) => void; onEnded: () => void }) {
  const [error, setError] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const callbacks = useRef({ onProgress, onEnded });
  callbacks.current = { onProgress, onEnded };
  const initial = useRef(start);
  const last = useRef(start);
  const raw = safeMedia(lesson.video_ref);
  const id = lesson.video_kind === "youtube" || lesson.video_kind === "vimeo" ? videoId(lesson.video_kind, lesson.video_ref) : null;

  useEffect(() => {
    if (lesson.video_kind !== "youtube" || !id) return;
    let alive = true;
    let player: YtPlayer | undefined;
    let ready = false;
    let played = false;
    let timer = 0;
    const report = () => {
      if (!player || !ready || !played || typeof player.getCurrentTime !== "function") return;
      const position = player.getCurrentTime();
      if (!Number.isFinite(position) || position < 0) return;
      last.current = Math.floor(position);
      callbacks.current.onProgress(last.current);
    };
    youtube().then((api) => {
      if (!alive || !holder.current) return;
      const target = document.createElement("div");
      holder.current.append(target);
      player = new api.Player(target, { videoId: id, playerVars: { playsinline: 1, start: initial.current, origin: location.origin, rel: 0 }, events: {
        onReady: () => { ready = true; },
        onStateChange: (e) => { if (e.data === 1) played = true; if (e.data === 0 && played) { report(); callbacks.current.onEnded(); } else if (e.data === 2) report(); },
        onError: () => { if (alive) setError(true); },
      } });
      timer = window.setInterval(report, 10000);
    }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; clearInterval(timer); if (player) { report(); player.destroy(); } };
  }, [lesson.video_kind, id]);

  useEffect(() => {
    if (lesson.video_kind !== "vimeo" || !id) return;
    const message = (event: MessageEvent) => {
      if (event.origin !== "https://player.vimeo.com" || event.source !== frame.current?.contentWindow) return;
      let data;
      try { data = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
      if (data?.event === "ready") {
        const send = (method: string, value: unknown) => frame.current?.contentWindow?.postMessage({ method, value }, "https://player.vimeo.com");
        send("setCurrentTime", initial.current);
        send("addEventListener", "timeupdate"); send("addEventListener", "ended");
      }
      if (data?.event === "timeupdate" && Number.isFinite(data.data?.seconds)) {
        const seconds = Math.floor(data.data.seconds);
        if (Math.abs(seconds - last.current) >= 10) { last.current = seconds; callbacks.current.onProgress(seconds); }
      }
      if (data?.event === "ended") callbacks.current.onEnded();
    };
    window.addEventListener("message", message);
    return () => { window.removeEventListener("message", message); callbacks.current.onProgress(last.current); };
  }, [lesson.video_kind, id]);

  if (error) return <div className="ac-player__error" role="alert">O player não carregou. Confira sua conexão e abra a aula novamente.</div>;
  if (lesson.video_kind === "youtube" && id) return <div className="ac-player__embed" ref={holder} aria-label={`Vídeo: ${lesson.title}`} />;
  if (lesson.video_kind === "vimeo" && id) return <iframe ref={frame} title={lesson.title} src={`https://player.vimeo.com/video/${id}?api=1#t=${initial.current}s`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />;
  if (lesson.video_kind === "page" && raw?.startsWith("/aula-head/")) return <iframe className="ac-player__page" title={lesson.title} src={raw} allow="fullscreen; autoplay; picture-in-picture; clipboard-write" allowFullScreen />;
  if (lesson.video_kind === "video" && raw) return <video controls playsInline preload="metadata" poster={safeMedia(lesson.cover_url) ?? undefined} src={raw} onLoadedMetadata={(e) => { e.currentTarget.currentTime = Math.min(initial.current, e.currentTarget.duration || 0); }} onTimeUpdate={(e) => {
    const seconds = Math.floor(e.currentTarget.currentTime);
    if (Math.abs(seconds - last.current) >= 10) { last.current = seconds; onProgress(seconds); }
  }} onPause={(e) => onProgress(Math.floor(e.currentTarget.currentTime))} onEnded={onEnded} onError={() => setError(true)} />;
  return <div className="ac-player__error">O LAB ainda não adicionou um vídeo válido a esta aula.</div>;
}
