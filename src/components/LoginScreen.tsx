import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "../auth";
import { IconClose, IconMark, IconMaximize, IconMinimize } from "./Icons";

type LoginMode = "password" | "signup";

function formatAuthError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Verifique suas credenciais.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "Este e-mail já está registrado. Selecione a aba 'Entrar'.";
  }
  if (lower.includes("password should be at least")) {
    return "A senha deve ter no mínimo 6 caracteres.";
  }
  if (lower.includes("rate limit")) {
    return "Muitas tentativas em sequência. Aguarde alguns instantes.";
  }
  return msg;
}

export function LoginScreen() {
  const { loginWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      if (!tabsRef.current) return;
      const activeBtn = tabsRef.current.querySelector<HTMLElement>(".login-modal__mode-btn.is-active");
      if (activeBtn) {
        const parentRect = tabsRef.current.getBoundingClientRect();
        const rect = activeBtn.getBoundingClientRect();
        setTabIndicator({
          left: rect.left - parentRect.left,
          width: rect.width,
          opacity: 1,
        });
      } else {
        setTabIndicator((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();
    const id = setTimeout(updateIndicator, 40);
    window.addEventListener("resize", updateIndicator);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [mode]);

  const handleTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const nextMode: LoginMode = mode === "password" ? "signup" : "password";
      setMode(nextMode);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Insira um endereço de e-mail válido.");
      return;
    }

    if (!password.trim()) {
      setErrorMsg("Insira sua senha.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setErrorMsg("A senha deve conter no mínimo 6 caracteres.");
        return;
      }
      setSubmitting(true);
      const res = await signUp(email, password, name);
      setSubmitting(false);
      if (res.ok) {
        setSuccessMsg(res.message || "Conta criada com sucesso! Conectando…");
      } else {
        setErrorMsg(formatAuthError(res.error || "Não foi possível criar a conta."));
      }
      return;
    }

    // Modo padrão: login com e-mail e senha
    setSubmitting(true);
    const res = await loginWithPassword(email, password);
    if (!res.ok) {
      setErrorMsg(formatAuthError(res.error || "Falha ao autenticar."));
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-screen__ambient" />
      <div className="login-modal cm-surface--spotlight" role="dialog" aria-modal="true" aria-labelledby="login-title">
        {/* Title bar simulando o client Steam */}
        <div className="login-modal__titlebar">
          <div className="login-modal__brand cm-spectrum-trigger">
            <IconMark size={18} />
            <span className="cm-glitch" data-text="LAB • Laboratório de Interação">LAB • Laboratório de Interação</span>
          </div>
          <div className="login-modal__controls" aria-hidden="true">
            <span><IconMinimize size={12} /></span>
            <span><IconMaximize size={10} /></span>
            <span className="is-close"><IconClose size={12} /></span>
          </div>
        </div>

        {/* Corpo do Login */}
        <form className="login-modal__content" onSubmit={handleSubmit}>
          <div className="login-modal__header">
            <div className="login-modal__badge">
              <IconMark size={46} />
            </div>
            <h1 id="login-title" className="login-modal__title font-display">INICIAR SESSÃO NO LAB</h1>
            <span className="cm-handwritten" style={{ fontSize: "17px", marginTop: "4px" }}>
              "menos ferramenta, mais sistema."
            </span>
          </div>

          {/* Abas com Spotlight Deslizante (MCP Caramelo) */}
          <div
            ref={tabsRef}
            className="login-modal__modes cm-spotlight-tabs"
            role="tablist"
            aria-label="Modo de autenticação"
            onKeyDown={handleTabKeyDown}
          >
            <span
              className="cm-spotlight-tabs__indicator"
              style={{
                transform: `translateX(${tabIndicator.left}px)`,
                width: `${tabIndicator.width}px`,
                opacity: tabIndicator.opacity,
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              role="tab"
              id="login-tab-password"
              aria-selected={mode === "password"}
              tabIndex={mode === "password" ? 0 : -1}
              className={`login-modal__mode-btn ${mode === "password" ? "is-active" : ""}`}
              onClick={() => {
                setMode("password");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              id="login-tab-signup"
              aria-selected={mode === "signup"}
              tabIndex={mode === "signup" ? 0 : -1}
              className={`login-modal__mode-btn ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Criar Conta
            </button>
          </div>

          {/* Feedback de Erro */}
          {errorMsg && (
            <div className="login-modal__error" role="alert">
              <span className="login-modal__error-icon">✕</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Feedback de Sucesso */}
          {successMsg && (
            <div className="login-modal__success" role="status">
              <span style={{ fontWeight: 800 }}>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Campo Nome (Apenas em Cadastro) */}
          {mode === "signup" && (
            <div className="login-field">
              <label className="login-field__label" htmlFor="lab-name">
                NOME OU APELIDO
              </label>
              <div className="login-field__input-wrap cm-field">
                <input
                  id="lab-name"
                  type="text"
                  className="login-field__input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Seu nome autoral"
                  autoComplete="name"
                />
                <span className="cm-field__beam" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Campo E-mail */}
          <div className="login-field">
            <label className="login-field__label" htmlFor="lab-email">
              E-MAIL
            </label>
            <div className={`login-field__input-wrap cm-field ${errorMsg && !email.trim() ? "is-invalid" : ""}`}>
              <input
                id="lab-email"
                type="email"
                className="login-field__input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="seuemail@exemplo.com"
                autoFocus
                autoComplete="email"
                required
              />
              <span className="cm-field__beam" aria-hidden="true" />
            </div>
          </div>

          {/* Campo Senha */}
          <div className="login-field">
            <label className="login-field__label" htmlFor="lab-password">
              SENHA
            </label>
            <div className={`login-field__input-wrap cm-field ${errorMsg && !password.trim() ? "is-invalid" : ""}`}>
              <input
                id="lab-password"
                type={showPassword ? "text" : "password"}
                className="login-field__input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Sua senha"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className="login-field__eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? "Ocultar" : "Exibir"}
              </button>
              <span className="cm-field__beam" aria-hidden="true" />
            </div>
          </div>

          {/* Lembrar neste navegador */}
          <label className="login-checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="login-checkbox__box" />
            <span className="login-checkbox__label">Lembrar sessão neste navegador</span>
          </label>

          {/* Botão de Envio com Micro-Interação Glitch */}
          <button
            type="submit"
            className="login-modal__submit cm-spectrum-trigger"
            disabled={submitting}
          >
            <span
              className="cm-glitch"
              data-text={
                submitting
                  ? "CONECTANDO…"
                  : mode === "signup"
                  ? "CRIAR CONTA"
                  : "INICIAR SESSÃO"
              }
            >
              {submitting
                ? "CONECTANDO…"
                : mode === "signup"
                ? "CRIAR CONTA"
                : "INICIAR SESSÃO"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
