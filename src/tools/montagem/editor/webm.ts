// Finalize the live WebM header produced by Chromium MediaRecorder.
// Duration is in Segment Ticks: https://www.matroska.org/technical/elements.html
function element(bytes:Uint8Array,offset:number){
  let idLength=1;while(idLength<=4&&!(bytes[offset]&(128>>(idLength-1))))idLength++;
  if(idLength>4||offset+idLength>=bytes.length)throw new Error('Cabeçalho EBML inválido.');
  let id=0;for(let i=0;i<idLength;i++)id=id*256+bytes[offset+i];
  const sizeOffset=offset+idLength;let length=1;while(length<=8&&!(bytes[sizeOffset]&(128>>(length-1))))length++;
  if(length>8||sizeOffset+length>bytes.length)throw new Error('Tamanho EBML inválido.');
  let size=BigInt(bytes[sizeOffset]&((1<<(8-length))-1));
  for(let i=1;i<length;i++)size=size*256n+BigInt(bytes[sizeOffset+i]);
  return {id,sizeOffset,length,size,data:sizeOffset+length,unknown:size===(1n<<BigInt(length*7))-1n};
}
function sizeBytes(value:number,length:number){
  if(BigInt(value)>=(1n<<BigInt(length*7))-1n)throw new Error('Metadados WebM excedem o tamanho reservado.');
  let encoded=BigInt(value)|(1n<<BigInt(length*7));const result=new Uint8Array(length);
  for(let i=length-1;i>=0;i--){result[i]=Number(encoded&255n);encoded>>=8n;}return result;
}
export async function finalizeWebM(blob:Blob,seconds:number):Promise<Blob>{
  if(!blob.type.startsWith('video/webm'))return blob;
  const bytes=new Uint8Array(await blob.slice(0,65536).arrayBuffer());
  const header=element(bytes,0);if(header.id!==0x1a45dfa3)return blob;
  const segment=element(bytes,header.data+Number(header.size));
  // Indexed/finalized files already carry their own offsets. This patch is for live segments only.
  if(segment.id!==0x18538067||!segment.unknown)return blob;
  for(let offset=segment.data;offset<bytes.length;){
    const info=element(bytes,offset);if(info.id===0x114d9b74)return blob; // SeekHead offsets must stay intact.
    if(info.id===0x1549a966){
      const end=info.data+Number(info.size);if(end>bytes.length)return blob;
      let scale=1_000_000;
      for(let at=info.data;at<end;){const child=element(bytes,at);if(child.id===0x4489||child.id===0xbf)return blob;if(child.id===0x2ad7b1){scale=0;for(let i=0;i<Number(child.size);i++)scale=scale*256+bytes[child.data+i];}at=child.data+Number(child.size);}
      const duration=new Uint8Array(11);duration.set([0x44,0x89,0x88]);new DataView(duration.buffer).setFloat64(3,seconds*1e9/scale,false);
      const prefix=bytes.slice(0,info.sizeOffset),size=sizeBytes(Number(info.size)+duration.length,info.length);
      return new Blob([prefix,size,bytes.slice(info.data,end),duration,blob.slice(end)],{type:blob.type});
    }
    if(info.unknown)break;offset=info.data+Number(info.size);
  }
  return blob;
}
