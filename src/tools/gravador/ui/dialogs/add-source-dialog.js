// Add Source Dialog
import { ICONS } from '../../assets/icons.js';

export class AddSourceDialog {
  constructor(container, sourceFactory, onSourceCreated) {
    this.container = container;
    this.sourceFactory = sourceFactory;
    this.onSourceCreated = onSourceCreated;
    this.isOpen = false;

    this._setupUI();
  }

  _setupUI() {
    this.container.innerHTML = `
      <div class="obs-modal">
        <div class="obs-modal-header">
          <span>Adicionar Fonte</span>
          <button class="obs-modal-close-btn" id="modal-add-source-close">&times;</button>
        </div>
        <div class="obs-modal-body">
          <p style="font-size: 11.5px; color: var(--obs-text-secondary); margin-bottom: 6px;">
            Selecione o tipo de fonte para compor na cena ativa:
          </p>
          <div class="source-type-grid" id="source-type-grid">
            <!-- Cards will be populated here -->
          </div>
        </div>
      </div>
    `;

    const grid = this.container.querySelector('#source-type-grid');
    const sourceTypes = [
      { id: 'monitor', name: 'Captura de Tela', desc: 'Captura tela inteira, janela ou aba do navegador', icon: ICONS.monitor },
      { id: 'camera', name: 'Câmera / Webcam', desc: 'Dispositivo de vídeo USB, webcam ou placa de captura', icon: ICONS.camera },
      { id: 'mic', name: 'Microfone & Áudio', desc: 'Microfone interno/externo ou entrada de linha', icon: ICONS.mic },
      { id: 'video', name: 'Fonte de Mídia', desc: 'Vídeo local ou animação contínua em loop', icon: ICONS.video },
      { id: 'image', name: 'Imagem / Padrão', desc: 'Arquivo PNG, JPG, SVG ou barras de teste SMPTE', icon: ICONS.image },
      { id: 'browser', name: 'Navegador Web', desc: 'URL web interativa, widget ou overlay de chat', icon: ICONS.browser },
      { id: 'text', name: 'Texto Estilizado', desc: 'Tipografia estática ou letreiro digital rolante', icon: ICONS.text },
      { id: 'color', name: 'Cor Sólida', desc: 'Fundo ou moldura de cor sólida personalizada', icon: ICONS.color }
    ];

    sourceTypes.forEach(t => {
      const card = document.createElement('div');
      card.className = 'source-type-card';
      card.innerHTML = `
        ${t.icon}
        <div class="source-type-info">
          <span class="source-type-name">${t.name}</span>
          <span class="source-type-desc">${t.desc}</span>
        </div>
      `;
      card.addEventListener('click', async () => {
        this.close();
        const source = await this.sourceFactory.createSource(t.id);
        if (source && this.onSourceCreated) {
          this.onSourceCreated(source);
        }
      });
      grid.appendChild(card);
    });

    this.container.querySelector('#modal-add-source-close').addEventListener('click', () => this.close());
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });
  }

  open() {
    this.container.classList.add('open');
    this.isOpen = true;
  }

  close() {
    this.container.classList.remove('open');
    this.isOpen = false;
  }
}
