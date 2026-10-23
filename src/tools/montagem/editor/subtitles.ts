export function parseSRT(source:string):{start:number;duration:number;text:string}[]{
  const time=(s:string)=>{const [h,m,rest]=s.replace(',','.').split(':');return Number(h)*3600+Number(m)*60+Number(rest);};
  const results=[];
  for(const block of source.replace(/\r/g,'').trim().split(/\n\s*\n/)){
    const match=block.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})[^\n]*\n([\s\S]+)/);
    if(!match)continue;
    const start=time(match[1]),end=time(match[2]);
    if(end>start&&Number.isFinite(end)&&start>=0)results.push({start,duration:end-start,text:match[3].replace(/<[^>]*>/g,'').trim().slice(0,2000)});
    if(results.length>=5000)throw new Error('Use um arquivo com até 5.000 legendas.');
  }
  if(!results.length)throw new Error('Nenhuma legenda válida. Selecione um arquivo SRT com tempos e texto.');
  return results;
}
