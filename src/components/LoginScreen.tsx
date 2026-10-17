import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { IconClose, IconMark, IconMaximize, IconMinimize } from "./Icons";

export function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(true);
      return;
    }

    setSubmitting(true);
    // Pequeno delay perceptivo de autenticação nativa do cliente Steam
    setTimeout(() => {
      const ok = login(password, remember);
      if (!ok) {
        setError(true);
        setSubmitting(false);
      }
    }, 280);
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
              Insira a senha de acesso para liberar a visualização desta recriação.
            </p>
            <span className="cm-handwritten" style={{ fontSize: "16px", marginTop: "4px" }}>
              "menos ferramenta, mais sistema."
            </span>
          </div>

          {error && (
            <div className="login-modal__error" role="alert">
              <span className="login-modal__error-icon">✕</span>
              <span>A senha inserida está incorreta. Tente novamente.</span>
            </div>
          )}

          <div className="login-field cm-field">
            <label className="login-field__label" htmlFor="lab-password">
              SENHA DE ACESSO
            </label>
            <div className="login-field__input-wrap">
              <input
                id="lab-password"
                type={showPassword ? "text" : "password"}
                className={`login-field__input cm-field__input ${error ? "is-error" : ""}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder=" "
                autoFocus
                autoComplete="current-password"
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

          <label className="login-checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="login-checkbox__box" />
            <span className="login-checkbox__label">Lembrar neste navegador</span>
          </label>

          <button
            type="submit"
            className="login-modal__submit cm-spectrum-trigger"
            disabled={submitting}
          >
            <span className="cm-glitch" data-text={submitting ? "VERIFICANDO CREDENCIAIS…" : "INICIAR SESSÃO"}>
              {submitting ? "VERIFICANDO CREDENCIAIS…" : "INICIAR SESSÃO"}
            </span>
          </button>

          <div className="login-modal__footer">
            <div className="login-modal__guard">
              <span className="login-modal__guard-dot" />
              <span>Protegido por chave de acesso • Sessão salva localmente</span>
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
