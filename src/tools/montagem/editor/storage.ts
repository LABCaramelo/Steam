import { toolStorageKey } from '../../../toolLifecycle';
import type { Clip, Project } from './types';

import { serializeProject } from './model';
export { serializeProject } from './model';

/** One browser database per account; files stay local and remain usable after a reload. */
export class DraftStore {
  private db: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;
  private assets = new Map<string,{file:Blob;url:string}>();
  private pending = new Map<string,Blob>();
  private closed = false;
  constructor(private userId: string) {}
  private open(): Promise<IDBDatabase> {
    if (this.closed) return Promise.reject(new Error('Projeto fechado.'));
    if (this.db) return Promise.resolve(this.db);
    if (!this.opening) this.opening = new Promise((resolve,reject) => {
      const req = indexedDB.open(toolStorageKey(this.userId,'montagem','projects'),1);
      req.onupgradeneeded=()=>{req.result.createObjectStore('draft');req.result.createObjectStore('assets');};
      req.onsuccess=()=>{
        if (this.closed) {req.result.close();reject(new Error('Projeto fechado.'));return;}
        this.db=req.result; this.db.onversionchange=()=>this.close(); resolve(this.db);
      };
      req.onerror=()=>{this.opening=null;reject(req.error);};
    });
    return this.opening;
  }
  register(file:Blob,url:string):string {
    const id=crypto.randomUUID(); this.assets.set(id,{file,url});this.pending.set(id,file);return id;
  }
  async save(project:Project):Promise<void> {
    const snapshot=serializeProject(project);
    const db=await this.open();
    const pending=new Map(this.pending);
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(['draft','assets'],'readwrite');
      tx.objectStore('draft').put(snapshot,'current');
      for (const [id,file] of pending) tx.objectStore('assets').put(file,id);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
    for(const [id,file] of pending) if(this.pending.get(id)===file)this.pending.delete(id);
  }
  async load():Promise<Project|null> {
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(['draft','assets'],'readonly');
      const draft=tx.objectStore('draft').get('current');
      const keys=tx.objectStore('assets').getAllKeys();
      const files=tx.objectStore('assets').getAll();
      tx.oncomplete=()=>{
        if(this.closed){resolve(null);return;}
        try {
          const project=draft.result?JSON.parse(draft.result) as Project:null;
          if(project && (!Array.isArray(project.tracks)||typeof project.title!=='string'))throw new Error('Rascunho inválido.');
          keys.result.forEach((id,i)=>{const file=files.result[i] as Blob;this.assets.set(String(id),{file,url:URL.createObjectURL(file)});});
          if(project)this.hydrate(project);resolve(project);
        }catch(error){reject(error);}
      };
      tx.onerror=()=>reject(tx.error);
    });
  }
  hydrate(project:Project) {
    for(const track of project.tracks) for(const clip of track.clips) {
      const asset=clip.assetId?this.assets.get(clip.assetId):undefined;
      if(asset)clip.src=asset.url;
      if(clip.element || !clip.src)continue;
      if(clip.type==='image' || (clip.type==='sticker' && clip.src.startsWith('/caramelo/'))) {
        const img=new Image();img.onload=()=>window.dispatchEvent(new Event('montagem:media-ready'));img.src=clip.src;clip.element=img;
      } else if(clip.type==='video' && (clip.src.startsWith('blob:')||clip.src.startsWith('/'))) {
        const video=document.createElement('video');video.onloadeddata=()=>window.dispatchEvent(new Event('montagem:media-ready'));video.src=clip.src;video.playsInline=true;video.muted=true;video.preload='auto';clip.element=video;
      }
    }
  }
  releaseClip(clip:Clip){if(clip.element instanceof HTMLMediaElement)clip.element.pause();}
  close(){this.closed=true;this.db?.close();this.db=null;for(const asset of this.assets.values())URL.revokeObjectURL(asset.url);this.assets.clear();}
}
