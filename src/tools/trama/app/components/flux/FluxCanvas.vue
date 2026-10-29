<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { VueFlow, Handle, Position, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'
import FluxNode from './FluxNode.vue'
import LoopScopeEdge from './LoopScopeEdge.vue'
import NodePicker from './NodePicker.vue'
import AgentSlotPicker from './AgentSlotPicker.vue'
import { graphEdges, wouldCreateCycle } from './graphModel'
import { canonicalConnection, canonicalHandle, isForEach, isLoop } from './loopProjection'
import { projectAgentGraph, agentSlot } from './agentProjection'
import { toastInfo } from '@trama/composables/useToast'

const props = defineProps({ steps: { type:Array, required:true }, edges: { type:Array, default:undefined }, readonly:Boolean, selectedId:{ type:String, default:null }, statuses:{ type:Object, default:()=>({}) }, controlsTop:{ type:Number, default:80 }, minimap:{ type:Boolean, default:true } })
const emit = defineEmits(['select', 'add', 'move', 'background-click', 'update:edges', 'duplicate', 'delete', 'disconnect', 'add-branch'])
const flowId = `trama-${Math.random().toString(36).slice(2)}`
const { fitView, zoomIn, zoomOut, screenToFlowCoordinate } = useVueFlow({id:flowId})
const nodes = ref([]), localEdges = ref([]), pickerOpen = ref(false), resourcePickerOpen = ref(false), resourceSlot = ref('model'), addContext = ref({}), contextMenu = ref(false), menuPosition = ref([0,0]), contextNode = ref(null), contextEdge = ref(null)
const canonicalEdges = computed(() => graphEdges(props.steps, props.edges))
const projection = computed(() => projectAgentGraph(props.steps, canonicalEdges.value))
const positions = computed(() => projection.value.positions)
const branchHandles = (step) => step.app === 'return' ? [] : step.app === 'router' ? Array.from({length:Math.max(2, Math.min(20, Number(step.config?.branches) || 2))}, (_,i)=>`branch-${i+1}`) : ['for_each','foreach','for','while'].includes(step.app) ? ['body','done'] : ['out']

function refreshGraph() {
  const graph=projection.value
  const real = props.steps.map((step,index)=>({id:String(step.id),type:'trama',position:positions.value[step.id],data:{step,index,attachmentRole:graph.attachmentById.get(String(step.id))?.role,agentSlots:graph.agentSlots.get(String(step.id))},selected:step.id===props.selectedId,draggable:!props.readonly,selectable:!props.readonly,connectable:!props.readonly}))
  const virtual=graph.virtualNodes.map(node=>({...node,connectable:!props.readonly,selectable:!props.readonly}))
  const placeholders = props.readonly?[]:[...graph.placeholders]
  const edges = graph.visualEdges.map(edge=>({...edge,type:'default',style:{stroke:edge.data?.agentSlot?'rgb(var(--cm-focus))':edge.data?.loopId?'rgb(var(--cm-accent-ink))':'rgb(var(--cm-fg-dim))',strokeWidth:1.6,...(edge.data?.agentSlot?{strokeDasharray:'3 5',opacity:.75}:{})},animated:props.statuses[canonicalEdges.value.find(item=>item.id===edge.id)?.source]==='running'}))
  for(const edge of graph.decorative){
    const related=graph.placeholders.find(item=>item.id===edge.source||item.id===edge.target)
    if(props.readonly&&related){
      if(edge.source!==related.id)continue
      const source=graph.loops.find(loop=>loop.id===related.data.sourceId)
      edges.push({...edge,source:source&&related.data.sourceHandle==='done'?source.exitId:related.data.sourceId,sourceHandle:related.data.sourceHandle,type:'default',style:{stroke:'rgb(var(--cm-accent-ink))',strokeWidth:1.4,opacity:.65}})
      continue
    }
    edges.push({...edge,type:edge.type||'default',style:edge.type==='loop-scope'?undefined:{stroke:'rgb(var(--cm-accent-ink))',strokeWidth:1.4,opacity:.65}})
  }
  if (!props.readonly) for (const step of props.steps) {
    if(['model','memory'].includes(graph.attachmentById.get(String(step.id))?.role))continue
    const handles = branchHandles(step)
    handles.forEach((handle,index)=>{
      if(isForEach(step)&&handle==='body')return
      if(placeholders.some(node=>node.data.sourceId===String(step.id)&&node.data.sourceHandle===handle))return
      const outgoing = canonicalEdges.value.filter(edge=>edge.source===String(step.id))
      const occupied = outgoing.some(edge=>canonicalHandle(step,edge)===handle)
      if (occupied) return
      const loop=graph.loopById.get(String(step.id)), pos=loop?.exit??positions.value[step.id], id=`__add__${step.id}__${handle}`
      const y=pos.y+(loop?0:(index-(handles.length-1)/2)*230)
      placeholders.push({id,type:'add',draggable:false,selectable:false,connectable:false,position:{x:pos.x+324,y:y+32},data:{sourceId:String(step.id),sourceHandle:handle,position:{x:pos.x+324,y},label:loop?'Após o For Each':undefined}})
      edges.push({id:`__edge__${id}`,source:loop?.exitId??String(step.id),sourceHandle:handle,target:id,type:'default',selectable:false,style:{stroke:'rgb(var(--cm-line-strong))',strokeWidth:1.4,opacity:.6}})
    })
  }
  nodes.value=[...real,...virtual,...placeholders]
  localEdges.value=edges
}
watch(()=>[props.steps,props.edges,props.selectedId,props.statuses],refreshGraph,{deep:true,immediate:true})

function openPicker(context={}) { if(props.readonly)return; addContext.value=context; if(context.agentRole){resourceSlot.value=context.agentRole;resourcePickerOpen.value=true}else pickerOpen.value=true; contextMenu.value=false }
function openResource(sourceId,slot) {openPicker({sourceId:String(sourceId),sourceHandle:slot,agentRole:slot})}
function add(selection) { emit('add',{...(typeof selection === 'string' ? {app:selection} : selection),...addContext.value}) }
function connect(connection) {
  if(props.readonly)return
  const translated=canonicalConnection(connection,projection.value)
  if(!translated){toastInfo({text:'A conclusão do corpo é ligada à saída do For Each automaticamente.'});return}
  const {source,target,sourceHandle}=translated
  if(!source||!target||!props.steps.some(step=>String(step.id)===source)||!props.steps.some(step=>String(step.id)===target))return
  const edges=canonicalEdges.value, sourceStep=props.steps.find(s=>String(s.id)===source)
  const slot=sourceStep?.app==='ai_agent'?agentSlot(translated):null
  const targetStep=props.steps.find(s=>String(s.id)===target)
  if(slot==='model'&&!['chatgpt','openai','anthropic','claude'].includes(targetStep?.app)){toastInfo({text:'Escolha um provedor de IA para a conexão de modelo.'});return}
  if(slot==='memory'&&targetStep?.app!=='agent_memory'){toastInfo({text:'Escolha uma memória de conversa para esta conexão.'});return}
  if(edges.some(e=>e.target===target)){ toastInfo({text:'Este nó já possui uma entrada. Desconecte-o antes de reconectar.'}); return }
  if(wouldCreateCycle(edges,source,target)){ toastInfo({text:'Use For Each, For ou While para criar um laço. Esta conexão criaria um ciclo.'}); return }
  const handle=slot||sourceHandle||(isLoop(sourceStep)?'done':'out')
  if(sourceStep?.app!=='router' && slot!=='tools' && edges.some(e=>e.source===source && (agentSlot(e)??canonicalHandle(sourceStep,e))===handle)){ toastInfo({text:slot?'Este recurso já está conectado. Configure ou desconecte o nó existente.':'Esta saída já está conectada. Use um roteador para criar ramificações.'}); return }
  emit('update:edges',[...edges,{id:crypto.randomUUID(),source,target,sourceHandle:handle,...(handle!=='out'?{branch:handle}:{})}])
}
const canonicalNodeId=node=>node.type==='loop-exit'?node.data.loopId:node.id
function dragged({node}) { if(!props.readonly&&node.type==='trama')emit('move',node.id,{x:Math.round(node.position.x),y:Math.round(node.position.y)},true) }
function nodeContext({event,node}) { if(props.readonly||node.type==='add')return; event.preventDefault(); contextNode.value=canonicalNodeId(node); contextEdge.value=null;menuPosition.value=[event.clientX,event.clientY];contextMenu.value=true }
function edgeContext({event,edge}) { if(props.readonly||!canonicalEdges.value.some(item=>item.id===(edge.data?.canonicalId??edge.id)))return;event.preventDefault();contextEdge.value=edge.data?.canonicalId??edge.id;contextNode.value=null;menuPosition.value=[event.clientX,event.clientY];contextMenu.value=true }
function paneContext(event) {if(props.readonly)return;event.preventDefault();contextNode.value=null;contextEdge.value=null;addContext.value={position:screenToFlowCoordinate({x:event.clientX,y:event.clientY})};menuPosition.value=[event.clientX,event.clientY];contextMenu.value=true}
function detachEdge() {emit('update:edges',canonicalEdges.value.filter(edge=>edge.id!==contextEdge.value));contextMenu.value=false}
function action(name) {emit(name,contextNode.value);contextMenu.value=false}
async function copyId(id) {try{await navigator.clipboard.writeText(`$${id}`);toastInfo({text:'ID do componente copiado!'})}catch{toastInfo({text:`ID: $${id}`})}}
function center() {return fitView({padding:.28,maxZoom:1,duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:200})}
function selectNode({node}){if(node.type!=='add')emit('select',canonicalNodeId(node))}
defineExpose({fitView:center,zoomIn,zoomOut,openPicker})
</script>

<template>
  <div class="flux-canvas" :class="{'canvas-readonly':readonly}">
    <VueFlow :id="flowId" v-model:nodes="nodes" v-model:edges="localEdges" :nodes-draggable="!readonly" :nodes-connectable="!readonly" :elements-selectable="!readonly" :min-zoom=".15" :max-zoom="2" :default-viewport="{x:100,y:180,zoom:.8}" :delete-key-code="null" :zoom-on-double-click="false" :connection-radius="30" fit-view-on-init @connect="connect" @node-drag-stop="dragged" @node-click="selectNode" @pane-click="emit('background-click')" @node-context-menu="nodeContext" @edge-context-menu="edgeContext" @pane-context-menu="paneContext" @nodes-initialized="nextTick(center)">
      <Background pattern-color="rgb(var(--cm-line-strong))" :gap="24" :size="1" />
      <MiniMap v-if="minimap" position="bottom-right" :width="164" :height="92" :pannable="true" :zoomable="true" mask-color="rgb(var(--cm-stage)/.65)" node-color="rgb(var(--cm-accent-ink))" node-stroke-color="rgb(var(--cm-accent-ink))" aria-label="Minimapa do fluxo" />
      <template #node-trama="{data,selected}"><FluxNode :step="data.step" :index="data.index" :selected="selected||data.step.id===selectedId" :status="statuses[data.step.id]" :readonly="readonly" :loop-role="isForEach(data.step)?'entry':null" :attachment-role="data.attachmentRole" :agent-slots="data.agentSlots" @copy-id="copyId" @select="emit('select',String(data.step.id))" @add-resource="openResource(data.step.id,$event)" @select-resource="emit('select',$event)" /></template>
      <template #node-loop-exit="{data}"><FluxNode :step="data.step" :selected="data.loopId===selectedId" :status="statuses[data.loopId]" :readonly="readonly" loop-role="exit" @copy-id="copyId" @select="emit('select',data.loopId)" /></template>
      <template #edge-loop-scope="scope"><LoopScopeEdge v-bind="scope"/></template>
      <template #node-add="{data}"><div class="canvas-add-node" :data-loop-id="data.loopId" :data-source-handle="data.sourceHandle"><Handle type="target" :position="Position.Left" class="placeholder-handle" :connectable="false" /><Handle id="close" type="source" :position="Position.Right" class="placeholder-handle" :connectable="false" /><button type="button" class="canvas-add-action nodrag nopan" :aria-label="data.label?'Adicionar ação: '+data.label:'Adicionar ação'" @click.stop="openPicker(data)"><span class="canvas-add-icon"><v-icon icon="mdi-plus" size="23" /></span><span><strong>Nova ação</strong><small>{{ data.label || (data.sourceHandle==='body'?'Corpo do laço':data.sourceHandle==='done'?'Após o laço':'Continue este caminho') }}</small></span></button></div></template>
    </VueFlow>
    <div v-if="!steps.length&&!readonly" class="empty-canvas"><v-icon icon="mdi-vector-polyline-plus" size="46" /><h3>Comece sua integração</h3><v-btn color="primary" @click="openPicker({})">Adicionar ação</v-btn></div>
    <div class="canvas-controls" :style="{top:`${controlsTop}px`}" aria-label="Visualização do fluxo"><button type="button" aria-label="Aumentar zoom" @click="zoomIn()"><v-icon icon="mdi-plus" size="19" /></button><button type="button" aria-label="Diminuir zoom" @click="zoomOut()"><v-icon icon="mdi-minus" size="19" /></button><span aria-hidden="true" /><button type="button" aria-label="Centralizar integração" @click="center"><v-icon icon="mdi-fit-to-screen-outline" size="19" /></button></div>
    <NodePicker v-model="pickerOpen" @select="add" />
    <AgentSlotPicker v-model="resourcePickerOpen" :slot="resourceSlot" @select="add" />
    <v-menu v-model="contextMenu" :target="menuPosition" location="bottom start"><v-list density="compact" class="canvas-menu"><template v-if="contextNode"><v-list-item title="Configurar" prepend-icon="mdi-pencil-outline" @click="action('select')" /><v-list-item title="Duplicar" prepend-icon="mdi-content-copy" @click="action('duplicate')" /><v-list-item v-if="steps.find(s=>s.id===contextNode)?.app==='router'" title="Adicionar ramificação" prepend-icon="mdi-call-split" @click="action('add-branch')" /><v-list-item title="Desconectar" prepend-icon="mdi-link-off" @click="action('disconnect')" /><v-list-item title="Excluir" prepend-icon="mdi-delete-outline" base-color="error" @click="action('delete')" /></template><v-list-item v-else-if="contextEdge" title="Remover conexão" prepend-icon="mdi-link-off" @click="detachEdge" /><v-list-item v-else title="Adicionar ação aqui" prepend-icon="mdi-plus" @click="openPicker(addContext)" /></v-list></v-menu>
  </div>
</template>

<style scoped>
.flux-canvas{position:relative;width:100%;height:100%;overflow:hidden;background:rgb(var(--cm-stage));font-family:var(--trama-font-ui,'Inter',sans-serif)}
.flux-canvas::before,.flux-canvas::after{content:"";position:absolute;width:14px;height:14px;border-color:rgb(var(--cm-fg-dim)/.4);pointer-events:none;z-index:1}.flux-canvas::before{left:24px;bottom:92px;border-left:1px solid;border-bottom:1px solid}.flux-canvas::after{right:24px;top:122px;border-right:1px solid;border-top:1px solid}
.flux-canvas :deep(.vue-flow__node){border:none;background:none;box-shadow:none;padding:0;width:224px;border-radius:12px}.flux-canvas :deep(.vue-flow__node-add){width:174px}.flux-canvas :deep(.vue-flow__node:focus-visible){outline:2px solid rgb(var(--cm-focus));outline-offset:5px}.flux-canvas :deep(.vue-flow__edge-path){stroke-linecap:round}.flux-canvas :deep(.vue-flow__edge.selected .vue-flow__edge-path){stroke:rgb(var(--cm-accent-ink))!important;stroke-width:2.5!important}.flux-canvas :deep(.vue-flow__connection-path){stroke:rgb(var(--cm-accent-ink));stroke-width:2}.flux-canvas :deep(.vue-flow__minimap){bottom:18px;right:18px;border:1px solid rgb(var(--cm-line-strong));border-radius:10px;background:rgb(var(--cm-surface-1));box-shadow:0 5px 20px rgb(0 0 0/.08);margin:0;overflow:hidden}.flux-canvas :deep(.vue-flow__background){opacity:.54}
.canvas-controls{position:absolute;right:20px;display:flex;flex-direction:column;gap:3px;padding:5px;z-index:3;background:rgb(var(--cm-surface-1));border:1px solid rgb(var(--cm-line-strong));border-radius:11px;box-shadow:0 5px 20px rgb(0 0 0/.08)}.canvas-controls button{width:36px;height:36px;display:grid;place-items:center;background:transparent;color:rgb(var(--cm-fg-2));border:0;border-radius:7px;transition:background-color 160ms,color 160ms,transform 80ms}.canvas-controls button:hover{background:rgb(var(--cm-surface-3));color:rgb(var(--cm-accent-ink))}.canvas-controls button:active{transform:scale(.96)}.canvas-controls>span{height:1px;background:rgb(var(--cm-line));margin:2px 5px}
.canvas-add-node{width:174px;position:relative}.canvas-add-action{display:flex;gap:11px;align-items:center;text-align:left;min-height:68px;padding:10px 12px;border:1px dashed rgb(var(--cm-fg-dim)/.65);border-radius:12px;background:rgb(var(--cm-surface-1));color:rgb(var(--cm-fg));cursor:pointer;transition:border-color 160ms,background-color 160ms,transform 80ms}.canvas-add-icon{width:32px;height:32px;display:grid;place-items:center;flex-shrink:0;border-radius:8px;background:rgb(var(--cm-surface-2));color:rgb(var(--cm-accent-ink))}.canvas-add-action>span:last-child{display:flex;flex-direction:column;gap:4px}.canvas-add-action strong{font:750 12px/1.3 var(--trama-font-ui,'Inter',sans-serif)}.canvas-add-action small{font-size:12px;line-height:1.4;color:rgb(var(--cm-fg-muted))}.canvas-add-action:hover{border-color:rgb(var(--cm-accent-ink));background:rgb(var(--cm-accent-soft))}.canvas-add-action:active{transform:scale(.98)}.placeholder-handle{left:0;top:34px;background:transparent;border:none;opacity:0}
.canvas-menu{min-width:220px;border:1px solid rgb(var(--cm-line-strong));border-radius:12px!important;background:rgb(var(--cm-surface-2));color:rgb(var(--cm-fg));padding:6px}.canvas-menu :deep(.v-list-item){border-radius:7px;min-height:40px;font-size:13px}.empty-canvas{position:absolute;inset:30% 20%;display:flex;align-items:center;justify-content:center;gap:20px;flex-direction:column;pointer-events:none;color:rgb(var(--cm-fg-muted))}.empty-canvas h3{color:rgb(var(--cm-fg))}.empty-canvas button{pointer-events:auto}.canvas-readonly :deep(.vue-flow__minimap),.canvas-readonly .canvas-controls{display:none}.canvas-readonly :deep(.vue-flow__node),.canvas-readonly :deep(.node-body){cursor:default}
@media(max-width:760px){.canvas-controls{top:194px!important;right:12px;padding:3px;border-radius:10px}.canvas-controls button{width:40px;height:40px}.flux-canvas :deep(.vue-flow__minimap){width:120px;height:68px;bottom:88px;right:12px}.flux-canvas::before{left:16px;bottom:94px}.flux-canvas::after{display:none}}
@media(prefers-reduced-motion:reduce){.canvas-controls button,.canvas-add-action{transition:none;transform:none}.flux-canvas :deep(.vue-flow__edge.animated path){animation:none}}
.placeholder-handle.source{left:auto;right:0}
</style>
