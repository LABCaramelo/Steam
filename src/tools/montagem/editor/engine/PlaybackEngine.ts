import type { Project, Clip, AspectRatio, ExportOptions } from '../types';
import { SAMPLE_VIDEOS } from '../assets/sampleMedia';
import { outputSize, projectDuration, recorderMime, interpolatedTransform } from '../model';
import { AudioEngine } from './AudioEngine';
import { finalizeWebM } from '../webm';

export class PlaybackEngine {
  private ctx:CanvasRenderingContext2D;
  private currentTime=0;
  private playing=false;
  private frame=0;
  private origin=0;
  private exporting=false;
  private exportAbort:AbortController|null=null;
  private times:((time:number)=>void)[]=[];
  private states:((playing:boolean)=>void)[]=[];
  private chromaCanvas:HTMLCanvasElement;
  public gizmoBounds:{x:number;y:number;width:number;height:number;rotation:number}|null=null;
  constructor(private canvas:HTMLCanvasElement,private project:Project,private audioEngine:AudioEngine){
    this.ctx=canvas.getContext('2d')!;this.chromaCanvas=document.createElement('canvas');this.updateCanvasResolution();this.render();
  }
  updateCanvasResolution(){[this.canvas.width,this.canvas.height]=outputSize(this.project.aspectRatio);this.project.width=this.canvas.width;this.project.height=this.canvas.height;}
  setAspectRatio(ratio:AspectRatio){this.project.aspectRatio=ratio;this.updateCanvasResolution();this.render();}
  onTimeUpdate(cb:(t:number)=>void){this.times.push(cb);}
  onPlayState(cb:(p:boolean)=>void){this.states.push(cb);}
  getCurrentTime(){return this.currentTime;}
  getIsPlaying(){return this.playing;}
  getIsExporting(){return this.exporting;}
  getAllVideoClips(){return this.project.tracks.flatMap(t=>t.clips).filter(c=>c.element instanceof HTMLVideoElement);}
  getActiveClips(time=this.currentTime){return this.project.tracks.filter(t=>t.visible).flatMap(t=>t.clips).filter(c=>time>=c.start&&time<c.start+c.duration);}
  seek(time:number){
    this.currentTime=Math.max(0,Math.min(time,Math.max(0,projectDuration(this.project))));
    this.audioEngine.stopAll();this.syncMedia();this.times.forEach(cb=>cb(this.currentTime));this.render();
    if(this.playing)this.origin=performance.now()-this.currentTime*1000;
  }
  play(){
    if(this.playing||this.exporting)return;
    if(this.currentTime>=projectDuration(this.project))this.currentTime=0;
    this.audioEngine.getAudioContext();this.playing=true;this.origin=performance.now()-this.currentTime*1000;this.states.forEach(cb=>cb(true));this.loop();
  }
  pause(){this.playing=false;cancelAnimationFrame(this.frame);this.audioEngine.stopAll();for(const clip of this.getAllVideoClips())(clip.element as HTMLVideoElement).pause();this.states.forEach(cb=>cb(false));this.render();}
  togglePlay(){if(this.playing)this.pause();else this.play();}
  stepFrame(delta:number){this.pause();this.seek(this.currentTime+delta);}
  private loop=()=>{
    if(!this.playing)return;
    const end=projectDuration(this.project);this.currentTime=Math.min(end,(performance.now()-this.origin)/1000);
    this.syncMedia();this.render();this.times.forEach(cb=>cb(this.currentTime));
    if(this.currentTime>=end){this.pause();return;}this.frame=requestAnimationFrame(this.loop);
  };
  private syncMedia(){
    const active=this.getActiveClips(),running=this.playing||this.exporting;
    for(const clip of this.getAllVideoClips()){
      const video=clip.element as HTMLVideoElement;video.muted=true;
      video.onseeked=()=>this.render();
      if(!active.includes(clip)){video.pause();continue;}
      const time=clip.offset+(this.currentTime-clip.start)*clip.speed;
      video.playbackRate=Math.max(.0625,Math.min(16,clip.speed));
      if(Math.abs(video.currentTime-time)>(running?.2:.01))video.currentTime=Math.max(0,Math.min(Number.isFinite(video.duration)?video.duration:time,time));
      if(running&&video.paused)void video.play().catch(()=>{});else if(!running)video.pause();
    }
    const audio=this.project.tracks.filter(t=>t.visible&&!t.muted).flatMap(t=>t.clips).filter(c=>active.includes(c)&&['video','audio','sfx'].includes(c.type));
    this.audioEngine.syncPlayback(audio,this.currentTime,running);
  }
  render(target?:CanvasRenderingContext2D,at=this.currentTime){
    const ctx=target||this.ctx,w=this.canvas.width,h=this.canvas.height;
    ctx.save();ctx.fillStyle='#101014';ctx.fillRect(0,0,w,h);
    const order=['video','overlay','sticker','text'];
    const clips:Clip[]=[];
    for(const type of order)for(const track of [...this.project.tracks].reverse())if(track.visible&&track.type===type)for(const clip of track.clips)if(at>=clip.start&&at<clip.start+clip.duration)clips.push(clip);
    for(const clip of clips)this.drawClip(ctx,clip,at,w,h);
    this.gizmoBounds=null;
    const selected=clips.find(c=>c.id===this.project.selectedClipId);
    if(!target&&selected)this.drawGizmo(ctx,{...selected,...interpolatedTransform(selected,at-selected.start)},w,h);
    ctx.restore();
  }
  private drawClip(ctx:CanvasRenderingContext2D,c:Clip,time:number,w:number,h:number){
    const transform=interpolatedTransform(c,time-c.start);
    ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,transform.opacity));
    ctx.globalCompositeOperation=c.blendMode==='normal'?'source-over':c.blendMode;
    ctx.translate(w/2+transform.x,h/2+transform.y);ctx.rotate(transform.rotation*Math.PI/180);ctx.scale(transform.scale,transform.scale);
    const a=c.adjustments;ctx.filter=`brightness(${100+a.brightness}%) contrast(${100+a.contrast}%) saturate(${100+a.saturation}%) hue-rotate(${a.temperature*.4}deg) blur(${a.blur}px)`;
    const remaining=c.start+c.duration-time,transition=c.transition;
    const p=transition&&remaining<transition.duration?1-remaining/transition.duration:0;
    if(transition&&p>0){
      if(transition.type==='dissolve')ctx.globalAlpha*=1-p;
      if(transition.type==='slideLeft')ctx.translate(-w*p,0);
      if(transition.type==='slideRight')ctx.translate(w*p,0);
      if(transition.type==='zoomIn'){ctx.scale(1+p*.5,1+p*.5);ctx.globalAlpha*=1-p;}
    }
    if(c.type==='text'&&c.text){
      const t=c.text,lines=t.content.split('\n'),size=t.fontSize;
      ctx.font=`${t.italic?'italic ':''}${t.bold?'700 ':''}${size}px ${t.fontFamily},sans-serif`;ctx.textAlign=t.align||'center';ctx.textBaseline='middle';
      if(t.shadow){ctx.shadowColor='#101014';ctx.shadowBlur=10;ctx.shadowOffsetY=3;}
      lines.forEach((line,i)=>{const y=(i-(lines.length-1)/2)*size*1.3;
        if(t.bgColor&&t.bgColor!=='transparent'){const width=ctx.measureText(line).width+40;ctx.fillStyle=t.bgColor;ctx.fillRect(-width/2,y-size*.65,width,size*1.3);}
        if(t.strokeColor&&t.strokeWidth){ctx.strokeStyle=t.strokeColor;ctx.lineWidth=t.strokeWidth;ctx.strokeText(line,0,y);}
        ctx.fillStyle=t.color;ctx.fillText(line,0,y);
      });
    }else if(c.element instanceof HTMLImageElement&&c.element.complete&&c.element.naturalWidth){
      if(c.type==='sticker')ctx.drawImage(c.element,-120,-120,240,240);else this.drawImage(ctx,c.element,w,h);
    }else if(c.element instanceof HTMLVideoElement){
      if(c.element.readyState>=2){
        if(c.chromaKey.enabled)this.drawChroma(ctx,c,w,h);else this.drawImage(ctx,c.element,w,h);
      }
    }else if(c.type==='video')SAMPLE_VIDEOS.find(s=>s.id===c.src)?.generator?.((time-c.start)*c.speed+c.offset,ctx,w,h);
    else if(c.type==='sticker'){ctx.font='100px sans-serif';ctx.textAlign='center';ctx.fillText('✦',0,0);}
    ctx.filter='none';
    if(transition&&p>0&&['fadeBlack','fadeWhite'].includes(transition.type)){ctx.fillStyle=transition.type==='fadeBlack'?`rgba(0,0,0,${p})`:`rgba(255,255,255,${p})`;ctx.fillRect(-w/2,-h/2,w,h);}
    if(a.vignette>0){const g=ctx.createRadialGradient(0,0,Math.min(w,h)*.2,0,0,Math.max(w,h)*.65);g.addColorStop(0,'transparent');g.addColorStop(1,`rgba(0,0,0,${a.vignette/100})`);ctx.fillStyle=g;ctx.fillRect(-w/2,-h/2,w,h);}
    ctx.restore();
  }
  private drawImage(ctx:CanvasRenderingContext2D,image:HTMLVideoElement|HTMLImageElement,w:number,h:number){
    const iw=image instanceof HTMLVideoElement?image.videoWidth:image.naturalWidth,ih=image instanceof HTMLVideoElement?image.videoHeight:image.naturalHeight;
    const scale=Math.min(w/iw,h/ih);ctx.drawImage(image,-iw*scale/2,-ih*scale/2,iw*scale,ih*scale);
  }
  private drawChroma(ctx:CanvasRenderingContext2D,clip:Clip,w:number,h:number){
    const video=clip.element as HTMLVideoElement,canvas=this.chromaCanvas;canvas.width=Math.min(640,video.videoWidth);canvas.height=Math.max(1,Math.round(canvas.width*video.videoHeight/video.videoWidth));
    const off=canvas.getContext('2d',{willReadFrequently:true})!;off.drawImage(video,0,0,canvas.width,canvas.height);
    const image=off.getImageData(0,0,canvas.width,canvas.height),hex=clip.chromaKey.color;
    const key=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const threshold=clip.chromaKey.similarity*441,soft=Math.max(1,clip.chromaKey.smoothness*100);
    for(let i=0;i<image.data.length;i+=4){const dist=Math.hypot(image.data[i]-key[0],image.data[i+1]-key[1],image.data[i+2]-key[2]);image.data[i+3]*=Math.max(0,Math.min(1,(dist-threshold)/soft));}
    off.putImageData(image,0,0);const scale=Math.min(w/canvas.width,h/canvas.height);ctx.drawImage(canvas,-canvas.width*scale/2,-canvas.height*scale/2,canvas.width*scale,canvas.height*scale);
  }
  private drawGizmo(ctx:CanvasRenderingContext2D,c:Clip,w:number,h:number){
    const bw=(c.type==='text'?Math.min(w,Math.max(180,(c.text?.content.length||10)*(c.text?.fontSize||48)*.6)):c.type==='sticker'?240:w)*c.scale;
    const bh=(c.type==='text'?(c.text?.fontSize||48)*1.5:c.type==='sticker'?240:h)*c.scale;
    const x=w/2+c.x,y=h/2+c.y;ctx.save();ctx.translate(x,y);ctx.rotate(c.rotation*Math.PI/180);ctx.strokeStyle='#FF701A';ctx.lineWidth=3;ctx.strokeRect(-bw/2,-bh/2,bw,bh);
    for(const px of [-bw/2,bw/2])for(const py of [-bh/2,bh/2]){ctx.fillStyle='#FFF4E8';ctx.fillRect(px-6,py-6,12,12);}
    ctx.beginPath();ctx.moveTo(0,-bh/2);ctx.lineTo(0,-bh/2-24);ctx.stroke();ctx.beginPath();ctx.arc(0,-bh/2-24,7,0,Math.PI*2);ctx.fillStyle='#FF701A';ctx.fill();ctx.restore();
    this.gizmoBounds={x:x-bw/2,y:y-bh/2,width:bw,height:bh,rotation:c.rotation};
  }
  async exportVideo(options:ExportOptions,onProgress:(p:number,frame:number,total:number)=>void):Promise<Blob>{
    if(this.exporting)throw new Error('Uma exportação já está em andamento.');
    const mime=recorderMime(options.format,m=>MediaRecorder.isTypeSupported(m));
    if(!mime)throw new Error(`Este navegador não exporta ${options.format.toUpperCase()}. Escolha outro formato.`);
    const duration=projectDuration(this.project);if(duration<=0)throw new Error('Adicione um clipe antes de exportar.');
    const previous=this.currentTime;this.pause();this.exporting=true;this.exportAbort=new AbortController();
    const abort=this.exportAbort.signal,canvas=document.createElement('canvas');canvas.width=options.width;canvas.height=options.height;
    const ctx=canvas.getContext('2d')!,stream=canvas.captureStream(options.fps);
    let output:ReturnType<AudioEngine['connectExport']>|undefined;
    let recorder:MediaRecorder|undefined;
    try{
      await document.fonts.ready;
      await Promise.all(this.project.tracks.filter(t=>t.visible&&!t.muted).flatMap(t=>t.clips).filter(c=>['audio','sfx','video'].includes(c.type)).map(c=>this.audioEngine.getAudioBufferForClip(c)));
      if(abort.aborted)throw new DOMException('Exportação cancelada.','AbortError');
      output=this.audioEngine.connectExport();output.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
      recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:options.quality==='high'?8_000_000:4_000_000});
      const chunks:Blob[]=[];const stopped=new Promise<Blob>((resolve,reject)=>{recorder!.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder!.onstop=()=>resolve(new Blob(chunks,{type:recorder!.mimeType}));recorder!.onerror=()=>reject(new Error('O navegador interrompeu a exportação.'));});
      this.currentTime=0;this.syncMedia();
      ctx.save();ctx.scale(canvas.width/this.canvas.width,canvas.height/this.canvas.height);this.render(ctx,0);ctx.restore();
      recorder.start(250);const origin=performance.now(),frames=Math.ceil(duration*options.fps);
      await new Promise<void>((resolve,reject)=>{
        let raf=0;const cancel=()=>{cancelAnimationFrame(raf);reject(new DOMException('Exportação cancelada.','AbortError'));};abort.addEventListener('abort',cancel,{once:true});
        const tick=()=>{if(abort.aborted)return;this.currentTime=Math.min(duration,(performance.now()-origin)/1000);this.syncMedia();ctx.save();ctx.scale(canvas.width/this.canvas.width,canvas.height/this.canvas.height);this.render(ctx,this.currentTime);ctx.restore();
          const current=Math.min(frames,Math.floor(this.currentTime*options.fps));onProgress(Math.min(99,Math.floor(this.currentTime/duration*100)),current,frames);
          if(this.currentTime>=duration){abort.removeEventListener('abort',cancel);resolve();}else raf=requestAnimationFrame(tick);
        };raf=requestAnimationFrame(tick);
      });
      recorder.stop();const raw=await stopped;if(!raw.size)throw new Error('O navegador gerou um arquivo vazio.');const blob=await finalizeWebM(raw,duration);onProgress(100,Math.ceil(duration*options.fps),Math.ceil(duration*options.fps));return blob;
    }finally{if(recorder?.state==='recording')recorder.stop();this.exporting=false;this.exportAbort=null;this.audioEngine.stopAll();output?.disconnect();stream.getVideoTracks().forEach(t=>t.stop());this.pause();this.seek(previous);}
  }
  cancelExport(){this.exportAbort?.abort();}
  dispose(){this.cancelExport();this.pause();this.times=[];this.states=[];}
}
