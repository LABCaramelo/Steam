// Controlled local QA: real Vue UI + gateway/engine, in-memory database and file IO.
// Supabase Auth/RLS and R2 are tested separately; this script never contacts user accounts.
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createTramaHandler } from '../../../server/trama/gateway.mjs'

const out=import.meta.dirname, base='http://127.0.0.1:5180/tools/trama/index.html'
const user={id:'00000000-0000-4000-8000-00000000000a',email:'qa@trama.test',aud:'authenticated',role:'authenticated',user_metadata:{name:'Conferência local'},created_at:'2026-10-28T00:00:00Z'}
const expiry=Math.floor(Date.now()/1000)+3600
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:expiry})).toString('base64url')+'.local-fixture'
process.env.TRAMA_ENCRYPTION_KEY='ab'.repeat(32)
let state={documents:[],events:{}},revision=0,locked=false
const blobs=new Map()
const handler=createTramaHandler({
  authorize:async()=>({user,token,supabaseUrl:'https://fixture.invalid',supabaseKey:'fixture-public'}),
  persistence:{
    acquireWorkspace:async()=>{assert.equal(locked,false);locked=true;return{state:structuredClone(state),revision,leaseToken:'local-lease'}},
    commitWorkspace:async(_access,data)=>{assert.equal(data.revision,revision);state=structuredClone(data.state);return ++revision},
    releaseWorkspace:async()=>{locked=false},
  },
  files:{
    listFiles:async()=>[...blobs.values()].map(f=>f.metadata),
    uploadFile:async(_access,{name,mime,data})=>{const metadata={id:randomUUID(),name,mime,size_bytes:data.length,created_at:new Date().toISOString()};blobs.set(metadata.id,{metadata,body:data});return metadata},
    getFile:async(_access,id)=>blobs.get(id),deleteFile:async(_access,id)=>blobs.delete(id),
  },
})
const fixture=createServer(handler);fixture.listen(0,'127.0.0.1');await once(fixture,'listening')
const fixtureBase='http://127.0.0.1:'+fixture.address().port
let browser,page
const errors=[],warnings=[]
try{
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true})
  const context=await browser.newContext({viewport:{width:1440,height:960},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce'})
  await context.addInitScript(({token,user,expiry})=>{
    localStorage.setItem('caramelo-theme','dark')
    localStorage.setItem('sb-fzhzpzxsttflgtassyex-auth-token',JSON.stringify({access_token:token,refresh_token:'local-fixture',expires_at:expiry,expires_in:3600,token_type:'bearer',user}))
  },{token,user,expiry})
  await context.route('https://fzhzpzxsttflgtassyex.supabase.co/**',async route=>{
    const url=new URL(route.request().url())
    const body=url.pathname==='/auth/v1/user'?user:url.pathname.endsWith('/has_tool')?true:url.pathname.includes('/profiles')?{name:'Conferência local',nickname:null}:url.pathname.includes('record_tool_activity')?null:false
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
  })
  await context.route('**/api/trama?**',async route=>{
    const request=route.request()
    const response=await fetch(fixtureBase+new URL(request.url()).pathname+new URL(request.url()).search,{method:request.method(),headers:request.headers(),...(request.postData()?{body:request.postData()}: {})})
    const headers=Object.fromEntries(response.headers);delete headers['content-length'];delete headers['transfer-encoding'];delete headers['connection']
    await route.fulfill({status:response.status,headers,body:Buffer.from(await response.arrayBuffer())})
  })
  page=await context.newPage()
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='warning'&&m.text().includes('Failed to resolve component'))warnings.push(m.text())})
  await page.goto(base)
  await page.getByRole('heading',{name:/Uma ideia/}).waitFor({timeout:30000})
  await page.screenshot({path:path.join(out,'home-dark.png'),fullPage:true})
  await page.getByRole('button',{name:'Novo fluxo',exact:true}).click()
  await page.getByLabel('Nome do fluxo',{exact:true}).fill('Fluxo de conferência')
  await page.getByRole('button',{name:'Começar!',exact:true}).click()
  await page.getByRole('button',{name:'Rodar integração',exact:true}).waitFor()
  await page.getByRole('button',{name:'Rodar integração',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('.execution-terminal')?.innerText.includes('success'))
  assert.ok(state.documents.some(r=>r.collection==='executions'&&r.data.status==='success'))
  await page.screenshot({path:path.join(out,'editor-execution.png'),fullPage:true})
  await page.getByText('Execução concluída',{exact:true}).waitFor({state:'hidden'})
  await Promise.all([
    page.waitForResponse(response=>new URL(response.url()).searchParams.get('path')==='/rpc/saveFluxVersion'&&response.status()===200),
    page.getByRole('button',{name:'Publicar integração',exact:true}).click(),
  ])
  assert.ok(state.documents.some(r=>r.collection==='flows'&&r.data.versions?.length===1),'version persists after publishing')
  await page.goto(base+'#/files')
  await page.getByRole('heading',{name:/Guarde o que/}).waitFor()
  await page.locator('input[type=file]').setInputFiles({name:'entrada-qa.json',mimeType:'application/json',buffer:Buffer.from('{"message":"teste"}')})
  await page.getByRole('heading',{name:'entrada-qa.json',exact:true}).waitFor()
  await page.screenshot({path:path.join(out,'files-dark.png'),fullPage:true})
  const downloaded=page.waitForEvent('download')
  await page.getByRole('button',{name:'Baixar entrada-qa.json',exact:true}).click()
  assert.equal((await downloaded).suggestedFilename(),'entrada-qa.json')
  await page.getByRole('button',{name:'Excluir entrada-qa.json',exact:true}).click()
  await page.getByRole('button',{name:'Excluir arquivo',exact:true}).click()
  await page.getByRole('heading',{name:'Um espaço para suas próximas ideias.',exact:true}).waitFor()
  await page.goto(base)
  await page.getByRole('heading',{name:/Uma ideia/}).waitFor()
  await page.evaluate(()=>{document.documentElement.dataset.carameloTheme='light';localStorage.setItem('caramelo-theme','light')})
  await page.screenshot({path:path.join(out,'home-light.png'),fullPage:true})
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:path.join(out,'home-mobile.png'),fullPage:true})
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  assert.equal(overflow,false,'home should fit mobile viewport')
  assert.deepEqual(errors,[],'browser page errors')
  assert.deepEqual(warnings,[],'missing Vuetify components')
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({mode:'controlled-local-fixture',browser:'Edge headless',checks:['LAB gate with controlled Auth','create flow','manual execution real engine','save version','upload/download/delete fixture file','dark/light/mobile'],pageErrors:errors,missingComponents:warnings,mobileOverflow:overflow,executions:state.documents.filter(r=>r.collection==='executions').map(r=>({status:r.data.status,steps:r.data.steps.length})),externalAccountsUsed:false},null,2))
  console.log('QA Trama passed: create, execute, version, files, themes and mobile. Screenshots: '+out)
}catch(error){
  if(page){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.txt'),String(error)+'\n'+await page.locator('body').innerText()+'\n'+JSON.stringify({errors,warnings,state},null,2))}
  throw error
}finally{await browser?.close();fixture.closeAllConnections();await new Promise(resolve=>fixture.close(resolve))}
