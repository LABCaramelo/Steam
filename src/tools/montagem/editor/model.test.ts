import test from 'node:test';
import assert from 'node:assert/strict';
import { outputSize, recorderMime, splitTiming, escapeHTML, serializeProject, interpolatedTransform } from './model.ts';
import { parseSRT } from './subtitles.ts';

test('split respects playback speed and source offset',()=>{
  assert.deepEqual(splitTiming({start:3,duration:8,offset:1,speed:2},5),{first:2,second:6,offset:5});
  assert.equal(splitTiming({start:3,duration:8,offset:1,speed:2},11),null);
});
test('export dimensions preserve every supported aspect ratio with even pixels',()=>{
  assert.deepEqual(outputSize('9:16',720),[720,1280]);
  assert.deepEqual(outputSize('4:3',1080),[1440,1080]);
  assert.deepEqual(outputSize('21:9',1080),[2520,1080]);
  assert.deepEqual(outputSize('1:1',720),[720,720]);
});
test('MP4 export never silently substitutes a WebM codec',()=>{
  assert.equal(recorderMime('mp4',s=>s.startsWith('video/webm')),undefined);
  assert.equal(recorderMime('webm',s=>s==='video/webm;codecs=vp8,opus'),'video/webm;codecs=vp8,opus');
});
test('keyframe interpolation clamps endpoints and interpolates independent properties',()=>{
  const clip={x:0,y:4,scale:1,rotation:0,opacity:1,keyframes:[{time:0,x:0},{time:2,x:100,opacity:.2}]} as never;
  assert.equal(interpolatedTransform(clip,1).x,50);
  assert.equal(interpolatedTransform(clip,3).x,100);
  assert.equal(interpolatedTransform(clip,1).y,4);
});
test('SRT parses multiline captions and rejects invalid timing',()=>{
  assert.deepEqual(parseSRT('1\r\n00:00:01,500 --> 00:00:03,000\r\nOlá <b>mundo</b>\r\nsegunda linha'),[{start:1.5,duration:1.5,text:'Olá mundo\nsegunda linha'}]);
  assert.throws(()=>parseSRT('1\n00:00:03,000 --> 00:00:01,000\nInválida'));
});
test('project history excludes browser media objects and preserves asset identities',()=>{
  const source={title:'Projeto',tracks:[{clips:[{assetId:'media-1',element:{secret:'DOM'},file:'blob',name:'x'}]}]};
  assert.deepEqual(JSON.parse(serializeProject(source as never)),{title:'Projeto',tracks:[{clips:[{assetId:'media-1',name:'x'}]}]});
  assert.equal(escapeHTML('<img src=x onerror="x">'),'&lt;img src=x onerror=&quot;x&quot;&gt;');
});
