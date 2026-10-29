import assert from 'node:assert/strict';
import test from 'node:test';
import {projectForEachGraph as project,canonicalConnection as translate} from '../src/tools/trama/app/components/flux/loopProjection.js';
import {executeGraph as execute} from './trama/engine/runtime/index.js';
import {projectAgentGraph as projectAgentsRaw,agentAttachment,agentSlot} from '../src/tools/trama/app/components/flux/agentProjection.js';

type Point={x:number;y:number};
type Step={id:string;app:string;config?:Record<string,unknown>;position?:Point};
type Edge={id?:string;source:string;target:string;sourceHandle?:string;targetHandle?:string};
type Loop={id:string;exitId:string;exit:Point;parent:Loop|null;members:Set<string>};
type Projection={positions:Record<string,Point>;loops:Loop[];loopById:Map<string,Loop>;virtualNodes:{id:string;draggable:boolean}[];visualEdges:(Edge&{data:{canonicalId:string}})[];decorative:(Edge&{type?:string})[];placeholders:{position:Point;data:{sourceId:string;sourceHandle:string}}[]};
const projectForEachGraph=project as unknown as (steps:Step[],edges?:Edge[],options?:{preserve?:boolean})=>Projection;
type AgentProjection=Projection&{resourceIds:Set<string>;attachmentById:Map<string,{role:string;parentId:string}>;agentSlots:Map<string,{model:string[];memory:string[];tools:string[]}>};
const projectAgents=projectAgentsRaw as unknown as (steps:Step[],edges?:Edge[],options?:{preserve?:boolean})=>AgentProjection;
const canonicalConnection=translate as unknown as (connection:Edge,view:Projection)=>Edge|null;
const executeGraph=execute as unknown as (args:{flux:{steps:Step[];edges:Edge[]}})=>Promise<{status:string;steps:{id:string;output:{item:number}}[]}>;

const point=(value:unknown)=>value as {x:number;y:number};
const nodes=()=>[{id:'IN',app:'webhook',position:{x:0,y:0}},{id:'L',app:'for_each',config:{iterable:[1,2]},position:{x:324,y:0}},{id:'B',app:'set_variables',config:{values:{item:'{{$L.iterable}}'}},position:{x:648,y:-115}},{id:'A',app:'set_variables',config:{values:{rows:'{{$L.result}}'}},position:{x:648,y:115}}];
const links=()=>[{id:'in',source:'IN',target:'L'},{id:'body',source:'L',target:'B',sourceHandle:'body'},{id:'done',source:'L',target:'A',sourceHandle:'done'}];

test('For Each view puts the body between an entry/exit pair without mutating saved flow data',()=>{
  const steps=nodes(),edges=links(),before=JSON.stringify({steps,edges}),view=projectForEachGraph(steps,edges);
  const loop=view.loops[0],exit=point(loop.exit);
  assert.ok(view.positions.B.y>view.positions.L.y);assert.ok(view.positions.B.x>view.positions.L.x);assert.ok(exit.x>view.positions.B.x);assert.equal(exit.y,view.positions.L.y);assert.ok(view.positions.A.x>exit.x);assert.equal(view.positions.A.y,view.positions.L.y);
  assert.equal(view.virtualNodes.length,1);assert.equal(view.virtualNodes[0].draggable,false);assert.equal(view.visualEdges.find(edge=>edge.id==='done')?.source,loop.exitId);
  assert.ok(view.decorative.some(edge=>edge.type==='loop-scope'));assert.equal(JSON.stringify({steps,edges}),before);
});

test('empty For Each keeps its add action inside the loop and maps its exit back to done',()=>{
  const steps=nodes().filter(step=>step.id!=='B'),edges=links().filter(edge=>edge.id!=='body'),view=projectForEachGraph(steps,edges),loop=view.loops[0];
  const add=view.placeholders.find(node=>node.data.sourceId==='L');assert.equal(add?.data.sourceHandle,'body');assert.ok(add!.position.y>view.positions.L.y);assert.ok(add!.position.x<point(loop.exit).x);
  assert.deepEqual(canonicalConnection({source:loop.exitId,target:'A',sourceHandle:'done'},view),{source:'L',target:'A',sourceHandle:'done'});
  assert.equal(canonicalConnection({source:'B',target:loop.exitId},view),null,'automatic closure cannot create a cycle in the executable graph');
});

