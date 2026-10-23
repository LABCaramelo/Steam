import type { Clip } from '../types';
import { SAMPLE_AUDIO } from '../assets/sampleMedia';

export class AudioEngine {
  private ctx:AudioContext|null=null;
  private master:GainNode|null=null;
  private cache=new Map<string,Promise<AudioBuffer|null>>();
  private active=new Map<string,{node:AudioBufferSourceNode;gain:GainNode;started:number;offset:number;speed:number}>();
  private wanted=new Map<string,Clip>();
  private loading=new Set<string>();
  private time=0;
  private disposed=false;
  getAudioContext():AudioContext {
    if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);}
    if(this.ctx.state==='suspended')void this.ctx.resume();
    return this.ctx;
  }
  getAudioBufferForClip(clip:Clip):Promise<AudioBuffer|null> {
    const key=clip.assetId||clip.src||clip.id;
    const known=this.cache.get(key);if(known)return known;
    const loading=(async()=>{
      const ctx=this.getAudioContext();
      const sample=SAMPLE_AUDIO.find(s=>s.id===clip.src);
      if(sample?.audioGenerator)return sample.audioGenerator(ctx);
      if(!clip.src || !/^(blob:|\/)/.test(clip.src))return null;
      try {const res=await fetch(clip.src);return await ctx.decodeAudioData(await res.arrayBuffer());}
      catch {return null;}
    })();this.cache.set(key,loading);return loading;
  }
  async extractWaveform(clip:Clip,points=80):Promise<number[]> {
    if(clip.waveform?.length)return clip.waveform;
    const buffer=await this.getAudioBufferForClip(clip);
    if(!buffer)return Array(points).fill(0);
    const data=buffer.getChannelData(0),step=Math.max(1,Math.floor(data.length/points));
    clip.waveform=Array.from({length:points},(_,i)=>{
      let sum=0,count=0;for(let j=i*step;j<Math.min(data.length,(i+1)*step);j++){sum+=Math.abs(data[j]);count++;}
      return Math.min(1,(sum/Math.max(1,count))*2.5);
    });return clip.waveform;
  }
  syncPlayback(clips:Clip[],time:number,playing:boolean) {
    this.time=time;
    this.wanted=new Map(playing?clips.filter(c=>!c.audio.muted).map(c=>[c.id,c]):[]);
    for(const [id,source] of this.active){
      const clip=this.wanted.get(id);
      const expected=clip?clip.offset+(time-clip.start)*clip.speed:0;
      const actual=source.offset+(this.ctx!.currentTime-source.started)*source.speed;
      if(!clip || Math.abs(actual-expected)>.25 || source.speed!==clip.speed){this.stop(id);continue;}
      source.gain.gain.setTargetAtTime(this.volume(clip,time),this.ctx!.currentTime,.015);
    }
    if(!playing||this.disposed)return;
    for(const clip of this.wanted.values())if(!this.active.has(clip.id)&&!this.loading.has(clip.id)){
      this.loading.add(clip.id);void this.start(clip);
    }
  }
  private volume(clip:Clip,time:number) {
    const local=time-clip.start,left=clip.duration-local;
    const fadeIn=clip.audio.fadeIn?Math.min(1,local/clip.audio.fadeIn):1;
    const fadeOut=clip.audio.fadeOut?Math.min(1,left/clip.audio.fadeOut):1;
    return Math.max(0,Math.min(2,clip.audio.volume))*Math.max(0,Math.min(fadeIn,fadeOut));
  }
  private async start(clip:Clip) {
    try {
      const buffer=await this.getAudioBufferForClip(clip);
      if(!buffer||this.disposed||!this.wanted.has(clip.id))return;
      const ctx=this.getAudioContext(),offset=clip.offset+(this.time-clip.start)*clip.speed;
      if(offset<0||offset>=buffer.duration)return;
      const node=ctx.createBufferSource(),gain=ctx.createGain();
      node.buffer=buffer;node.playbackRate.value=clip.speed;gain.gain.value=this.volume(clip,this.time);
      node.connect(gain);gain.connect(this.master!);
      const entry={node,gain,started:ctx.currentTime,offset,speed:clip.speed};
      this.active.set(clip.id,entry);node.onended=()=>{if(this.active.get(clip.id)===entry){this.active.delete(clip.id);gain.disconnect();}};
      node.start(0,offset,Math.min(buffer.duration-offset,(clip.start+clip.duration-this.time)*clip.speed));
    } finally {this.loading.delete(clip.id);}
  }
  private stop(id:string){const source=this.active.get(id);if(source){try{source.node.stop();}catch{}source.node.disconnect();source.gain.disconnect();this.active.delete(id);}}
  stopAll(){this.wanted.clear();for(const id of this.active.keys())this.stop(id);}
  connectExport():{stream:MediaStream;disconnect:()=>void} {
    const ctx=this.getAudioContext(),destination=ctx.createMediaStreamDestination();
    this.master!.disconnect(ctx.destination);this.master!.connect(destination);
    return {stream:destination.stream,disconnect:()=>{this.master?.disconnect(destination);if(this.ctx?.state!=='closed')this.master?.connect(ctx.destination);destination.stream.getTracks().forEach(t=>t.stop());}};
  }
  playSoundEffect(_type:string){/* Editing controls are intentionally silent. */}
  dispose(){this.disposed=true;this.stopAll();this.cache.clear();void this.ctx?.close();}
}
