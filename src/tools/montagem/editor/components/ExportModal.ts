import type { Project, ExportOptions } from '../types';
import { outputSize, recorderMime, escapeHTML } from '../model';
import { PlaybackEngine } from '../engine/PlaybackEngine';
import type { AudioEngine } from '../engine/AudioEngine';

export class ExportModal {
  private element=document.createElement('dialog');
  private exporting=false;
  private disposed=false;
  constructor(private project:Project,private engine:PlaybackEngine,_audio:AudioEngine,private onClose:()=>void){
    this.element.className='montagem-export-dialog';this.render();
    this.element.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    queueMicrotask(()=>{if(this.element.isConnected)this.element.showModal();});
  }
  getElement(){return this.element;}
  private close(){if(this.exporting)this.engine.cancelExport();else this.onClose();}
  private render(){
    const supported=typeof MediaRecorder!=='undefined';
    const mp4=supported&&!!recorderMime('mp4',m=>MediaRecorder.isTypeSupported(m));
    const webm=supported&&!!recorderMime('webm',m=>MediaRecorder.isTypeSupported(m));
    this.element.innerHTML=`<div class="export-modal-card"><div class="modal-header"><div><span class="montagem-eyebrow">MONTAGEM / EXPORTAÇÃO LOCAL</span><h2>Pronto para sair do rascunho.</h2></div><button class="btn-icon" id="export-close" aria-label="Fechar exportação">×</button></div><div class="modal-body"><label class="prop-group">Nome do arquivo<input class="prop-input-text" id="export-name" maxlength="120" value="${escapeHTML(this.project.title)}"/></label><div class="montagem-export-options"><label class="prop-group">Resolução<select id="export-size"><option value="720">720p</option><option value="1080" selected>1080p</option><option value="1440">2K</option><option value="2160">4K</option></select></label><label class="prop-group">Quadros por segundo<select id="export-fps"><option>24</option><option selected>30</option><option>60</option></select></label></div><label class="prop-group">Formato<select id="export-format"><option value="webm" ${webm?'':'disabled'}>WebM${webm?'':' — indisponível neste navegador'}</option><option value="mp4" ${mp4?'':'disabled'} ${!webm&&mp4?'selected':''}>MP4${mp4?'':' — indisponível neste navegador'}</option></select></label><p class="montagem-export-note">O vídeo é exportado em tempo real com as faixas de áudio. Mantenha esta aba aberta e visível até o download. A qualidade e a taxa de quadros dependem do dispositivo.</p><progress id="export-progress" max="100" value="0" hidden aria-label="Progresso da exportação"></progress><p id="export-message" role="status">${supported&&(mp4||webm)?'Seus arquivos continuam no seu navegador.':'Este navegador não oferece um formato de gravação compatível.'}</p></div><div class="modal-footer"><button class="btn-secondary" id="export-cancel">Cancelar</button><button class="btn-export" id="export-start" ${supported&&(mp4||webm)?'':'disabled'}>Exportar e baixar</button></div></div>`;
    this.element.querySelector('#export-close')!.addEventListener('click',()=>this.close());
    this.element.querySelector('#export-cancel')!.addEventListener('click',()=>this.close());
    this.element.querySelector('#export-start')!.addEventListener('click',()=>{void this.start();});
  }
  private async start(){
    if(this.exporting)return;this.exporting=true;
    const controls=this.element.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select');controls.forEach(el=>el.disabled=true);
    const button=this.element.querySelector<HTMLButtonElement>('#export-start')!;button.disabled=true;
    const progress=this.element.querySelector<HTMLProgressElement>('#export-progress')!;progress.hidden=false;
    const message=this.element.querySelector('#export-message')!;
    const format=this.element.querySelector<HTMLSelectElement>('#export-format')!.value as 'webm'|'mp4';
    const side=Number(this.element.querySelector<HTMLSelectElement>('#export-size')!.value);
    const [width,height]=outputSize(this.project.aspectRatio,side);
    const options:ExportOptions={width,height,format,fps:Number(this.element.querySelector<HTMLSelectElement>('#export-fps')!.value) as 24|30|60,resolution:side===720?'720p':side===1080?'1080p':side===1440?'2k':'4k',quality:'high'};
    try{
      message.textContent='Preparando mídias e áudio…';
      const blob=await this.engine.exportVideo(options,(percent)=>{progress.value=percent;message.textContent=`Exportando ${width} × ${height} · ${percent}%`;});
      if(this.disposed)return;
      const extension=blob.type.startsWith('video/mp4')?'mp4':'webm';
      const name=this.element.querySelector<HTMLInputElement>('#export-name')!.value.trim().replace(/\.(mp4|webm)$/i,'').replace(/[\\/:*?"<>|]/g,'_')||'meu-video';
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${name}.${extension}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60_000);
      message.textContent='Vídeo exportado. O download foi iniciado.';
    }catch(error){message.textContent=error instanceof DOMException&&error.name==='AbortError'?'Exportação cancelada.':error instanceof Error?error.message:'Não foi possível exportar este vídeo.';}
    finally{this.exporting=false;if(!this.disposed){controls.forEach(el=>el.disabled=false);button.disabled=false;button.textContent='Exportar novamente';}}
  }
  dispose(){this.disposed=true;this.engine.cancelExport();this.element.remove();}
}
