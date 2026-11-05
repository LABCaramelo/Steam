import type { WidgetData } from "../../types";

export function QuestionBoxWidget({ data }: { data: WidgetData }) {
  const bg = data.primaryColor || "#101014";
  const textColor = data.textColor || "#FFF4E8";

  return (
    <div
      style={{
        width: 600,
        borderRadius: 28,
        background: "#FFFFFF",
        boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: bg,
          color: textColor,
          padding: "24px 28px",
          fontWeight: 700,
          fontSize: 26,
          lineHeight: 1.3,
          letterSpacing: -0.5,
        }}
      >
        {data.question || "Faça uma pergunta para mim..."}
      </div>

      {/* Input mockup */}
      <div style={{ padding: "24px 28px 28px" }}>
        <div
          style={{
            background: "#F2F2F5",
            borderRadius: 18,
            padding: "18px 22px",
            color: "#8E8E93",
            fontSize: 22,
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Digite algo...</span>
          <span style={{ fontSize: 24, opacity: 0.6 }}>💬</span>
        </div>
      </div>
    </div>
  );
}

export function PollWidget({ data }: { data: WidgetData }) {
  const primary = data.primaryColor || "#FF701A";
  const votesA = data.votesA ?? 75;
  const votesB = data.votesB ?? 25;

  return (
    <div
      style={{
        width: 620,
        borderRadius: 30,
        background: "rgba(255, 255, 255, 0.96)",
        backdropFilter: "blur(20px)",
        padding: "28px 30px",
        boxShadow: "0 20px 48px rgba(0,0,0,0.35)",
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#101014",
          marginBottom: 22,
          lineHeight: 1.3,
        }}
      >
        {data.question || "Qual o seu veredito?"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Option A */}
        <div
          style={{
            position: "relative",
            background: "#F0F0F3",
            borderRadius: 18,
            overflow: "hidden",
            height: 64,
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            justifyContent: "space-between",
            fontSize: 22,
            fontWeight: 700,
            color: "#101014",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${votesA}%`,
              background: primary,
              opacity: 0.25,
            }}
          />
          <span style={{ position: "relative", zIndex: 1 }}>{data.optionA || "Sim 🔥"}</span>
          <span style={{ position: "relative", zIndex: 1, color: primary }}>{votesA}%</span>
        </div>

        {/* Option B */}
        <div
          style={{
            position: "relative",
            background: "#F0F0F3",
            borderRadius: 18,
            overflow: "hidden",
            height: 64,
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            justifyContent: "space-between",
            fontSize: 22,
            fontWeight: 700,
            color: "#101014",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              bottom: 0,
              width: `${votesB}%`,
              background: "#8E8E93",
              opacity: 0.2,
            }}
          />
          <span style={{ position: "relative", zIndex: 1 }}>{data.optionB || "Não 😅"}</span>
          <span style={{ position: "relative", zIndex: 1, color: "#555" }}>{votesB}%</span>
        </div>
      </div>
    </div>
  );
}

export function SliderWidget({ data }: { data: WidgetData }) {
  const emoji = data.emoji || "🔥";
  const pos = data.sliderPosition ?? 70; // 0 to 100

  return (
    <div
      style={{
        width: 580,
        borderRadius: 28,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(18px)",
        padding: "24px 28px",
        boxShadow: "0 18px 45px rgba(0,0,0,0.3)",
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 25,
          fontWeight: 700,
          color: "#101014",
          marginBottom: 20,
        }}
      >
        {data.question || "O quanto você gostou disso?"}
      </div>

      <div
        style={{
          position: "relative",
          height: 52,
          background: "#E5E5EA",
          borderRadius: 26,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
        }}
      >
        {/* Progress track */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pos}%`,
            background: "linear-gradient(90deg, #FF701A, #FF3D8D)",
            borderRadius: 26,
            opacity: 0.85,
          }}
        />

        {/* Draggable emoji puck */}
        <div
          style={{
            position: "absolute",
            left: `calc(${pos}% - 26px)`,
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            userSelect: "none",
          }}
        >
          {emoji}
        </div>
      </div>
    </div>
  );
}

export function CountdownWidget({ data }: { data: WidgetData }) {
  const primary = data.primaryColor || "#FF701A";

  return (
    <div
      style={{
        width: 600,
        borderRadius: 26,
        background: "#16161C",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 22px 50px rgba(0,0,0,0.5)",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          fontSize: 20,
          fontWeight: 700,
          color: primary,
          letterSpacing: 2,
        }}
      >
        <span>⏳</span>
        <span>{data.countdownTitle || "CONTAGEM REGRESSIVA"}</span>
      </div>

      <div
        style={{
          padding: "26px 20px",
          display: "flex",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {[
          { num: "02", label: "DIAS" },
          { num: "14", label: "HORAS" },
          { num: "35", label: "MIN" },
          { num: "00", label: "SEG" },
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              background: "#22222A",
              borderRadius: 14,
              padding: "14px 16px",
              minWidth: 95,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 38, fontWeight: 800, color: "#FFF4E8", lineHeight: 1 }}>
              {item.num}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#A0A0B0",
                marginTop: 6,
                letterSpacing: 1,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LinkStickerWidget({ data }: { data: WidgetData }) {
  const bg = data.primaryColor || "#FFFFFF";
  const textColor = data.textColor || "#101014";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: bg,
        color: textColor,
        padding: "16px 32px",
        borderRadius: 40,
        boxShadow: "0 14px 35px rgba(0,0,0,0.3)",
        fontWeight: 700,
        fontSize: 24,
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: 0.5,
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 26 }}>🔗</span>
      <span>{data.linkText || "CONFIRA O LINK"}</span>
      <span style={{ fontSize: 20, opacity: 0.7 }}>↗</span>
    </div>
  );
}

export function MusicStickerWidget({ data }: { data: WidgetData }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        background: "rgba(16, 16, 20, 0.88)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: 40,
        padding: "12px 24px 12px 14px",
        color: "#FFF4E8",
        boxShadow: "0 14px 35px rgba(0,0,0,0.4)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FF701A, #7657FF)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        🎵
      </div>
      <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
          {data.musicTitle || "Um Cara Caramelo — Tema"}
        </span>
        <span style={{ fontSize: 15, color: "#A0A0AA" }}>
          {data.musicArtist || "Trilha Oficial · 2026"}
        </span>
      </div>
      {/* Equalizer wave simulation */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 20, marginLeft: 8 }}>
        <span style={{ width: 4, height: 16, background: "#FF701A", borderRadius: 2 }} />
        <span style={{ width: 4, height: 24, background: "#FF701A", borderRadius: 2 }} />
        <span style={{ width: 4, height: 12, background: "#FF701A", borderRadius: 2 }} />
        <span style={{ width: 4, height: 20, background: "#FF701A", borderRadius: 2 }} />
      </div>
    </div>
  );
}

export function MentionStickerWidget({ data }: { data: WidgetData }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "linear-gradient(90deg, #F58529, #DD2A7B, #8134AF)",
        color: "#FFFFFF",
        padding: "14px 28px",
        borderRadius: 36,
        fontWeight: 800,
        fontSize: 26,
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        fontFamily: "'Inter', sans-serif",
        letterSpacing: -0.5,
      }}
    >
      @{data.username || "umcaracaramelo"}
    </div>
  );
}
