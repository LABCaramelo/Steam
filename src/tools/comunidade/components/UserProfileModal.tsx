import { ME, directMessages } from '../data';
import { Close } from '../icons';
import type { Action } from '../store';
import type { User } from '../types';
import { Avatar, statusLabel } from './Avatar';

interface Props {
  user: User;
  onClose: () => void;
  dispatch: (a: Action) => void;
  currentUserId?: string;
}

export function UserProfileModal({ user, onClose, dispatch, currentUserId }: Props) {
  const isMe = user.id === ME || (currentUserId && user.id === currentUserId);

  const handleStartDm = () => {
    let dm = directMessages.find((d) => d.userId === user.id);
    if (!dm) {
      dm = { id: `dm-${user.id}`, userId: user.id };
      directMessages.push(dm);
    }
    dispatch({ type: 'openHome', dmId: dm.id });
    onClose();
  };

  const handleEditProfile = () => {
    dispatch({ type: 'openModal', modal: { kind: 'settings', section: 'profile' } });
  };

  const handleOpenLabProfile = () => {
    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = '/profile';
      } else {
        window.open('/profile', '_blank');
      }
    } catch {
      window.open('/profile', '_blank');
    }
  };

  const roleName = user.roleName || (user.bot ? 'Bot Oficial' : user.id === ME ? 'Head de Criação' : 'Membro');
  const roleColor = user.roleColor || (user.id === ME ? '#FF701A' : user.color || '#25BFFF');
  const nickname = user.nickname || user.name.toLowerCase().replace(/\s+/g, '');
  const bio = user.bio || (user.id === ME ? 'elegância + pequena confissão patética' : 'Criador e membro ativo da Comunidade LAB.');
  const tools = user.tools || ['Biblioteca de prompts', 'Prancheta', 'Kanban'];
  const achievements = user.achievements || ['Primeiro Traço', 'Explorador do LAB'];
  const joinedAt = user.joinedAt || 'Outubro de 2026';

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal dialog user-profile-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${user.name}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className="modal-close user-profile-close" onClick={onClose} aria-label="Fechar" title="Fechar">
          <Close size={22} />
        </button>

        {/* Banner com a cor do usuário */}
        <div
          className="user-profile-banner"
          style={{
            background: `linear-gradient(135deg, ${user.color} 0%, rgba(16, 16, 20, 0.95) 100%)`,
          }}
        >
          <div className="user-profile-banner-pattern" />
        </div>

        {/* Cabeçalho com Avatar Sobreposto e Ações */}
        <div className="user-profile-header">
          <div className="user-profile-avatar-wrap">
            <Avatar user={user} size={84} status={user.status} ring="var(--bg-primary)" />
          </div>
          <div className="user-profile-header-actions">
            {isMe ? (
              <>
                <button
                  type="button"
                  className="button secondary user-profile-btn"
                  onClick={handleEditProfile}
                  title="Configurar seu perfil e preferências"
                >
                  ✏️ Editar Perfil
                </button>
                <button
                  type="button"
                  className="button brand user-profile-btn"
                  onClick={handleOpenLabProfile}
                  title="Abrir página oficial do perfil no LAB"
                >
                  Ver no LAB ↗
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="button brand user-profile-btn"
                  onClick={handleStartDm}
                  title={`Enviar mensagem privada para ${user.name}`}
                >
                  💬 Conversar
                </button>
                <button
                  type="button"
                  className="button secondary user-profile-btn"
                  onClick={handleOpenLabProfile}
                  title="Visualizar perfil na plataforma LAB"
                >
                  Ver no LAB ↗
                </button>
              </>
            )}
          </div>
        </div>

        {/* Corpo com Informações */}
        <div className="user-profile-body">
          <div className="user-profile-ident">
            <div className="user-profile-names">
              <h2 className="user-profile-name">{user.name}</h2>
              {user.bot && <span className="bot-tag">APP</span>}
            </div>
            <div className="user-profile-handle">@{nickname}</div>

            <div className="user-profile-badges-row">
              <span
                className="user-profile-role-badge"
                style={{
                  borderColor: roleColor,
                  color: roleColor,
                  background: `${roleColor}18`,
                }}
              >
                {roleName}
              </span>
              <span className="user-profile-status-badge">
                <span className={`user-profile-dot status-${user.status}`} />
                {statusLabel[user.status]}
              </span>
            </div>

            {user.activity && (
              <div className="user-profile-activity">
                <span className="user-profile-activity-icon">💡</span>
                <span className="user-profile-activity-text">{user.activity}</span>
              </div>
            )}
          </div>

          <div className="user-profile-divider" />

          {/* Sobre Mim */}
          <div className="user-profile-section">
            <h3 className="user-profile-section-title">Sobre Mim</h3>
            <p className="user-profile-bio">"{bio}"</p>
          </div>

          {/* Ferramentas Favoritas no LAB */}
          <div className="user-profile-section">
            <h3 className="user-profile-section-title">Ferramentas no LAB</h3>
            <div className="user-profile-chips">
              {tools.map((t) => (
                <span key={t} className="user-profile-chip tool-chip">
                  📦 {t}
                </span>
              ))}
            </div>
          </div>

          {/* Conquistas */}
          <div className="user-profile-section">
            <h3 className="user-profile-section-title">Conquistas</h3>
            <div className="user-profile-chips">
              {achievements.map((a) => (
                <span key={a} className="user-profile-chip ach-chip">
                  🏆 {a}
                </span>
              ))}
            </div>
          </div>

          {/* Data de Entrada */}
          <div className="user-profile-footer">
            <span className="user-profile-joined">
              📅 Membro da Comunidade desde <strong>{joinedAt}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