test('legacy unlabeled edges remain continuations while all runtime body aliases use the entry',()=>{
  for(const handle of ['body','loop','iterate','iteration','each']){
    const edges=links();edges[1].sourceHandle=handle;delete edges[2].sourceHandle;
    const view=projectForEachGraph(nodes(),edges),loop=view.loops[0];
    assert.equal(view.visualEdges.find(edge=>edge.id==='body')?.source,'L');assert.equal(view.visualEdges.find(edge=>edge.id==='body')?.sourceHandle,'body');assert.equal(view.visualEdges.find(edge=>edge.id==='done')?.source,loop.exitId);
  }
  const legacy=projectForEachGraph(nodes().filter(step=>step.id!=='B'),undefined);
  assert.equal(legacy.loops[0].members.size,0);assert.equal(legacy.visualEdges.at(-1)?.source,legacy.loops[0].exitId);
});

test('nested For Each closes its own body before its parent continuation',()=>{
  const steps=[{id:'IN',app:'webhook'},{id:'outer',app:'for_each'},{id:'inner',app:'for_each'},{id:'body',app:'set_variables'},{id:'tail',app:'set_variables'},{id:'done',app:'return'}];
  const edges=[{source:'IN',target:'outer'},{source:'outer',target:'inner',sourceHandle:'body'},{source:'inner',target:'body',sourceHandle:'body'},{source:'inner',target:'tail',sourceHandle:'done'},{source:'outer',target:'done',sourceHandle:'done'}];
  const view=projectForEachGraph(steps,edges),outer=view.loopById.get('outer')!,inner=view.loopById.get('inner')!;
  assert.equal(inner.parent,outer);assert.ok(inner.members.has('body'));assert.ok(!inner.members.has('tail'));assert.ok(!outer.members.has('done'));
  assert.ok(view.positions.body.y>view.positions.inner.y);assert.ok(view.positions.tail.x>point(inner.exit).x);assert.ok(point(outer.exit).x>view.positions.tail.x);assert.ok(view.positions.done.x>point(outer.exit).x);
});

test('a body joining the continuation closes at the virtual exit and keeps its canonical edge id',()=>{
  const edges=[...links(),{id:'join',source:'B',target:'A',sourceHandle:'out'}],view=projectForEachGraph(nodes(),edges);
  const closure=view.visualEdges.find(edge=>edge.id==='join')!;
  assert.equal(closure.target,view.loops[0].exitId);assert.equal(closure.data.canonicalId,'join');assert.equal(view.placeholders.some(node=>node.data.sourceId==='B'),false);
});

test('virtual ids avoid collisions and organized loop positions are stable after saving',()=>{
  const steps=[...nodes(),{id:'__trama_loop_exit__L',app:'set_variables',position:{x:0,y:600}}],edges=links(),view=projectForEachGraph(steps,edges,{preserve:false});
  assert.notEqual(view.loops[0].exitId,'__trama_loop_exit__L');
  const saved=steps.map(step=>({...step,position:{...view.positions[step.id]}}));
  const reopened=projectForEachGraph(saved,edges);assert.deepEqual(reopened.positions,view.positions);assert.deepEqual(reopened.loops.map(loop=>loop.exit),view.loops.map(loop=>loop.exit));
});

test('projection roundtrip retains per-item execution and exactly one continuation',async()=>{
  const steps=nodes(),edges=links();const view=projectForEachGraph(steps,edges);
  const canonical={steps:steps.map(step=>({...step,position:view.positions[step.id]})),edges};
  const result=await executeGraph({flux:canonical});
  assert.equal(result.status,'success');assert.deepEqual(result.steps.filter(step=>step.id==='B').map(step=>step.output.item),[1,2]);assert.equal(result.steps.filter(step=>step.id==='A').length,1);assert.equal(canonical.steps.length,4);assert.ok(!canonical.steps.some(step=>step.id===view.loops[0].exitId));
});

