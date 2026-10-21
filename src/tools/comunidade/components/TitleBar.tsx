import { Isotype } from '@caramelo/design-system';
import { isEmbedded } from '../../shared/kit';
import { Close, Help, Inbox, Maximize, Minimize } from '../icons';

/**
 * Barra superior da Comunidade LAB — no desktop desenha controles de janela;
 * quando embutido no LAB adapta-se para compor com o cliente.
 */
export function TitleBar({ title }: { title: string }) {
  const embedded = isEmbedded();

  return (
    <header className={`titlebar ${embedded ? 'titlebar--embedded' : ''}`}>
      <div className="titlebar-brand">
        <Isotype size={18} decorative />
        <span className="titlebar-lab">LAB</span>
        <span className="titlebar-sep">/</span>
        <span className="titlebar-tool">COMUNIDADE</span>
      </div>
      <div className="titlebar-title">{title}</div>
      <div className="titlebar-actions">
        <button className="titlebar-icon" title="Caixa de entrada" aria-label="Caixa de entrada">
          <Inbox size={18} />
        </button>
        <button className="titlebar-icon" title="Ajuda" aria-label="Ajuda">
          <Help size={18} />
        </button>
        {!embedded && (
          <div className="window-controls">
            <button aria-label="Minimizar">
              <Minimize size={10} />
            </button>
            <button aria-label="Maximizar">
              <Maximize size={10} />
            </button>
            <button className="close" aria-label="Fechar">
              <Close size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
