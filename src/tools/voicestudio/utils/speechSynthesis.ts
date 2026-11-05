export interface ParsedSpeechSegment {
  text: string;
  pauseAfterMs: number;
  pitchMultiplier: number;
  rateMultiplier: number;
  volume: number;
}

/** Parses expressive intention tags into structured speech segments */
export function parseExpressionTags(rawText: string): ParsedSpeechSegment[] {
  const segments: ParsedSpeechSegment[] = [];

  // Split by line breaks or punctuation to retain natural pauses
  const lines = rawText.split(/\n+/).filter((l) => l.trim().length > 0);

  for (const line of lines) {
    let cleanText = line;
    let pauseAfterMs = 350;
    let pitchMultiplier = 1.0;
    let rateMultiplier = 1.0;
    let volume = 1.0;

    // Check expression tags
    if (/\[pausa:\s*0\.?5s?\]/i.test(cleanText) || /\[pausa\s+0\.?5s?\]/i.test(cleanText)) {
      pauseAfterMs = 500;
      cleanText = cleanText.replace(/\[pausa[:\s]*0\.?5s?\]/gi, "");
    } else if (/\[pausa:\s*1(\.0)?s?\]/i.test(cleanText) || /\[pausa\s+1(\.0)?s?\]/i.test(cleanText)) {
      pauseAfterMs = 1000;
      cleanText = cleanText.replace(/\[pausa[:\s]*1(\.0)?s?\]/gi, "");
    } else if (/\[pausa:\s*2(\.0)?s?\]/i.test(cleanText)) {
      pauseAfterMs = 2000;
      cleanText = cleanText.replace(/\[pausa[:\s]*2(\.0)?s?\]/gi, "");
    }

    if (/\[ênfase\]|\[enfase\]/i.test(cleanText)) {
      pitchMultiplier = 1.15;
      rateMultiplier = 0.92;
      cleanText = cleanText.replace(/\[ênfase\]|\[enfase\]/gi, "");
    }

    if (/\[sussurro\]/i.test(cleanText)) {
      volume = 0.45;
      pitchMultiplier = 0.95;
      rateMultiplier = 0.88;
      cleanText = cleanText.replace(/\[sussurro\]/gi, "");
    }

    if (/\[confissão\]|\[confissao\]/i.test(cleanText)) {
      pitchMultiplier = 0.92;
      rateMultiplier = 0.95;
      volume = 0.85;
      pauseAfterMs += 250;
      cleanText = cleanText.replace(/\[confissão\]|\[confissao\]/gi, "");
    }

    if (/\[sorriso na voz\]/i.test(cleanText)) {
      pitchMultiplier = 1.1;
      rateMultiplier = 1.05;
      cleanText = cleanText.replace(/\[sorriso na voz\]/gi, "");
    }

    if (/\[tom grave\]/i.test(cleanText)) {
      pitchMultiplier = 0.82;
      cleanText = cleanText.replace(/\[tom grave\]/gi, "");
    }

    if (/\[energia alta\]|\[energia\]/i.test(cleanText)) {
      rateMultiplier = 1.15;
      pitchMultiplier = 1.08;
      cleanText = cleanText.replace(/\[energia alta\]|\[energia\]/gi, "");
    }

    cleanText = cleanText.trim();
    if (cleanText) {
      segments.push({
        text: cleanText,
        pauseAfterMs,
        pitchMultiplier,
        rateMultiplier,
        volume,
      });
    }
  }

  return segments;
}

/** Returns available voices in the browser */
export function getBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 600);
  });
}

/** Finds the best available Portuguese voice or a specified voice */
export async function findBestVoice(lang = "pt-BR"): Promise<SpeechSynthesisVoice | null> {
  const voices = await getBrowserVoices();
  if (voices.length === 0) return null;

  // 1. Exact language match with preference for natural/neural voices
  const ptVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase().slice(0, 2)));
  if (ptVoices.length > 0) {
    const naturalVoice = ptVoices.find((v) =>
      /natural|google|microsoft|luciana|felipe|francisca|antonio/i.test(v.name)
    );
    return naturalVoice || ptVoices[0];
  }

  // 2. Fallback to default
  const defaultVoice = voices.find((v) => v.default);
  return defaultVoice || voices[0];
}

/** Speaks a single text segment using SpeechSynthesis */
export function speakSegment(
  segment: ParsedSpeechSegment,
  voice: SpeechSynthesisVoice | null,
  baseSpeed = 1.0,
  basePitch = 1.0
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(segment.text);
    if (voice) utterance.voice = voice;
    utterance.rate = Math.max(0.5, Math.min(2.0, baseSpeed * segment.rateMultiplier));
    utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch * segment.pitchMultiplier));
    utterance.volume = Math.max(0.1, Math.min(1.0, segment.volume));

    utterance.onend = () => {
      setTimeout(resolve, segment.pauseAfterMs);
    };

    utterance.onerror = (e) => {
      // Don't reject if cancelled manually
      if (e.error === "canceled") resolve();
      else reject(new Error(`Erro na síntese: ${e.error}`));
    };

    window.speechSynthesis.speak(utterance);
  });
}

/** Cancels any active speech synthesis */
export function stopSpeechSynthesis(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
