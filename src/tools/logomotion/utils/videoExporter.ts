/**
 * Video Exporter
 * Captures the 1080x1920 canvas stream with audio tracks and encodes to MP4 / WebM.
 */

export interface ExportProgress {
  progress: number;
  status: string;
}

export async function exportCanvasVideo(
  canvas: HTMLCanvasElement,
  audioContext: AudioContext | null,
  audioSourceNode: AudioNode | null,
  durationSec: number,
  onProgress: (p: ExportProgress) => void
): Promise<Blob> {
  // Determine supported mime type
  const mimeTypes = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  let selectedMime = "";
  for (const m of mimeTypes) {
    if (MediaRecorder.isTypeSupported(m)) {
      selectedMime = m;
      break;
    }
  }

  if (!selectedMime) {
    throw new Error("Nenhum codec de gravação de vídeo suportado neste navegador.");
  }

  // 30 FPS stream from canvas
  const canvasStream = canvas.captureStream(30);

  // If audio is available, attach audio track
  if (audioContext && audioSourceNode) {
    const dest = audioContext.createMediaStreamDestination();
    audioSourceNode.connect(dest);
    const audioTracks = dest.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      canvasStream.addTrack(audioTracks[0]);
    }
  }

  const recorder = new MediaRecorder(canvasStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 12_000_000, // 12 Mbps for crystal clear 1080p
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const startTime = Date.now();
  const totalMs = durationSec * 1000;

  return new Promise((resolve, reject) => {
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(99, Math.round((elapsed / totalMs) * 100));
      onProgress({ progress: pct, status: `Renderizando frames e áudio... ${pct}%` });
    }, 150);

    recorder.onstop = () => {
      clearInterval(progressTimer);
      onProgress({ progress: 100, status: "Finalizando arquivo de vídeo..." });
      const blob = new Blob(chunks, { type: selectedMime });
      resolve(blob);
    };

    recorder.onerror = (e) => {
      clearInterval(progressTimer);
      reject(e);
    };

    recorder.start(100);

    setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, totalMs);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
