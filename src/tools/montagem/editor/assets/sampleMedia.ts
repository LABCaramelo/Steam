import type { TextConfig } from '../types';
export interface SampleMediaItem {
  id:string;name:string;type:'video'|'image'|'audio'|'text'|'sticker';category:string;duration:number;previewUrl:string;videoUrl?:string;
  generator?:(time:number,ctx:CanvasRenderingContext2D,w:number,h:number)=>void;
  audioGenerator?:(ctx:AudioContext)=>AudioBuffer;
}
function thumbnail(color:string,label:string){return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#101014"/><circle cx="240" cy="58" r="85" fill="${color}"/><text x="22" y="142" font-family="sans-serif" font-size="24" font-weight="700" fill="#FFF4E8">${label}</text></svg>`);}
export const SAMPLE_VIDEOS:SampleMediaItem[]=[
  {id:'cyberpunk_neon',name:'Estúdio Caramelo',type:'video',category:'Fundo animado · Caramelo',duration:6,previewUrl:thumbnail('#FF701A','ESTÚDIO'),generator:(time,ctx,w,h)=>{
    ctx.fillStyle='#101014';ctx.fillRect(-w/2,-h/2,w,h);
    ctx.save();ctx.translate(w*.29,0);ctx.rotate(time*.08);ctx.strokeStyle='#FF701A';ctx.lineWidth=w*.075;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,w*(.11+i*.115),-.8,Math.PI*1.45);ctx.stroke();}ctx.restore();
    ctx.fillStyle='#FFF4E8';ctx.font=`700 ${w*.018}px Montserrat,sans-serif`;ctx.textAlign='left';ctx.fillText('UM CARA CARAMELO',-w*.43,-h*.32);
    ctx.fillStyle='#A3A3B0';ctx.font=`${w*.012}px Inter,sans-serif`;ctx.fillText('LAB / ESTÚDIO CRIATIVO',-w*.43,h*.36);
    ['#FF701A','#25BFFF','#FF3D8D','#FFD52A','#8B5CFF'].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(-w*.43+i*w*.026,h*.39,w*.018,h*.012);});
  }},
  {id:'abstract_waves',name:'Movimento azul',type:'video',category:'Fundo animado · Caramelo',duration:5,previewUrl:thumbnail('#25BFFF','MOVIMENTO'),generator:(t,ctx,w,h)=>{
    ctx.fillStyle='#0A0A0D';ctx.fillRect(-w/2,-h/2,w,h);
    ['#25BFFF','#8B5CFF','#FF3D8D'].forEach((color,i)=>{ctx.strokeStyle=color;ctx.lineWidth=w*.04;ctx.beginPath();for(let x=-w/2;x<=w/2;x+=10){const y=Math.sin(x/w*7+t+i)*h*.18+i*h*.13-h*.14;x===-w/2?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();});
  }},
  {id:'golden_bokeh',name:'Papel & ideia',type:'video',category:'Fundo animado · Caramelo',duration:5,previewUrl:thumbnail('#FFD52A','IDEIA'),generator:(t,ctx,w,h)=>{
    ctx.fillStyle='#FFF4E8';ctx.fillRect(-w/2,-h/2,w,h);ctx.save();ctx.translate(Math.sin(t*.5)*w*.08,0);ctx.rotate(t*.05);ctx.fillStyle='#FF701A';ctx.fillRect(-w*.2,-h*.25,w*.4,h*.5);ctx.restore();
    ctx.fillStyle='#101014';ctx.font=`700 ${w*.08}px Montserrat,sans-serif`;ctx.textAlign='center';ctx.fillText('IDEIA EM AÇÃO.',0,w*.025);
  }},
];
function tone(ctx:AudioContext,duration:number,base:number){const b=ctx.createBuffer(2,Math.floor(ctx.sampleRate*duration),ctx.sampleRate);for(let ch=0;ch<2;ch++){const data=b.getChannelData(ch);for(let i=0;i<data.length;i++){const t=i/ctx.sampleRate,beat=t%.5,envelope=Math.exp(-beat*7)*.14;data[i]=(Math.sin(t*Math.PI*2*base)+Math.sin(t*Math.PI*2*base*1.5)*.35)*envelope*Math.min(1,t*5,(duration-t)*5);}}return b;}
export const SAMPLE_AUDIO:SampleMediaItem[]=[
  {id:'upbeat_synth',name:'Pulso criativo',type:'audio',category:'Trilha sintetizada',duration:12,previewUrl:'',audioGenerator:ctx=>tone(ctx,12,220)},
  {id:'lofi_chill',name:'Pausa para criar',type:'audio',category:'Trilha sintetizada',duration:12,previewUrl:'',audioGenerator:ctx=>tone(ctx,12,164.81)},
  {id:'sfx_whoosh',name:'Acento de transição',type:'audio',category:'Efeito sintetizado',duration:1.5,previewUrl:'',audioGenerator:ctx=>tone(ctx,1.5,110)},
];
export const TEXT_PRESETS:(TextConfig&{id:string;name:string})[]=[
  {id:'impacto',name:'Impacto / Montserrat',content:'SUA IDEIA MERECE CENA.',fontSize:72,fontFamily:'Montserrat',color:'#FFF4E8',bgColor:'transparent',bold:true,align:'center'},
  {id:'assinatura',name:'Assinatura / Caramelo',content:'feito do seu jeito.',fontSize:88,fontFamily:'Covered By Your Grace',color:'#FF701A',bgColor:'transparent',align:'center'},
  {id:'legenda',name:'Legenda / Inter',content:'Uma história começa aqui.',fontSize:48,fontFamily:'Inter',color:'#FFF4E8',bgColor:'#101014',align:'center'},
];
export const STICKER_PRESETS=['camera','raio','seta','estrelas','olho','caramelo'].map((id,i)=>({id,name:['Câmera','Raio','Seta','Estrelas','Olho','Caramelo'][i],category:'Caramelo',emoji:'',src:`/caramelo/stickers/${id}.webp`}));
