import { FocusField, MagneticButton, SpotlightTabs, TiltSurface } from "@caramelo/design-system";
import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { IconMark } from "./Icons";

type LoginMode = "password" | "signup";
type FieldErrors = { email?: string; password?: string };

const MODES = [
  { id: "password", label: "Entrar" },
  { id: "signup", label: "Criar Conta" },
];

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
  if (lower.includes("email not confirmed")) {
    return "E-mail não confirmado. Tente entrar novamente.";
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearFeedback();

    // Erros de preenchimento ficam no próprio campo (FocusField: aria-invalid + tremida curta).
    const errors: FieldErrors = {};
    if (!email.trim() || !email.includes("@")) errors.email = "Insira um endereço de e-mail válido.";
    if (!password.trim()) errors.password = "Insira sua senha.";
    else if (mode === "signup" && password.length < 6) errors.password = "A senha deve conter no mínimo 6 caracteres.";
    if (errors.email || errors.password) {
      setFieldErrors(errors);
      return;
    }

    if (mode === "signup") {
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
          <div className="login-modal__brand">
            <IconMark size={18} />
            <span className="cm-glitch">LAB • Laboratório de Interação</span>
          </div>
        </div>

        {/* Corpo do Login */}
        <form className="login-modal__content" onSubmit={handleSubmit} noValidate>
          {/* pointer-tilt: o cartaz da marca inclina com o ponteiro; os controles ficam fora dele. */}
          <TiltSurface max={3} className="login-modal__header">
            <div className="login-modal__badge">
              <IconMark size={46} />
            </div>
            <h1 id="login-title" className="login-modal__title font-display">INICIAR SESSÃO NO LAB</h1>
            <span className="cm-handwritten" style={{ fontSize: "17px", marginTop: "4px" }}>
              "menos ferramenta, mais sistema."
            </span>
          </TiltSurface>

          <SpotlightTabs
            ariaLabel="Modo de autenticação"
            className="login-modal__modes"
            items={MODES}
            value={mode}
            onValueChange={(next) => {
              setMode(next as LoginMode);
              clearFeedback();
            }}
          />

          {/* Feedback do servidor */}
          {errorMsg && (
            <div className="login-modal__error" role="alert">
              <span className="login-modal__error-icon">✕</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="login-modal__success" role="status">
              <span style={{ fontWeight: 800 }}>✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {mode === "signup" && (
            <FocusField
              id="lab-name"
              label="Nome ou apelido"
              hint="Como você aparece no LAB."
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}

          <FocusField
            id="lab-email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            error={fieldErrors.email}
            autoFocus
            autoComplete="email"
            required
          />

          <div className="login-field login-field--password">
            <FocusField
              id="lab-password"
              label="Senha"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
              }}
              error={fieldErrors.password}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
            />
            <button
              type="button"
              className="login-field__eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-pressed={showPassword}
              aria-controls="lab-password"
            >
              {showPassword ? "Ocultar" : "Exibir"}
            </button>
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

          {/* magnetic-fill: o CTA da cena puxa o cursor e se preenche de baixo para cima. */}
          <MagneticButton type="submit" variant="accent" size="lg" block className="login-modal__submit" disabled={submitting}>
            {submitting ? "CONECTANDO…" : mode === "signup" ? "CRIAR CONTA" : "INICIAR SESSÃO"}
          </MagneticButton>
        </form>
      </div>
    </div>
  );
}
