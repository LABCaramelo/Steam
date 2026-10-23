import type { Project, AspectRatio } from '../types';
import type { PlaybackEngine } from '../engine/PlaybackEngine';
import { escapeHTML, RATIOS } from '../model';

export class Header {
  private element=document.createElement('header');
  constructor(private project:Project,_engine:PlaybackEngine,private ratio:(ratio:AspectRatio)=>void,private exportClick:()=>void){this.element.className='montagem-header';this.update();}
  getElement(){return this.element;}
  update(){
    this.element.innerHTML=`
      <div class="header-left"><a class="montagem-brand" href="/library/home" target="_top" aria-label="Voltar ao LAB"><img src="/caramelo/isotipo.svg" width="34" height="34" alt=""/><span>Montagem<small>UM CARA CARAMELO / LAB</small></span></a><span class="montagem-divider"></span><label class="project-label"><span class="sr-only">Nome do projeto</span><input class="header-project-name" id="project-title-input" value="${escapeHTML(this.project.title)}" maxlength="120"/><span id="draft-status" role="status">Rascunho local</span></label></div>
      <div class="header-center"><label><span class="sr-only">Proporção do vídeo</span><select class="ratio-selector-btn" id="aspect-ratio-select">${RATIOS.map(r=>`<option value="${r}" ${this.project.aspectRatio===r?'selected':''}>${r}</option>`).join('')}</select></label><div class="header-undo-redo"><button class="btn-icon" id="btn-header-undo" aria-label="Desfazer" title="Desfazer (Ctrl+Z)">↶</button><button class="btn-icon" id="btn-header-redo" aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)">↷</button></div></div>
      <div class="header-right"><button class="btn-secondary" id="btn-new-project">Novo</button><button class="btn-secondary" id="btn-save-project">Salvar</button><button class="btn-icon" id="btn-editor-help" aria-label="Ajuda e atalhos" title="Ajuda e atalhos">?</button><button class="btn-export cm-btn cm-btn--fill" id="btn-open-export"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></svg>Exportar vídeo</button></div>`;
    this.element.querySelector('.header-right')!.insertAdjacentHTML('afterbegin','<button class="btn-icon" id="btn-inspector-toggle" aria-label="Propriedades do clipe" aria-pressed="false" title="Propriedades do clipe">⚙</button>');
    this.element.querySelector('#btn-inspector-toggle')!.addEventListener('click',()=>window.dispatchEvent(new Event('montagem:inspector')));
    const title=this.element.querySelector<HTMLInputElement>('#project-title-input')!;
    title.addEventListener('change',()=>{this.project.title=title.value.trim()||'Minha próxima história';title.value=this.project.title;window.dispatchEvent(new Event('montagem:project-updated'));});
    this.element.querySelector<HTMLSelectElement>('#aspect-ratio-select')!.addEventListener('change',e=>this.ratio((e.target as HTMLSelectElement).value as AspectRatio));
    this.element.querySelector('#btn-open-export')!.addEventListener('click',()=>this.exportClick());
    for(const [id,event] of [['undo','undo'],['redo','redo'],['new-project','new'],['save-project','save'],['editor-help','help']]){
      const button=this.element.querySelector(`#btn-${id==='undo'||id==='redo'?'header-':''}${id}`);button?.addEventListener('click',()=>window.dispatchEvent(new Event(`montagem:${event}`)));
    }
  }
}
