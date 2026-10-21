import { FocusField, MagneticButton, TiltSurface } from "@caramelo/design-system";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../auth";
import {
  COMMUNITY_URL,
  LabAccessError,
  PENDING_WHATSAPP_KEY,
  isPlausiblePhone,
  requestLabAccess,
  type LabAccess,
} from "../labAccess";
import { IconMark } from "./Icons";

type Ask = (body: Parameters<typeof requestLabAccess>[1]) => Promise<LabAccess>;

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="login-screen" style={{ display: "grid", placeItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
        <div className="login-modal__badge login-modal__badge--loading">
          <IconMark size={46} decorative />
        </div>
        <span style={{ fontFamily: "Montserrat", fontSize: "11px", fontWeight: 700, letterSpacing: "0.18em", color: "rgb(var(--cm-fg-muted))" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

/**
 * The LAB opens only for members of the official WhatsApp group. Every entry asks the server,
 * which checks the group through uazapi; a number is confirmed once with a code sent there.
 */
export function LabAccessGate({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const userId = session?.user.id;
  const token = useRef(session?.access_token);
  token.current = session?.access_token;
  const [access, setAccess] = useState<LabAccess | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const ask = useCallback<Ask>(async (body) => {
    if (!token.current) throw new LabAccessError(401, "Sua sessão expirou. Entre de novo.");
    try {
      return await requestLabAccess(token.current, body);
    } catch (error) {
      if (error instanceof LabAccessError && error.status === 401) void logout();
      throw error;
    }
  }, [logout]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setAccess(null);
    setFailure(null);
    ask({ action: "status" })
      .then((next) => { if (alive) setAccess(next); })
      .catch((error) => { if (alive) setFailure(error instanceof Error ? error.message : String(error)); });
    return () => { alive = false; };
  }, [userId, ask, attempt]);

  if (access?.state === "granted") return <>{children}</>;
  if (!access && !failure) return <LoadingScreen label="CONFERINDO ACESSO…" />;
  return (
    <GateCard
      key={failure ? `failure-${attempt}` : "gate"}
      access={access}
      failure={failure}
      ask={ask}
      onAccess={setAccess}
      onRetry={() => setAttempt((n) => n + 1)}
      onLogout={() => void logout()}
    />
  );
}

type Step = "phone" | "code" | "not_member";

const stepOf = (access: LabAccess | null): Step =>
  access?.state === "code_sent" ? "code" : access?.state === "not_member" ? "not_member" : "phone";

function GateCard({ access, failure, ask, onAccess, onRetry, onLogout }: {
  access: LabAccess | null;
  failure: string | null;
  ask: Ask;
  onAccess: (access: LabAccess) => void;
  onRetry: () => void;
  onLogout: () => void;
}) {
  const [step, setStep] = useState<Step>(stepOf(access));
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState(access && "phone" in access ? access.phone : "");
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(failure);
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoSent = useRef(false);

  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));
  useEffect(() => {
    if (!wait) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [wait]);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      if (err instanceof LabAccessError && err.resendIn) {
        setResendAt(Date.now() + err.resendIn * 1000);
        setNow(Date.now());
      }
    } finally {
      setBusy(false);
    }
  };

  const show = (next: LabAccess) => {
    if (next.state === "granted") return onAccess(next);
    if ("phone" in next) setSentTo(next.phone);
    if (next.state === "code_sent") {
      setCode("");
      setResendAt(Date.now() + next.resendIn * 1000);
      setNow(Date.now());
    }
    setStep(stepOf(next));
  };

  const sendCode = (value: string) => {
    // Erros de preenchimento ficam no próprio campo, como no login.
    if (!isPlausiblePhone(value)) {
      setError(null);
      setPhoneError("Informe seu WhatsApp com DDD. Fora do Brasil, comece com + e o código do país.");
      return;
    }
    void run(async () => show(await ask({ action: "send", phone: value })));
  };

  const verify = (value: string) => {
    void run(async () => show(await ask({ action: "verify", code: value })));
  };

  // The number typed at sign-up gets its code right away.
  useEffect(() => {
    if (autoSent.current || step !== "phone" || failure) return;
    autoSent.current = true;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_WHATSAPP_KEY);
      sessionStorage.removeItem(PENDING_WHATSAPP_KEY);
    } catch {
      // sessionStorage restrito
    }
    if (pending) {
      setPhone(pending);
      sendCode(pending);
    }
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (failure && !access) return onRetry();
    if (step === "phone") sendCode(phone);
    else if (step === "code") verify(code);
  };

  const recheck = () => void run(async () => {
    const next = await ask({ action: "status", force: true });
    if (next.state === "not_member") {
      setNotice("Ainda não encontramos seu número no grupo. Se acabou de entrar, aguarde um instante e confira de novo.");
    }
    show(next);
  });

  const title = step === "not_member" ? "QUASE LÁ" : "ACESSO DE MEMBRO";

  return (
    <div className="login-screen">
      <div className="login-screen__ambient" />
      <div className="login-modal cm-surface--spotlight" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <div className="login-modal__titlebar">
          <div className="login-modal__brand">
            <IconMark size={18} />
            <span className="cm-glitch">LAB • Laboratório de Interação</span>
          </div>
        </div>

        <form className="login-modal__content" onSubmit={submit} noValidate>
          <TiltSurface max={3} className="login-modal__header">
            <div className="login-modal__badge">
              <IconMark size={46} />
            </div>
            <h1 id="gate-title" className="login-modal__title font-display">{title}</h1>
            <p className="login-modal__subtitle">O LAB é aberto para quem faz parte da comunidade no WhatsApp.</p>
          </TiltSurface>

          {error && (
            <div className="login-modal__error" role="alert">
              <span className="login-modal__error-icon">✕</span>
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="gate-notice" role="status">{notice}</div>
          )}

          {failure && !access ? (
            <MagneticButton type="submit" variant="accent" size="lg" block className="login-modal__submit">
              TENTAR DE NOVO
            </MagneticButton>
          ) : step === "phone" ? (
            <>
              <FocusField
                id="gate-phone"
                label="Seu WhatsApp"
                hint="Com DDD. Vamos mandar um código de 6 números para confirmar que o número é seu."
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(undefined);
                }}
                error={phoneError}
                autoFocus
                required
              />
              <MagneticButton type="submit" variant="accent" size="lg" block className="login-modal__submit" disabled={busy}>
                {busy ? "ENVIANDO…" : "ENVIAR CÓDIGO"}
              </MagneticButton>
            </>
          ) : step === "code" ? (
            <>
              <p className="gate-text">
                Mandamos um código pelo WhatsApp para <strong>{sentTo}</strong>.
              </p>
              <FocusField
                id="gate-code"
                label="Código"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(next);
                  if (next.length === 6 && !busy) verify(next);
                }}
                autoFocus
                required
              />
              <MagneticButton type="submit" variant="accent" size="lg" block className="login-modal__submit" disabled={busy || code.length !== 6}>
                {busy ? "CONFERINDO…" : "CONFIRMAR"}
              </MagneticButton>
              <div className="gate-links">
                <button type="button" className="gate-link" disabled={busy || wait > 0} onClick={() => sendCode(phone)}>
                  {wait > 0 ? `Reenviar código em ${wait}s` : "Reenviar código"}
                </button>
                <button type="button" className="gate-link" disabled={busy} onClick={() => { setStep("phone"); setError(null); }}>
                  Trocar número
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="gate-alert" role="alert">
                <strong>Você ainda não está na comunidade.</strong>
                <span>
                  O LAB é liberado para membros do grupo oficial no WhatsApp
                  {sentTo && <> e não encontramos o número <span className="gate-nowrap">{sentTo}</span> lá</>}. Entre na comunidade gratuita e depois confira de novo.
                </span>
              </div>
              <a className="cm-btn cm-btn--accent cm-btn--lg cm-btn--block cm-btn--fill login-modal__submit" href={COMMUNITY_URL} target="_blank" rel="noopener">
                <span className="cm-btn__fill" aria-hidden="true" />
                <span className="cm-btn__label">ENTRAR NA COMUNIDADE</span>
              </a>
              <MagneticButton type="button" variant="surface" size="md" block disabled={busy} onClick={recheck}>
                {busy ? "CONFERINDO…" : "JÁ ENTREI, CONFERIR DE NOVO"}
              </MagneticButton>
              <div className="gate-links">
                <button type="button" className="gate-link" disabled={busy} onClick={() => { setStep("phone"); setError(null); setNotice(null); }}>
                  Usar outro número
                </button>
              </div>
            </>
          )}

          <div className="gate-links gate-links--footer">
            <button type="button" className="gate-link" onClick={onLogout}>Sair da conta</button>
          </div>
        </form>
      </div>
    </div>
  );
}
