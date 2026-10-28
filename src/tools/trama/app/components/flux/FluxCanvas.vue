<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { VueFlow, Handle, Position, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'
import FluxNode from './FluxNode.vue'
import NodePicker from './NodePicker.vue'
import { graphEdges, layoutGraph, wouldCreateCycle } from './graphModel'
import { toastInfo } from '@trama/composables/useToast'

const props = defineProps({ steps: { type:Array, required:true }, edges: { type:Array, default:undefined }, readonly:Boolean, selectedId:{ type:String, default:null }, statuses:{ type:Object, default:()=>({}) }, controlsTop:{ type:Number, default:80 }, minimap:{ type:Boolean, default:true } })
const emit = defineEmits(['select', 'add', 'move', 'background-click', 'update:edges', 'duplicate', 'delete', 'disconnect', 'add-branch'])
const flowId = `trama-${Math.random().toString(36).slice(2)}`
const { fitView, zoomIn, zoomOut, screenToFlowCoordinate } = useVueFlow({id:flowId})
const nodes = ref([]), localEdges = ref([]), pickerOpen = ref(false), addContext = ref({}), contextMenu = ref(false), menuPosition = ref([0,0]), contextNode = ref(null), contextEdge = ref(null)
const canonicalEdges = computed(() => graphEdges(props.steps, props.edges))
const positions = computed(() => layoutGraph(props.steps, canonicalEdges.value))
const branchHandles = (step) => step.app === 'return' ? [] : step.app === 'router' ? Array.from({length:Math.max(2, Math.min(20, Number(step.config?.branches) || 2))}, (_,i)=>`branch-${i+1}`) : ['for_each','foreach','for','while'].includes(step.app) ? ['body','done'] : ['out']

function refreshGraph() {
  const real = props.steps.map((step,index)=>({id:String(step.id),type:'trama',position:positions.value[step.id],data:{step,index},selected:step.id===props.selectedId,draggable:!props.readonly,selectable:!props.readonly,connectable:!props.readonly}))
  const placeholders = [], edges = canonicalEdges.value.map(edge=>({...edge,sourceHandle:edge.sourceHandle||branchHandles(props.steps.find(step=>String(step.id)===edge.source)??{})[0],type:'default',style:{stroke:'rgb(var(--cm-line-strong))',strokeWidth:2},animated:props.statuses[edge.source]==='running'}))
  if (!props.readonly) for (const step of props.steps) {
    const handles = branchHandles(step)
    handles.forEach((handle,index)=>{
      const outgoing = canonicalEdges.value.filter(edge=>edge.source===String(step.id))
      const occupied = outgoing.some(edge=>(edge.sourceHandle || handles[0])===handle || edge.branch===handle)
      if (occupied) return
      const pos=positions.value[step.id], id=`__add__${step.id}__${handle}`
      placeholders.push({id,type:'add',draggable:false,selectable:false,connectable:false,position:{x:pos.x+290,y:pos.y+(index-(handles.length-1)/2)*230},data:{sourceId:String(step.id),sourceHandle:handle}})
      edges.push({id:`__edge__${id}`,source:String(step.id),sourceHandle:handle,target:id,type:'default',selectable:false,style:{stroke:'rgb(var(--cm-line-strong))',strokeWidth:1.4,opacity:.6}})
    })
  }
  nodes.value=[...real,...placeholders]
  localEdges.value=edges
}
watch(()=>[props.steps,props.edges,props.selectedId,props.statuses],refreshGraph,{deep:true,immediate:true})

function openPicker(context={}) { if(props.readonly)return; addContext.value=context; pickerOpen.value=true; contextMenu.value=false }
function add(selection) { emit('add',{...(typeof selection === 'string' ? {app:selection} : selection),...addContext.value}) }
function connect(connection) {
  if(props.readonly)return
  const {source,target,sourceHandle}=connection
  if(!source||!target||source.startsWith('__add__')||target.startsWith('__add__'))return
  const edges=canonicalEdges.value, sourceStep=props.steps.find(s=>String(s.id)===source)
  if(edges.some(e=>e.target===target)){ toastInfo({text:'Este nó já possui uma entrada. Desconecte-o antes de reconectar.'}); return }
  if(wouldCreateCycle(edges,source,target)){ toastInfo({text:'Use For Each, For ou While para criar um laço. Esta conexão criaria um ciclo.'}); return }
  const handle=sourceHandle||'out'
  if(sourceStep?.app!=='router' && edges.some(e=>e.source===source && (e.sourceHandle||'out')===handle)){ toastInfo({text:'Esta saída já está conectada. Use um roteador para criar ramificações.'}); return }
  emit('update:edges',[...edges,{id:crypto.randomUUID(),source,target,sourceHandle:handle,...(handle!=='out'?{branch:handle}:{})}])
}
function dragged({node}) { if(!props.readonly&&!node.id.startsWith('__add__'))emit('move',node.id,{x:Math.round(node.position.x),y:Math.round(node.position.y)},true) }
function nodeContext({event,node}) { if(props.readonly||node.id.startsWith('__add__'))return; event.preventDefault(); contextNode.value=node.id; contextEdge.value=null;menuPosition.value=[event.clientX,event.clientY];contextMenu.value=true }
function edgeContext({event,edge}) { if(props.readonly||edge.id.startsWith('__edge__'))return;event.preventDefault();contextEdge.value=edge.id;contextNode.value=null;menuPosition.value=[event.clientX,event.clientY];contextMenu.value=true }
function paneContext(event) {if(props.readonly)return;event.preventDefault();contextNode.value=null;contextEdge.value=null;addContext.value={position:screenToFlowCoordinate({x:event.clientX,y:event.clientY})};menuPosition.value=[event.clientX,event.clientY];contextMenu.value=true}
function detachEdge() {emit('update:edges',canonicalEdges.value.filter(edge=>edge.id!==contextEdge.value));contextMenu.value=false}
function action(name) {emit(name,contextNode.value);contextMenu.value=false}
async function copyId(id) {try{await navigator.clipboard.writeText(`$${id}`);toastInfo({text:'ID do componente copiado!'})}catch{toastInfo({text:`ID: $${id}`})}}
function center() {return fitView({padding:.2,maxZoom:1,duration:200})}
defineExpose({fitView:center,zoomIn,zoomOut})
</script>

<template>
  <div class="flux-canvas" :class="{'canvas-readonly':readonly}">
    <VueFlow :id="flowId" v-model:nodes="nodes" v-model:edges="localEdges" :nodes-draggable="!readonly" :nodes-connectable="!readonly" :elements-selectable="!readonly" :min-zoom=".15" :max-zoom="2" :default-viewport="{x:100,y:180,zoom:.8}" :delete-key-code="null" :zoom-on-double-click="false" :connection-radius="30" fit-view-on-init @connect="connect" @node-drag-stop="dragged" @node-click="({node})=>!node.id.startsWith('__add__')&&emit('select',node.id)" @pane-click="emit('background-click')" @node-context-menu="nodeContext" @edge-context-menu="edgeContext" @pane-context-menu="paneContext" @nodes-initialized="nextTick(center)">
      <Background pattern-color="rgb(var(--cm-line-strong))" :gap="18" :size="1" />
      <MiniMap v-if="minimap" position="top-left" :width="158" :height="90" :pannable="true" :zoomable="true" mask-color="rgba(0,0,0,.2)" node-color="#bfc8c3" node-stroke-color="#bbc8c0" />
      <template #node-trama="{data,selected}"><FluxNode :step="data.step" :index="data.index" :selected="selected||data.step.id===selectedId" :status="statuses[data.step.id]" :readonly="readonly" @copy-id="copyId" /></template>
      <template #node-add="{data}"><div class="canvas-add-node"><Handle type="target" :position="Position.Left" class="placeholder-handle" :connectable="false" /><button class="add-hexagon nodrag nopan" aria-label="Adicionar ação" @click.stop="openPicker(data)"><svg viewBox="0 0 130 148"><path d="M65 1 129 38v72l-64 37L1 110V38Z" /></svg><v-icon icon="mdi-plus" size="30" /></button><strong>Nova ação</strong><small>{{ data.sourceHandle==='body'?'Corpo do laço':data.sourceHandle==='done'?'Após o laço':'Adiciona uma nova ação' }}</small></div></template>
    </VueFlow>
    <div v-if="!steps.length&&!readonly" class="empty-canvas"><v-icon icon="mdi-vector-polyline-plus" size="46" /><h3>Comece sua integração</h3><v-btn color="primary" @click="openPicker({})">Adicionar ação</v-btn></div>
    <div class="canvas-controls" :style="{top:`${controlsTop}px`}"><button aria-label="Aumentar zoom" @click="zoomIn()"><v-icon icon="mdi-plus" size="21" /></button><button aria-label="Diminuir zoom" @click="zoomOut()"><v-icon icon="mdi-minus" size="21" /></button><button aria-label="Centralizar integração" @click="center"><v-icon icon="mdi-fullscreen" size="21" /></button></div>
    <NodePicker v-model="pickerOpen" @select="add" />
    <v-menu v-model="contextMenu" :target="menuPosition" location="bottom start"><v-list density="compact" class="canvas-menu"><template v-if="contextNode"><v-list-item title="Configurar" prepend-icon="mdi-pencil-outline" @click="action('select')" /><v-list-item title="Duplicar" prepend-icon="mdi-content-copy" @click="action('duplicate')" /><v-list-item v-if="steps.find(s=>s.id===contextNode)?.app==='router'" title="Adicionar ramificação" prepend-icon="mdi-call-split" @click="action('add-branch')" /><v-list-item title="Desconectar" prepend-icon="mdi-link-off" @click="action('disconnect')" /><v-list-item title="Excluir" prepend-icon="mdi-delete-outline" base-color="error" @click="action('delete')" /></template><v-list-item v-else-if="contextEdge" title="Remover conexão" prepend-icon="mdi-link-off" @click="detachEdge" /><v-list-item v-else title="Adicionar ação aqui" prepend-icon="mdi-plus" @click="openPicker(addContext)" /></v-list></v-menu>
  </div>
</template>

<style scoped>
.flux-canvas{position:relative;width:100%;height:100%;overflow:hidden;background:rgb(var(--v-theme-fluxBackground));font-family:'Inter',sans-serif}.flux-canvas :deep(.vue-flow__node){border:none;background:none;box-shadow:none;padding:0;width:170px;border-radius:0}.flux-canvas :deep(.vue-flow__edge-path){stroke-linecap:round}.flux-canvas :deep(.vue-flow__edge.selected .vue-flow__edge-path){stroke:rgb(var(--v-theme-primary))!important;stroke-width:3!important}.flux-canvas :deep(.vue-flow__minimap){top:78px;left:12px;border:5px solid #101411a0;background:#1c241f55;box-shadow:none;margin:0;opacity:.75}.flux-canvas :deep(.vue-flow__background){opacity:.7}.canvas-controls{position:absolute;right:25px;display:flex;flex-direction:column;gap:5px;z-index:3}.canvas-controls button{width:31px;height:31px;display:grid;place-items:center;background:rgb(var(--v-theme-faded));color:rgb(var(--v-theme-primary));border-radius:3px}.canvas-controls button:hover{filter:brightness(1.4)}.canvas-add-node{width:170px;display:flex;flex-direction:column;align-items:center;color:rgb(var(--v-theme-on-surface));position:relative}.add-hexagon{position:relative;width:130px;height:148px;display:grid;place-items:center;cursor:pointer;color:inherit}.add-hexagon svg{position:absolute;inset:0;width:100%;height:100%;fill:#0e302240;stroke:#b6d4c3;stroke-width:1}.add-hexagon:hover svg{fill:#6fa74f35;stroke:rgb(var(--v-theme-primary))}.canvas-add-node strong{font-size:16px;margin-top:8px}.canvas-add-node small{font-size:11px;margin-top:3px}.placeholder-handle{left:19px;top:74px;background:transparent;border:none;opacity:0}.canvas-menu{min-width:205px;border:1px solid #63736b60}.empty-canvas{position:absolute;inset:30% 20%;display:flex;align-items:center;justify-content:center;gap:20px;flex-direction:column;pointer-events:none}.empty-canvas button{pointer-events:auto}.canvas-readonly :deep(.vue-flow__minimap),.canvas-readonly .canvas-controls{display:none}.canvas-readonly :deep(.vue-flow__node){cursor:default}
</style>
