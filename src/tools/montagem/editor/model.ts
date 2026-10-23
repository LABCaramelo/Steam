import type { AspectRatio, Clip, Project } from './types';

export const RATIOS: readonly AspectRatio[] = ['16:9','9:16','1:1','4:3','3:4','2:1','2.35:1','1.85:1','21:9'];
export function escapeHTML(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
}
export function outputSize(ratio: AspectRatio, shortSide = 1080): [number, number] {
  const [a,b] = ratio.split(':').map(Number);
  const scale = shortSide / Math.min(a,b);
  return [Math.round(a*scale/2)*2, Math.round(b*scale/2)*2];
}
export function projectDuration(project: Project): number {
  return Math.max(0, ...project.tracks.flatMap(t => t.clips.map(c => c.start+c.duration)));
}
export function serializeProject(project: Project): string {
  return JSON.stringify(project, (key,value) => key === 'element' || key === 'file' || key === 'thumbnails' ? undefined : value);
}
export function cloneClip(clip: Clip): Clip {
  // DOM media elements cannot be JSON cloned. Each video clip needs its own playback cursor.
  const copy = JSON.parse(JSON.stringify(clip, (key,value) => key === 'element' || key === 'file' ? undefined : value)) as Clip;
  if (clip.element instanceof HTMLImageElement) copy.element = clip.element;
  else if (clip.element instanceof HTMLVideoElement) {
    const video = document.createElement('video');
    video.onloadeddata=()=>window.dispatchEvent(new Event('montagem:media-ready'));
    video.src = clip.element.src; video.muted = true; video.playsInline = true; video.preload = 'auto';
    copy.element = video;
  }
  return copy;
}
export function splitTiming(clip: Pick<Clip,'start'|'duration'|'offset'|'speed'>, at: number) {
  if (at <= clip.start || at >= clip.start+clip.duration) return null;
  const first = at-clip.start;
  return {first, second:clip.duration-first, offset:clip.offset+first*clip.speed};
}
export function interpolatedTransform(clip:Clip,time:number){
  const result={x:clip.x,y:clip.y,scale:clip.scale,rotation:clip.rotation,opacity:clip.opacity};
  for(const key of ['x','y','scale','rotation','opacity'] as const){
    const frames=(clip.keyframes||[]).filter(f=>typeof f[key]==='number').sort((a,b)=>a.time-b.time);
    if(!frames.length)continue;
    const left=[...frames].reverse().find(f=>f.time<=time)||frames[0];
    const right=frames.find(f=>f.time>time)||left;
    const p=right.time===left.time?0:Math.max(0,Math.min(1,(time-left.time)/(right.time-left.time)));
    result[key]=left[key]!+(right[key]!-left[key]!)*p;
  }
  return result;
}
export function recorderMime(format: 'mp4'|'webm', supports: (mime:string)=>boolean): string | undefined {
  const candidates = format === 'mp4'
    ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4']
    : ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return candidates.find(supports);
}
