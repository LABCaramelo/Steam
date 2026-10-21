import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth";
import { supabase } from "../supabase";
import { useUi } from "../ui";
import { STATUS_COLOR } from "./Avatar";
import { IconCamera, IconCheck, IconClose, IconEdit, IconTrash } from "./Icons";

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile, uploadAvatar } = useAuth();
  const ui = useUi();

  const [name, setName] = useState(profile?.name ?? "");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Nickname availability state
  const [nickStatus, setNickStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [nickMessage, setNickMessage] = useState<string>("");
  const nickDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fecha no ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Checagem assíncrona do nickname com debounce
  useEffect(() => {
    const cleanNick = nickname.trim();

    if (nickDebounceRef.current) clearTimeout(nickDebounceRef.current);

    if (!cleanNick) {
      setNickStatus("idle");
      setNickMessage("");
      return;
    }

    if (cleanNick.toLowerCase() === (profile?.nickname ?? "").toLowerCase()) {
      setNickStatus("available");
      setNickMessage("Seu apelido atual");
      return;
    }

    if (cleanNick.length < 3 || cleanNick.length > 24) {
      setNickStatus("unavailable");
      setNickMessage("O apelido deve ter entre 3 e 24 caracteres.");
      return;
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9_\-.]{1,22}[a-zA-Z0-9]$/.test(cleanNick)) {
      setNickStatus("unavailable");
      setNickMessage("Apenas letras, números, hífen, underline ou ponto.");
      return;
    }

    setNickStatus("checking");
    setNickMessage("Verificando disponibilidade…");

    nickDebounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("check_nickname_availability", {
          p_nickname: cleanNick,
          p_for_signup: false,
        });

        if (error) {
          setNickStatus("idle");
          setNickMessage("");
          return;
        }

        if (data?.available) {
          setNickStatus("available");
          setNickMessage(data.message || "Apelido disponível!");
        } else {
          setNickStatus("unavailable");
          setNickMessage(data?.message || "Apelido indisponível.");
        }
      } catch {
        setNickStatus("idle");
        setNickMessage("");
      }
    }, 400);

    return () => {
      if (nickDebounceRef.current) clearTimeout(nickDebounceRef.current);
    };
  }, [nickname, profile?.nickname]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);
    try {
      const res = await uploadAvatar(file);
      if (res.ok && res.url) {
        setAvatarUrl(res.url);
        ui.toast("Foto carregada com sucesso.");
      } else {
        setErrorMsg(res.error || "Erro ao enviar imagem.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanNick = nickname.trim();
    const cleanBio = bio.trim();

    if (cleanName.length < 2) {
      setErrorMsg("O nome deve ter pelo menos 2 caracteres.");
      return;
    }

    if (cleanNick && nickStatus === "unavailable") {
      setErrorMsg(nickMessage || "Por favor, escolha um apelido válido e disponível.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: cleanName,
        nickname: cleanNick || null,
        avatar_url: avatarUrl.trim() || null,
        bio: cleanBio || null,
      });

      if (!res.ok) {
        setErrorMsg(res.error || "Não foi possível salvar o perfil.");
        return;
      }

      ui.toast("Perfil atualizado com sucesso!");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const previewName = nickname.trim() || name.trim() || "?";

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-window edit-profile-window" role="dialog" aria-label="Editar Perfil">
        <div className="modal-window__titlebar">
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconEdit size={14} />
            Editar Perfil de Membro
          </span>
          <button type="button" onClick={onClose} title="Fechar">
            <IconClose size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          <div className="edit-profile-scroll">
            {errorMsg && (
              <div className="edit-profile-alert edit-profile-alert--error" role="alert">
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Seção do Avatar */}
            <div className="edit-profile-section">
              <label className="edit-profile-label">Foto de perfil</label>
              <div className="edit-profile-avatar-row">
                <div className="edit-profile-avatar-preview">
                  {avatarUrl.trim() ? (
                    <img
                      src={avatarUrl.trim()}
                      alt={previewName}
                      className="avatar edit-profile-avatar-img"
                      style={{ borderColor: STATUS_COLOR[ui.status] }}
                      onError={() => setErrorMsg("A URL de imagem informada não pôde ser carregada.")}
                    />
                  ) : (
                    <span
                      className="avatar avatar--fallback edit-profile-avatar-img"
                      style={{ borderColor: STATUS_COLOR[ui.status] }}
                    >
                      {previewName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {isUploading && (
                    <div className="edit-profile-avatar-loading">
                      <span className="spinner-dots" />
                    </div>
                  )}
                </div>

                <div className="edit-profile-avatar-actions">
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn--blue"
                      disabled={isUploading || isSaving}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconCamera size={14} />
                      {isUploading ? "Enviando…" : "Enviar nova foto"}
                    </button>
                    {avatarUrl.trim() && (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ color: "rgb(var(--cm-danger))" }}
                        disabled={isUploading || isSaving}
                        onClick={() => setAvatarUrl("")}
                        title="Remover foto personalizada"
                      >
                        <IconTrash size={14} />
                        Remover
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                  <div className="muted small" style={{ marginTop: "4px" }}>
                    PNG, JPG, WEBP ou GIF até 5 MB.
                  </div>

                  <div style={{ marginTop: "8px" }}>
                    <input
                      type="url"
                      className="input edit-profile-url-input"
                      placeholder="Ou cole o link direto de uma imagem (https://…)"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Nome de exibição */}
            <div className="edit-profile-section">
              <label htmlFor="ep-name" className="edit-profile-label">
                Nome de exibição <span className="text-danger">*</span>
              </label>
              <input
                id="ep-name"
                type="text"
                className="input"
                style={{ width: "100%" }}
                value={name}
                maxLength={80}
                required
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome ou como prefere ser chamado"
              />
              <div className="muted small" style={{ marginTop: "4px" }}>
                Visível no seu cabeçalho, na sua biblioteca e no seu perfil do LAB.
              </div>
            </div>

            {/* Apelido / Nickname no LAB */}
            <div className="edit-profile-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="ep-nickname" className="edit-profile-label">
                  Apelido exclusivo no LAB
                </label>
                <span className="muted small mono">{nickname.trim().length}/24</span>
              </div>
              <div className="edit-profile-nick-wrapper">
                <span className="edit-profile-nick-at">@</span>
                <input
                  id="ep-nickname"
                  type="text"
                  className="input edit-profile-nick-input"
                  value={nickname}
                  maxLength={24}
                  onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  placeholder="ex: caramelo"
                />
              </div>

              {nickMessage && (
                <div
                  className={`edit-profile-nick-feedback edit-profile-nick-feedback--${nickStatus}`}
                >
                  {nickStatus === "available" && <IconCheck size={12} />}
                  <span>{nickMessage}</span>
                </div>
              )}
              <div className="muted small" style={{ marginTop: "4px" }}>
                De 3 a 24 caracteres (letras, números, hífens ou underlines). Utilizado nas salas da Comunidade.
              </div>
            </div>

            {/* Frase / Bio autoral */}
            <div className="edit-profile-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="ep-bio" className="edit-profile-label">
                  Frase de perfil ou bio autoral
                </label>
                <span className="muted small mono">{bio.length}/280</span>
              </div>
              <textarea
                id="ep-bio"
                className="input edit-profile-textarea"
                rows={3}
                maxLength={280}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder='"elegância + pequena confissão patética"'
              />
              <div className="muted small" style={{ marginTop: "4px" }}>
                Exibida logo abaixo do seu nome com tipografia autoral Caramelo.
              </div>
            </div>

            {/* Informações da conta do LAB (Segurança & Papel) */}
            <div className="edit-profile-section edit-profile-account-card">
              <div className="edit-profile-account-row">
                <div>
                  <div className="muted small">E-mail cadastrado</div>
                  <div className="mono font-semibold" style={{ fontSize: "13px" }}>
                    {profile?.email || "—"}
                  </div>
                </div>
                <div>
                  <div className="muted small">Acesso</div>
                  <span className="cm-brand-badge" style={{ textTransform: "uppercase" }}>
                    {profile?.role === "admin" ? "Administrador" : "Membro"}
                  </span>
                </div>
              </div>
              <p className="muted small" style={{ marginTop: "8px", marginBlockEnd: 0 }}>
                O e-mail é gerido pelo acesso seguro via WhatsApp/Supabase Auth.
              </p>
            </div>
          </div>

          {/* Rodapé com Ações */}
          <div className="edit-profile-footer">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={isSaving || isUploading}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn--blue"
              disabled={isSaving || isUploading || (nickname.trim() !== "" && nickStatus === "unavailable")}
            >
              {isSaving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