test('agent model, memory and tools are resources rather than serial loop body actions',()=>{
  for(const handle of ['model','memory','tools','tool','bottom-handle-model','bottom-handle-memory','bottom-handle-tools']){
    const steps=[...nodes(),{id:'agent',app:'ai_agent',position:{x:972,y:230}},{id:'resource',app:'chatgpt',position:{x:972,y:400}}];
    const edges=[...links(),{id:'agent-body',source:'B',target:'agent'},{id:'resource-edge',source:'agent',target:'resource',sourceHandle:handle}];
    const view=projectForEachGraph(steps,edges);
    assert.ok(view.loops[0].members.has('agent'));assert.ok(!view.loops[0].members.has('resource'));assert.ok(!view.visualEdges.some(edge=>edge.id==='resource-edge'));
    assert.deepEqual(view.positions.resource,{x:972,y:400});assert.ok(view.placeholders.some(node=>node.data.sourceId==='agent'));assert.ok(!view.placeholders.some(node=>node.data.sourceId==='resource'));
  }
});

test('agent resource lanes preserve model, memory and an entire tool subgraph independently from the main path',()=>{
  const steps=[{id:'IN',app:'webhook'},{id:'agent',app:'ai_agent'},{id:'done',app:'return'},{id:'model',app:'chatgpt'},{id:'memory',app:'agent_memory'},{id:'tool',app:'requester'},{id:'tool-tail',app:'set_variables'}];
  const edges=[{id:'entry',source:'IN',target:'agent'},{id:'out',source:'agent',target:'done'}, {id:'model-slot',source:'agent',target:'model',sourceHandle:'bottom-handle-model'},{id:'memory-slot',source:'agent',target:'memory',sourceHandle:'memory'},{id:'tool-slot',source:'agent',target:'tool',sourceHandle:'tool'},{id:'tool-out',source:'tool',target:'tool-tail'}];
  const before=JSON.stringify({steps,edges}),view=projectAgents(steps,edges,{preserve:false});
  assert.equal(view.positions.agent.y,view.positions.done.y);
  for(const id of ['model','memory','tool','tool-tail'])assert.ok(view.positions[id].y>view.positions.agent.y);
  assert.ok(view.positions['tool-tail'].x>view.positions.tool.x);
  assert.deepEqual(view.attachmentById.get('model'),{role:'model',parentId:'agent'});
  assert.deepEqual(view.agentSlots.get('agent'),{model:['model'],memory:['memory'],tools:['tool']});
  assert.equal(view.visualEdges.length,edges.length);assert.equal(view.visualEdges.find(edge=>edge.id==='model-slot')?.sourceHandle,'model');
  assert.equal(JSON.stringify({steps,edges}),before);
});

test('resource projection supports nested agents and For Each inside a tool without persisting virtual nodes',()=>{
  const steps=[{id:'IN',app:'webhook'},{id:'agent',app:'ai_agent'},{id:'loop',app:'for_each'},{id:'nested',app:'ai_agent'},{id:'model',app:'chatgpt'},{id:'memory',app:'agent_memory'},{id:'tail',app:'set_variables'}];
  const edges=[{source:'IN',target:'agent'},{source:'agent',target:'loop',sourceHandle:'tools'},{source:'loop',target:'nested',sourceHandle:'body'},{source:'nested',target:'model',sourceHandle:'model'},{source:'nested',target:'memory',sourceHandle:'memory'},{source:'loop',target:'tail',sourceHandle:'done'}];
  const view=projectAgents(steps,edges,{preserve:false}),loop=view.loopById.get('loop');
  assert.ok(loop);assert.equal(view.virtualNodes.length,1);assert.ok(view.positions.nested.y>view.positions.loop.y);assert.ok(view.positions.model.y>view.positions.nested.y);assert.ok(view.positions.memory.y>view.positions.nested.y);assert.ok(view.positions.tail.x>loop.exit.x);
  assert.ok(!steps.some(step=>step.id===loop.exitId));
  assert.deepEqual(agentAttachment('memory',edges),{role:'memory',parentId:'nested'});assert.equal(agentSlot({sourceHandle:'bottom-handle-tools'}),'tools');
});

