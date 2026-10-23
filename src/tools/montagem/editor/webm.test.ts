import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeWebM } from './webm.ts';

test('live WebM gains a finite Duration without rewriting its media payload',async()=>{
  const bytes=Uint8Array.from([0x1a,0x45,0xdf,0xa3,0x80,0x18,0x53,0x80,0x67,0xff,0x15,0x49,0xa9,0x66,0x87,0x2a,0xd7,0xb1,0x83,0x0f,0x42,0x40,0x1f,0x43,0xb6,0x75,0x80]);
  const result=new Uint8Array(await (await finalizeWebM(new Blob([bytes],{type:'video/webm'}),2.5)).arrayBuffer());
  assert.equal(result[14],0x92); // Info grew by 11 bytes.
  assert.deepEqual([...result.slice(22,25)],[0x44,0x89,0x88]);
  assert.equal(new DataView(result.buffer).getFloat64(25,false),2500);
  assert.deepEqual(result.slice(-5),bytes.slice(-5));
  const second=await finalizeWebM(new Blob([result],{type:'video/webm'}),2.5);
  assert.equal(second.size,result.length); // Already finalized: do not add another Duration.
});
test('non-WebM containers are left byte-for-byte intact',async()=>{
  const blob=new Blob(['mp4'],{type:'video/mp4'});assert.equal(await finalizeWebM(blob,3),blob);
});
