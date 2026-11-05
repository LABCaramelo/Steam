export function SafeZonesOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Safe Limit guide line (Instagram UI top ~180px) */}
      <div
        style={{
          height: 180,
          borderBottom: "1.5px dashed rgba(255, 112, 26, 0.5)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: "6px 16px",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#FF701A",
            fontWeight: 700,
            letterSpacing: 0.5,
            background: "rgba(16, 16, 20, 0.75)",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          ▲ Limite Superior Instagram (180px)
        </span>
      </div>

      {/* Bottom Safe Limit guide line (Instagram UI bottom ~240px) */}
      <div
        style={{
          height: 240,
          borderTop: "1.5px dashed rgba(255, 112, 26, 0.5)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "6px 16px",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#FF701A",
            fontWeight: 700,
            letterSpacing: 0.5,
            background: "rgba(16, 16, 20, 0.75)",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          ▼ Limite Inferior Instagram (240px)
        </span>
      </div>
    </div>
  );
}
