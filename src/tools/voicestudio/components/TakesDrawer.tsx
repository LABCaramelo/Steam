import type { AudioTake } from "../types";

interface TakesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  takes: AudioTake[];
  onDeleteTake: (id: string) => void;
  onClearTakes: () => void;
}

export function TakesDrawer({
  isOpen,
  onClose,
  takes,
  onDeleteTake,
  onClearTakes,
}: TakesDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="vs-drawer-backdrop" onClick={onClose}>
      <div className="vs-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="vs-drawer__header">
          <div className="vs-drawer__title-group">
            <span className="vs-drawer__icon">🎧</span>
            <div>
              <h3 className="vs-drawer__title">Histórico de Takes ({takes.length})</h3>
              <p className="vs-drawer__subtitle">Áudios gerados e gravações desta sessão</p>
            </div>
          </div>
          <button type="button" className="vs-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="vs-drawer__body">
          {takes.length === 0 ? (
            <div className="vs-empty-state">
              <span className="vs-empty-state__icon">🎙️</span>
              <h4>Nenhum take gerado ainda</h4>
              <p>Os áudios que você sintetizar ou gravar aparecerão aqui para download e reprodução.</p>
            </div>
          ) : (
            <div className="vs-takes-list">
              {takes.map((take) => (
                <div key={take.id} className="vs-take-item">
                  <div className="vs-take-item__top">
                    <span className="vs-take-item__title">{take.title}</span>
                    <span className="vs-tag">{take.category}</span>
                  </div>

                  <div className="vs-take-item__meta">
                    <span>👤 {take.speakerName}</span>
                    <span>⏱ {take.durationSeconds.toFixed(1)}s</span>
                    <span>🕒 {take.createdAt}</span>
                  </div>

                  <div className="vs-take-item__player">
                    <audio src={take.blobUrl} controls className="vs-audio-inline" />
                  </div>

                  <div className="vs-take-item__actions">
                    <a
                      href={take.blobUrl}
                      download={`${take.title}.wav`}
                      className="vs-btn vs-btn--sm vs-btn--outline"
                    >
                      ⬇ Baixar WAV
                    </a>
                    <button
                      type="button"
                      className="vs-btn vs-btn--sm vs-btn--danger-ghost"
                      onClick={() => onDeleteTake(take.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {takes.length > 0 && (
          <div className="vs-drawer__footer">
            <button
              type="button"
              className="vs-btn vs-btn--outline vs-btn--sm"
              onClick={onClearTakes}
            >
              Limpar Todos os Takes
            </button>
            <button type="button" className="vs-btn vs-btn--primary vs-btn--sm" onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
