import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary capturou erro não tratado:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = "/library/home";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#101014",
            color: "#FFF4E8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "#18181F",
              border: "1px solid rgba(255, 112, 26, 0.3)",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "rgba(255, 112, 26, 0.15)",
                color: "#FF701A",
                display: "grid",
                placeItems: "center",
                fontSize: "24px",
                margin: "0 auto 16px",
              }}
            >
              ⚠️
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 8px", color: "#FFF4E8" }}>
              Ops! Algo inesperado aconteceu
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(255, 244, 232, 0.7)", margin: "0 0 24px", lineHeight: 1.5 }}>
              O LAB encontrou uma instabilidade ao carregar os dados. Você pode recarregar a tela ou limpar o cache local para restaurar a navegação.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "12px",
                  color: "#ff6b6b",
                  fontFamily: "monospace",
                  textAlign: "left",
                  marginBottom: "24px",
                  overflowX: "auto",
                  maxHeight: "120px",
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: "#FF701A",
                  color: "#101014",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Recarregar Página
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#FFF4E8",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Limpar Cache Local
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
