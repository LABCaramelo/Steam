import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { IconClose, IconMark, IconMaximize, IconMinimize } from "./Icons";

type LoginMode = "password" | "signup" | "magic" | "master";

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
  const { loginWithPassword, signUp, loginWithOtp, loginWithMasterPassword } = useAuth();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === "master") {
      if (!password.trim()) {
        setErrorMsg("Insira a chave de acesso.");
        return;
      }
      setSubmitting(true);
      setTimeout(() => {
        const ok = loginWithMasterPassword(password, remember);
        if (!ok) {
          setErrorMsg("Chave de acesso incorreta. Tente novamente.");
          setSubmitting(false);
        }
      }, 200);
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Insira um endereço de e-mail válido.");
      return;
    }

    if (mode === "magic") {
      setSubmitting(true);
      const res = await loginWithOtp(email);
      setSubmitting(false);
      if (res.ok) {
        setSuccessMsg("Link mágico enviado! Verifique sua caixa de entrada para entrar diretamente.");
      } else {
        setErrorMsg(formatAuthError(res.error || "Falha ao enviar link de acesso."));
      }
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
            <p className="login-modal__subtitle">
              Autenticação unificada do ecossistema Caramelo via Supabase.
            </p>
            <span className="cm-handwritten" style={{ fontSize: "16px", marginTop: "2px" }}>
              "menos ferramenta, mais sistema."
            </span>
          </div>

          {/* Abas de Modo de Autenticação */}
          <div className="login-modal__modes" role="tablist" aria-label="Modo de autenticação">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "password"}
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
              aria-selected={mode === "signup"}
              className={`login-modal__mode-btn ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Criar Conta
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "magic"}
              className={`login-modal__mode-btn ${mode === "magic" ? "is-active" : ""}`}
              onClick={() => {
                setMode("magic");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Link Mágico
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "master"}
              className={`login-modal__mode-btn ${mode === "master" ? "is-active" : ""}`}
              onClick={() => {
                setMode("master");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
            >
              Chave
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
            <div className="login-field cm-field">
              <label className="login-field__label" htmlFor="lab-name">
                NOME OU APELIDO
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="lab-name"
                  type="text"
                  className="login-field__input cm-field__input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Seu nome autoral"
                  autoComplete="name"
                />
              </div>
              <span className="cm-field__beam" aria-hidden="true" />
            </div>
          )}

          {/* Campo E-mail (Para Password, Signup e Magic Link) */}
          {mode !== "master" && (
            <div className="login-field cm-field">
              <label className="login-field__label" htmlFor="lab-email">
                E-MAIL SUPABASE
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="lab-email"
                  type="email"
                  className="login-field__input cm-field__input"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="exemplo@caramelo.com"
                  autoFocus
                  autoComplete="email"
                  required
                />
              </div>
              <span className="cm-field__beam" aria-hidden="true" />
            </div>
          )}

          {/* Campo Senha (Para Password, Signup e Master Key) */}
          {mode !== "magic" && (
            <div className="login-field cm-field">
              <label className="login-field__label" htmlFor="lab-password">
                {mode === "master" ? "CHAVE DE ACESSO" : "SENHA"}
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="lab-password"
                  type={showPassword ? "text" : "password"}
                  className={`login-field__input cm-field__input ${errorMsg ? "is-error" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder={mode === "master" ? "Senha de acesso do laboratório" : "Sua senha"}
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
              </div>
              <span className="cm-field__beam" aria-hidden="true" />
            </div>
          )}

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
                  ? "CONECTANDO AO SUPABASE…"
                  : mode === "signup"
                  ? "CRIAR CONTA"
                  : mode === "magic"
                  ? "ENVIAR LINK MÁGICO"
                  : "INICIAR SESSÃO"
              }
            >
              {submitting
                ? "CONECTANDO AO SUPABASE…"
                : mode === "signup"
                ? "CRIAR CONTA"
                : mode === "magic"
                ? "ENVIAR LINK MÁGICO"
                : "INICIAR SESSÃO"}
            </span>
          </button>

          <div className="login-modal__footer">
            <div className="login-modal__guard">
              <span className="login-modal__guard-dot" />
              <span>Conectado ao Supabase • Sessão segura e persistente</span>
            </div>
            <div className="login-modal__disclaimer">
              Um Cara Caramelo — Laboratório de Interação • Projeto autoral de estudo.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