test('organizing and reopening resource lanes is stable and a tool joining the main flow does not steal main nodes',()=>{
  const steps=[{id:'IN',app:'webhook'},{id:'agent',app:'ai_agent'},{id:'tool',app:'requester'},{id:'done',app:'return'}];
  const edges=[{source:'IN',target:'agent'},{source:'agent',target:'done'},{source:'agent',target:'tool',sourceHandle:'tools'},{source:'tool',target:'done'}];
  const view=projectAgents(steps,edges,{preserve:false});
  assert.equal(view.resourceIds.has('done'),false);assert.equal(view.resourceIds.has('tool'),true);
  assert.equal(view.visualEdges.length,edges.length);
  const saved=steps.map(step=>({...step,position:view.positions[step.id]}));
  assert.deepEqual(projectAgents(saved,edges).positions,view.positions);
});

test('multiple tool lanes leave room for a nested agent and its model and memory',()=>{
  const steps=[{id:'IN',app:'webhook'},{id:'agent',app:'ai_agent'},{id:'nested',app:'ai_agent'},{id:'second',app:'requester'},{id:'model',app:'chatgpt'},{id:'memory',app:'agent_memory'}];
  const edges=[{source:'IN',target:'agent'},{source:'agent',target:'nested',sourceHandle:'tools'},{source:'agent',target:'second',sourceHandle:'tools'},{source:'nested',target:'model',sourceHandle:'model'},{source:'nested',target:'memory',sourceHandle:'memory'}];
  const view=projectAgents(steps,edges,{preserve:false});
  assert.ok(view.positions.second.y>view.positions.model.y+200);assert.ok(view.positions.second.y>view.positions.memory.y+200);
});

test('synthetic loop exits cannot collide with resources from a different lane',()=>{
  const steps=[{id:'IN',app:'webhook'},{id:'L',app:'for_each'},{id:'agent',app:'ai_agent'},{id:'__trama_loop_exit__L',app:'chatgpt'}];
  const edges=[{source:'IN',target:'L'},{source:'L',target:'agent',sourceHandle:'body'},{source:'agent',target:'__trama_loop_exit__L',sourceHandle:'model'}];
  const view=projectAgents(steps,edges,{preserve:false}),loop=view.loopById.get('L')!;
  assert.notEqual(loop.exitId,'__trama_loop_exit__L');assert.equal(view.virtualNodes[0].id,loop.exitId);
  assert.equal(view.visualEdges.find(edge=>edge.source==='agent')?.target,'__trama_loop_exit__L');assert.ok(view.decorative.some(edge=>edge.target===loop.exitId));
});

test('new tools use the next resource lane while existing resource positions stay saved',()=>{
  const steps=[{id:'IN',app:'webhook'},{id:'agent',app:'ai_agent'},{id:'nested',app:'ai_agent'},{id:'model',app:'chatgpt'},{id:'memory',app:'agent_memory'}];
  const edges=[{source:'IN',target:'agent'},{source:'agent',target:'nested',sourceHandle:'tools'},{source:'nested',target:'model',sourceHandle:'model'},{source:'nested',target:'memory',sourceHandle:'memory'}];
  const first=projectAgents(steps,edges,{preserve:false});
  const saved:Step[]=steps.map(step=>({...step,position:first.positions[step.id]}));
  saved.push({id:'new-tool',app:'requester'});
  const view=projectAgents(saved,[...edges,{source:'agent',target:'new-tool',sourceHandle:'tools'}]);
  for(const step of steps)assert.deepEqual(view.positions[step.id],first.positions[step.id]);
  assert.ok(view.positions['new-tool'].y>view.positions.nested.y+200);assert.ok(view.positions['new-tool'].y>view.positions.memory.y+200);
});
