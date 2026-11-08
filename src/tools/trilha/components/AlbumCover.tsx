import React, { useMemo } from "react";

interface AlbumCoverProps {
  seed: string;
  title?: string;
  bpm?: number;
  keyScale?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
}

// Pseudo-random deterministic generator based on seed string
class SeededRandom {
  private seed: number;

  constructor(seedStr: string) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    this.seed = Math.abs(hash) || 1234567;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length)];
  }
}

// Official Caramelo and Music Palettes
const PALETTES = [
  // Caramelo Classic
  { colors: ["#FF701A", "#FFF4E8", "#25BFFF", "#FF3D8D"], bg: "#101014" },
  // Electric Sunset
  { colors: ["#FF701A", "#FFD52A", "#FF3D8D", "#7657FF"], bg: "#0d0914" },
  // Cyber Savassi
  { colors: ["#25BFFF", "#7657FF", "#FF3D8D", "#FFF4E8"], bg: "#080c14" },
  // Acid Groove
  { colors: ["#FFD52A", "#FF701A", "#25BFFF", "#101014"], bg: "#14140a" },
  // Midnight Velvet
  { colors: ["#7657FF", "#25BFFF", "#FF701A", "#FFF4E8"], bg: "#0b0817" },
  // Warm Cassette
  { colors: ["#FF701A", "#FFF4E8", "#FFD52A", "#25BFFF"], bg: "#16110e" },
];

export const AlbumCover: React.FC<AlbumCoverProps> = ({
  seed,
  title,
  bpm,
  keyScale,
  size = "md",
  className = "",
  showBadge = true,
}) => {
  const { bgStyle, patternType, palette, initials, randomAngles } = useMemo(() => {
    const rng = new SeededRandom(seed);
    const pal = rng.pick(PALETTES);
    const patterns = ["mesh", "aurora", "circles", "stripes", "waves", "abstract"];
    const pat = rng.pick(patterns);
    const angle1 = rng.int(20, 340);
    const angle2 = rng.int(20, 340);

    const init = title
      ? title
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() || "")
          .join("")
      : "TR";

    return {
      bgStyle: {
        backgroundColor: pal.bg,
      },
      patternType: pat,
      palette: pal,
      initials: init,
      randomAngles: [angle1, angle2],
    };
  }, [seed, title]);

  const sizeClasses = {
    sm: "w-12 h-12 rounded-lg text-xs",
    md: "w-24 h-24 rounded-xl text-sm",
    lg: "w-48 h-48 rounded-2xl text-base",
    xl: "w-72 h-72 rounded-3xl text-lg",
  }[size];

  return (
    <div
      className={`relative overflow-hidden flex flex-col justify-between p-3 select-none shadow-xl border border-white/10 ${sizeClasses} ${className}`}
      style={bgStyle}
    >
      {/* Background Graphic Layer */}
      <div className="absolute inset-0 pointer-events-none opacity-85">
        {patternType === "aurora" && (
          <div
            className="w-full h-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${palette.colors[0]}88 0%, transparent 60%),
                           radial-gradient(circle at 75% 70%, ${palette.colors[2]}88 0%, transparent 65%),
                           linear-gradient(${randomAngles[0]}deg, ${palette.colors[1]}33 0%, ${palette.colors[3]}55 100%)`,
            }}
          />
        )}
        {patternType === "mesh" && (
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                radial-gradient(at 0% 0%, ${palette.colors[0]}99 0px, transparent 50%),
                radial-gradient(at 100% 0%, ${palette.colors[2]}88 0px, transparent 50%),
                radial-gradient(at 100% 100%, ${palette.colors[3]}99 0px, transparent 50%),
                radial-gradient(at 0% 100%, ${palette.colors[1]}44 0px, transparent 50%)
              `,
            }}
          />
        )}
        {patternType === "circles" && (
          <svg className="w-full h-full opacity-60" viewBox="0 0 100 100">
            <circle cx="30" cy="30" r="35" fill={palette.colors[0]} opacity="0.6" />
            <circle cx="70" cy="70" r="40" fill={palette.colors[2]} opacity="0.5" />
            <circle cx="85" cy="20" r="20" fill={palette.colors[3]} opacity="0.7" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="#FFF4E8" strokeWidth="2" opacity="0.4" />
          </svg>
        )}
        {patternType === "stripes" && (
          <div
            className="w-full h-full opacity-50"
            style={{
              background: `repeating-linear-gradient(${randomAngles[1]}deg, ${palette.colors[0]}44, ${palette.colors[0]}44 10px, transparent 10px, transparent 20px)`,
            }}
          />
        )}
        {(patternType === "waves" || patternType === "abstract") && (
          <svg className="w-full h-full opacity-70" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,40 Q25,20 50,45 T100,30 L100,100 L0,100 Z" fill={palette.colors[0]} opacity="0.5" />
            <path d="M0,60 Q35,75 70,50 T100,70 L100,100 L0,100 Z" fill={palette.colors[2]} opacity="0.6" />
            <circle cx="50" cy="35" r="16" fill={palette.colors[1]} opacity="0.3" />
          </svg>
        )}
      </div>

      {/* Vinyl Groove Rings Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, transparent 25%, #fff 26%, transparent 27%, transparent 45%, #fff 46%, transparent 47%, transparent 70%, #fff 71%, transparent 72%)",
        }}
      />

      {/* Halftone / Grain Noise Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      />

      {/* Top Details / Badges */}
      <div className="relative z-10 flex items-center justify-between">
        {showBadge && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-black/60 text-[#FFF4E8] backdrop-blur-sm border border-white/10">
            TRILHA
          </span>
        )}
        {bpm && size !== "sm" && (
          <span className="text-[10px] font-mono font-bold text-white/80 bg-black/40 px-1 rounded backdrop-blur-sm">
            {bpm} BPM
          </span>
        )}
      </div>

      {/* Center Initials or Visual Emblem */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <span
          className="font-black tracking-tighter opacity-90 text-white drop-shadow-lg"
          style={{
            fontSize: size === "sm" ? "14px" : size === "md" ? "26px" : size === "lg" ? "52px" : "74px",
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          {initials}
        </span>
      </div>

      {/* Bottom Information */}
      {size !== "sm" && (
        <div className="relative z-10 flex flex-col gap-0.5">
          {title && (
            <p className="text-xs font-bold text-white truncate drop-shadow leading-tight">
              {title}
            </p>
          )}
          {keyScale && (
            <p className="text-[9px] font-mono text-white/70 truncate">
              {keyScale}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
