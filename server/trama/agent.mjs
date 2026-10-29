import {randomUUID} from 'node:crypto'
import {problem} from './engine/domain.js'

const slots=new Set(['model','memory','tools'])
const configuration=node=>({...((node?.value&&typeof node.value==='object'&&!Array.isArray(node.value))?node.value:{}),...((node?.config&&typeof node.config==='object'&&!Array.isArray(node.config))?node.config:{})})
export const agentSlot=edge=>({ 'bottom-handle-model':'model','bottom-handle-memory':'memory','bottom-handle-tools':'tools',tool:'tools' }[edge.sourceHandle??edge.branch??edge.label]??edge.sourceHandle??edge.branch??edge.label)

export function agentTestSnapshot(flow,step,{message,sessionId,input}={}){
  const selected=new Set([String(step.id)]),edges=flow.edges??[],byId=new Map(flow.steps.map(s=>[String(s.id),structuredClone(s)]))
  const continuations=new Set(edges.filter(e=>String(e.source)===String(step.id)&&!slots.has(agentSlot(e))).map(e=>String(e.target)))
  const collect=id=>{if(selected.has(id)||continuations.has(id))return;selected.add(id);for(const edge of edges.filter(e=>String(e.source)===id))collect(String(edge.target))}
  for(const edge of edges.filter(e=>String(e.source)===String(step.id)&&slots.has(agentSlot(e))))collect(String(edge.target))
  const agent=structuredClone(step)
  if(message!==undefined){
    if(typeof message!=='string'||!message.trim()||message.length>12000)throw problem('Envie uma mensagem de até 12 mil caracteres.')
    if(typeof sessionId!=='string'||!sessionId.trim()||sessionId.length>160)throw problem('ID da conversa inválido.')
    const effective=configuration(agent)
    agent.config={...agent.config,messages:null,user_prompt:message,HUMAN_MESSAGE:message,session_id:sessionId,SESSION_ID:sessionId}
    for(const key of ['memory','AI_MEMORY'])if(effective[key]&&typeof effective[key]==='object')agent.config[key]={...effective[key],session_id:sessionId}
    for(const edge of edges.filter(e=>String(e.source)===String(step.id)&&agentSlot(e)==='memory')){
      const memory=byId.get(String(edge.target));if(memory){const effective=configuration(memory);memory.config={...memory.config,session_id:sessionId};for(const key of ['memory','AI_MEMORY'])if(effective[key]&&typeof effective[key]==='object')memory.config[key]={...effective[key],session_id:sessionId}}
    }
  }
  byId.set(String(step.id),agent)
  let entry='agent-input-'+randomUUID();while(byId.has(entry))entry='agent-input-'+randomUUID()
  const snapshot={steps:[{id:entry,app:'webhook'},...[...selected].map(id=>byId.get(id)).filter(Boolean)],edges:[{source:entry,target:String(step.id)},...edges.filter(e=>selected.has(String(e.source))&&selected.has(String(e.target)))],settings:{...flow.settings,error_handler_flux_id:null}}
  const original=input&&typeof input==='object'&&!Array.isArray(input)?structuredClone(input):{}
  return{snapshot,input:message===undefined?input:{...original,HUMAN_MESSAGE:message,SESSION_ID:sessionId,BODY:{...(original.BODY??original.body??original),HUMAN_MESSAGE:message,SESSION_ID:sessionId}}}
}
