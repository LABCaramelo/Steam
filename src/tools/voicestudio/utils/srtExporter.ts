export interface SubtitleCue {
  index: number;
  startTimeSec: number;
  endTimeSec: number;
  text: string;
}

/** Formats seconds to SRT timecode: HH:MM:SS,mmm */
export function formatSrtTime(totalSeconds: number): string {
  const sec = Math.max(0, totalSeconds);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);
  const milliseconds = Math.floor((sec % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/** Exports subtitle cues into standard SRT string */
export function generateSRT(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue) =>
        `${cue.index}\n${formatSrtTime(cue.startTimeSec)} --> ${formatSrtTime(cue.endTimeSec)}\n${cue.text}\n`
    )
    .join("\n");
}

/**
 * Filtro Copy Caramelo:
 * Transforms spoken, rambling stream-of-consciousness into sharp, high-retention copy.
 * - Removes verbal crutches ("tipo assim", "né", "éee", "então tá")
 * - Enforces cadence: shorter sentences with sharp punchlines
 * - Adds pauses and contrast
 */
export function applyCopyFilter(rawSpeech: string): string {
  if (!rawSpeech.trim()) return "";

  let text = rawSpeech;

  // Remove verbal crutches & filler words
  const fillers = [
    /\b(tipo assim|tipo|tipo que)\b/gi,
    /\b(né|ne|sabe\?|sabe né)\b/gi,
    /\b(éee+|ãaa+|hmmm+)\b/gi,
    /\b(aí tipo|aí então|daí então)\b/gi,
    /\b(enfim né|com certeza absoluta)\b/gi,
    /\b(basicamente|obviamente)\b/gi,
  ];

  for (const regex of fillers) {
    text = text.replace(regex, "");
  }

  // Clean double spaces
  text = text.replace(/\s{2,}/g, " ").trim();

  // Split into sentences
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return text;

  // Format with Caramelo rhythm (1 to 2 sentences per block, strong contrast)
  const formattedBlocks: string[] = [];
  let currentBlock: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    // Capitalize first letter
    const capitalized = s.charAt(0).toUpperCase() + s.slice(1);
    currentBlock.push(capitalized);

    if (currentBlock.length >= 2 || s.length > 80 || i === sentences.length - 1) {
      formattedBlocks.push(currentBlock.join(" "));
      currentBlock = [];
    }
  }

  return formattedBlocks.join("\n\n");
}

/** Trigger download of a text or SRT file */
export function downloadTextFile(filename: string, content: string, mimeType = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
