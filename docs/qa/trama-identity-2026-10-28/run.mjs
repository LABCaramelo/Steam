import {chromium} from 'playwright'
import {createServer} from 'node:http'
import {once} from 'node:events'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createTramaHandler} from '../../../server/trama/gateway.mjs'
import {createWebhookHandler} from '../../../server/trama/webhook.mjs'
import {hashWebhookToken} from '../../../server/trama/hooks.mjs'
import {MemoryStore} from '../../../server/trama/memory-store.mjs'

const out=import.meta.dirname
fs.mkdirSync(out,{recursive:true})
const user={id:'00000000-0000-4000-8000-00000000000a',email:'visual@trama.test',aud:'authenticated',role:'authenticated',user_metadata:{name:'Conferência visual'},created_at:'2026-10-28T00:00:00Z'}
const expiry=Math.floor(Date.now()/1000)+3600
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:expiry})).toString('base64url')+'.visual-fixture'
process.env.TRAMA_ENCRYPTION_KEY='ab'.repeat(32);process.env.SUPABASE_SERVICE_ROLE_KEY='visual-fixture-only'
let state={documents:[],events:{}},revision=0,locked=false
const persistence={
  async loadWorkspace(){return{state:structuredClone(state),revision}},
  async acquireWorkspace(){assert.equal(locked,false);locked=true;return{state:structuredClone(state),revision,leaseToken:'visual-lease'}},
  async commitWorkspace(_access,data){assert.equal(data.revision,revision);state=structuredClone(data.state);return ++revision},
  async releaseWorkspace(){locked=false},
}
const handler=createTramaHandler({authorize:async()=>({user,token,supabaseUrl:'https://fixture.invalid',supabaseKey:'fixture'}),persistence,syncWebhook:async()=>true})
const hook=createWebhookHandler({configured:()=>true,persistence:{
  async acquire(id,hash,capture){const flow=new MemoryStore(state).get('flows',id);assert.equal(hash,hashWebhookToken(flow.webhook_token));if(!capture&&!flow.active)throw Object.assign(Error('Inactive'),{status:409});assert.equal(locked,false);locked=true;return{state:structuredClone(state),revision,leaseToken:'visual-lease',userId:user.id}},
  async commit(_id,_hash,lease,snapshot){assert.equal(lease.revision,revision);state=structuredClone(snapshot);lease.revision=++revision},
  async release(){locked=false},
}})
const fixture=createServer((req,res)=>{void (req.url.startsWith('/api/trama-hook')?hook(req,res):handler(req,res))})
fixture.listen(0,'127.0.0.1');await once(fixture,'listening')
const fixtureOrigin='http://127.0.0.1:'+fixture.address().port
let browser,page
const errors=[],checks=[]
const base='http://127.0.0.1:5180/tools/automation/index.html'
async function shot(name){for(let i=0;i<8&&await page.getByRole('button',{name:'Fechar notificação',exact:true}).count();i++)await page.getByRole('button',{name:'Fechar notificação',exact:true}).first().click({timeout:1000}).catch(()=>{});await page.screenshot({path:out+'/'+name+'.png',fullPage:true,mask:[page.locator('.node-webhook-url input')]})}
async function closeDrawer(){await page.getByRole('button',{name:'Fechar configuração do módulo',exact:true}).click();await page.locator('.node-dialog').waitFor({state:'hidden'})}
async function persisted(predicate){for(let i=0;i<200;i++){if(predicate(new MemoryStore(state)))return;await new Promise(resolve=>setTimeout(resolve,50))}throw Error('UI changes were not persisted')}
try{
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
  const context=await browser.newContext({viewport:{width:1440,height:960},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce'})
  await context.addInitScript(({token,user,expiry})=>{localStorage.setItem('caramelo-theme','dark');localStorage.setItem('sb-fzhzpzxsttflgtassyex-auth-token',JSON.stringify({access_token:token,refresh_token:'visual-fixture',expires_at:expiry,expires_in:3600,token_type:'bearer',user}))},{token,user,expiry})
  await context.route('https://fzhzpzxsttflgtassyex.supabase.co/**',async route=>{const url=new URL(route.request().url());const value=url.pathname==='/auth/v1/user'?user:url.pathname.endsWith('/has_tool')?true:url.pathname.includes('/profiles')?{name:'Conferência visual',nickname:null}:url.pathname.includes('record_tool_activity')?null:false;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)})})
  await context.route('**/api/trama?**',async route=>{const req=route.request(),url=new URL(req.url());const res=await fetch(fixtureOrigin+url.pathname+url.search,{method:req.method(),headers:req.headers(),...(req.postData()?{body:req.postData()}: {})});const headers=Object.fromEntries(res.headers);delete headers['content-length'];delete headers['transfer-encoding'];delete headers.connection;await route.fulfill({status:res.status,headers,body:Buffer.from(await res.arrayBuffer())})})
  page=await context.newPage();page.setDefaultTimeout(20000)
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(base);await page.getByRole('button',{name:'Novo fluxo',exact:true}).waitFor();await shot('home-dark')
  await page.getByRole('button',{name:'Novo fluxo',exact:true}).click();await page.getByLabel('Nome do fluxo',{exact:true}).fill('Fluxo de conferência');await shot('new-flow-dark');await page.getByRole('button',{name:'Começar!',exact:true}).click()
  await page.locator('[data-node-app="webhook"] .node-body').waitFor();await shot('workspace-dark');checks.push('home-create-workspace')
  await page.locator('[data-node-app="webhook"] .node-body').click();const production=page.getByLabel('Link de ativação do Webhook',{exact:true}),capture=page.getByLabel('Link de teste do Webhook',{exact:true});await capture.waitFor();await page.waitForFunction(()=>document.querySelector('input[aria-label="Link de teste do Webhook"]')?.value.includes('/api/trama-hook?'))
  const original=await capture.inputValue();assert.notEqual(await production.inputValue(),original)
  await page.getByRole('button',{name:'Testar Webhook',exact:true}).first().click();await page.getByRole('button',{name:'Cancelar escuta',exact:true}).first().waitFor()
  const received=await fetch(original,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Entrada capturada',contact:{name:'Pessoa de exemplo'}})});assert.equal(received.status,200)
  await page.getByText('Resposta fixada',{exact:true}).waitFor();assert.equal(new MemoryStore(state).list('executions').length,0);await shot('webhook-captured-dark');checks.push('webhook-separate-links-listen-capture-without-execution')
  await page.getByRole('button',{name:'Editar',exact:true}).click();await page.locator('.node-test-data .CodeMirror').waitFor();await page.getByLabel('Fechar dados de teste',{exact:true}).click();await page.locator('.node-test-data').waitFor({state:'hidden'})
  await page.getByRole('button',{name:'Limpar',exact:true}).click();await page.getByText('Resposta fixada',{exact:true}).waitFor({state:'hidden'})
  await page.getByRole('button',{name:'Utilizar dados de teste',exact:true}).click();await page.locator('.node-test-data .CodeMirror').click();await page.keyboard.press('Control+A');await page.keyboard.type('{"message":"Entrada editada"}');await page.getByRole('button',{name:'Utilizar dados',exact:true}).click();await page.locator('.node-test-data').waitFor({state:'hidden'});await page.getByText('Resposta fixada',{exact:true}).waitFor();checks.push('webhook-edit-clear-and-pin-sample')
  await page.getByRole('button',{name:'Gerar novo link',exact:true}).click();await page.waitForFunction(previous=>document.querySelector('input[aria-label="Link de teste do Webhook"]')?.value!==previous,original);checks.push('webhook-rotate')
  await page.getByRole('button',{name:'Salvar módulo',exact:true}).click();await page.locator('.node-dialog').waitFor({state:'hidden'})
  await page.locator('[data-node-app="return"] .node-body').click();await page.getByLabel('Formato de resposta',{exact:true}).waitFor();await page.getByLabel('Formato de resposta',{exact:true}).selectOption('application/xml');await page.getByLabel('Código de resposta',{exact:true}).selectOption('202')
  await page.locator('.return-body .CodeMirror').click();await page.keyboard.press('Control+A');await page.keyboard.type('<result>recebido</result>')
  await page.getByRole('tab',{name:'Headers',exact:true}).click();await page.getByRole('button',{name:'Adicionar header',exact:true}).click();await page.getByLabel('Nome do header 2',{exact:true}).fill('X-Resultado');await page.getByLabel('Valor do header 2',{exact:true}).fill('Trama');await shot('return-headers-dark')
  await page.getByRole('tab',{name:'Body',exact:true}).click();await page.getByRole('button',{name:'Expandir editor',exact:true}).click();await shot('return-expanded-dark');await page.getByRole('button',{name:'Fechar editor expandido',exact:true}).click()
  await page.getByRole('button',{name:'Salvar módulo',exact:true}).click();await page.locator('.node-dialog').waitFor({state:'hidden'});checks.push('return-format-status-headers-expanded-editor-save')
  await persisted(store=>store.list('flows').find(f=>f.name==='Fluxo de conferência')?.steps.find(s=>s.app==='return')?.config.status===202)
  const flow=new MemoryStore(state).list('flows').find(f=>f.name==='Fluxo de conferência');assert.ok(flow)
  const response=flow.steps.find(s=>s.app==='return');assert.equal(response.config.status,202);assert.equal(response.config.content_type,'application/xml');assert.equal(response.config.headers['X-Resultado'],'Trama');assert.equal(response.config.body,'<result>recebido</result>')
  await page.getByRole('button',{name:'Publicar integração',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.publishing'))
  await page.getByRole('button',{name:'Rodar integração',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.execution-terminal')?.innerText.includes('success'));await shot('execution-dark');checks.push('engine-runs-return-with-selected-format')
  await page.getByRole('button',{name:'Fechar terminal',exact:true}).click();await page.locator('.execution-terminal').waitFor({state:'hidden'})
  const add=page.getByRole('button',{name:/Adicionar.*ação|Nova ação/}).first();await add.click();await page.getByRole('heading',{name:'Nova ação',exact:true}).waitFor();const count=new MemoryStore(state).list('flows').find(f=>f.id===flow.id).steps.length
  await page.locator('.picker-item[data-app="filter"]').click();assert.equal(new MemoryStore(state).list('flows').find(f=>f.id===flow.id).steps.length,count);await shot('node-picker-dark');await page.locator('.picker-save').click();await page.locator('[data-node-app="filter"]').waitFor();await closeDrawer();checks.push('node-picker-selection-then-confirmation')
  await page.evaluate(()=>document.documentElement.dataset.carameloTheme='light');await shot('workspace-light');await page.locator('[data-node-app="return"] .node-body').click();await shot('return-light');await closeDrawer()
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Centralizar integração',exact:true}).click();await shot('workspace-mobile-light');await page.locator('[data-node-app="webhook"] .node-body').focus();await page.keyboard.press('Enter');await page.getByLabel('Link de teste do Webhook',{exact:true}).waitFor();await shot('webhook-mobile-light');await closeDrawer()
  await page.getByRole('button',{name:'Adicionar ação',exact:true}).first().click();await page.locator('.node-picker').waitFor();await shot('node-picker-mobile-light');await page.getByRole('button',{name:'Fechar seleção de ação',exact:true}).click();await page.locator('.node-picker').waitFor({state:'hidden'})
  await page.locator('[data-node-app="return"] .node-body').focus();await page.keyboard.press('Enter');await page.getByLabel('Formato de resposta',{exact:true}).waitFor();await shot('return-mobile-light');await closeDrawer();await page.goto(base+'#/');await page.getByRole('button',{name:'Novo fluxo',exact:true}).waitFor();await shot('home-mobile-light');checks.push('light-theme-mobile-and-keyboard')
  assert.equal(errors.length,0,'Unexpected browser errors: '+errors.join('; '))
  fs.writeFileSync(out+'/results.json',JSON.stringify({date:'2026-10-28',environment:'Local browser, real Vue UI/gateway/engine, isolated auth/database fixtures',checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,checks,errors}))
}catch(error){if(page)await shot('failure').catch(()=>{});console.log(JSON.stringify({passed:checks.length,checks,errors}));throw error}
finally{await browser?.close();fixture.close()}
