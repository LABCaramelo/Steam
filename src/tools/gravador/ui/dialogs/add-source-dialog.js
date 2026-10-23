import { ICONS } from '../../assets/icons.js';
import { setupDialog, openDialog, closeDialog, destroyDialog } from './dialog-utils.js';

export class AddSourceDialog {
  constructor(container, sourceFactory, onSourceCreated) {
    Object.assign(this, { container, sourceFactory, onSourceCreated });
    this.isOpen = false;
    this.pending = false;
    this.destroyed = false;
    this._setupUI();
    setupDialog(this, 'Adicionar fonte à cena');
  }
  _setupUI() {
    this.container.innerHTML = `<div class="obs-modal"><div class="obs-modal-header"><span>Adicionar fonte</span><button class="obs-modal-close-btn" id="modal-add-source-close" aria-label="Fechar seleção de fontes">&times;</button></div><div class="obs-modal-body"><p style="font-size:12px;color:var(--obs-text-secondary)">Escolha o conteúdo desta cena. O navegador solicita acesso para câmera, tela e microfone.</p><div class="source-type-grid" id="source-type-grid"></div></div></div>`;
    const types = [
      { id: 'monitor', name: 'Tela ou janela', desc: 'Compartilhe uma tela, janela ou aba', icon: ICONS.monitor },
      { id: 'camera', name: 'Câmera', desc: 'Conecte sua webcam ou placa de captura', icon: ICONS.camera },
      { id: 'mic', name: 'Microfone', desc: 'Conecte uma entrada de áudio', icon: ICONS.mic },
      { id: 'video', name: 'Vídeo local', desc: 'Escolha um vídeo nas propriedades da fonte', icon: ICONS.video },
      { id: 'image', name: 'Imagem', desc: 'Escolha uma imagem nas propriedades da fonte', icon: ICONS.image },
      { id: 'text', name: 'Texto', desc: 'Adicione um título ou letreiro', icon: ICONS.text },
      { id: 'color', name: 'Cor sólida', desc: 'Crie um fundo ou uma moldura', icon: ICONS.color }
    ];
    const grid = this.container.querySelector('#source-type-grid');
    types.forEach(type => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'source-type-card';
      button.innerHTML = `${type.icon}<div class="source-type-info"><span class="source-type-name">${type.name}</span><span class="source-type-desc">${type.desc}</span></div>`;
      button.addEventListener('click', async () => {
        if (this.pending) return;
        this.pending = true;
        this.close();
        try {
          const source = await this.sourceFactory.createSource(type.id);
          if (this.destroyed) { this.sourceFactory.audioEngine?.removeSourceAudio?.(source?.id); source?.destroy?.(); return; }
          if (source) this.onSourceCreated?.(source);
        } catch (error) { if (!this.destroyed) alert(error?.message || 'Não foi possível adicionar esta fonte.'); }
        finally { this.pending = false; }
      });
      grid.appendChild(button);
    });
    this.container.querySelector('#modal-add-source-close').addEventListener('click', () => this.close());
    this.backdropClick = event => { if (event.target === this.container) this.close(); };
    this.container.addEventListener('click', this.backdropClick);
  }
  open() { if (!this.pending) openDialog(this); }
  close() { closeDialog(this); }
  destroy() { this.destroyed = true; this.container.removeEventListener('click', this.backdropClick); destroyDialog(this); }
}
