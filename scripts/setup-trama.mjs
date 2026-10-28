import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const envPath=path.resolve(import.meta.dirname,'..','.env')
if(fs.existsSync(envPath))process.loadEnvFile(envPath)
const local=process.argv.includes('--local'), provision=process.argv.includes('--provision')
if(local){
  let source=fs.existsSync(envPath)?fs.readFileSync(envPath,'utf8'):''
  if(!process.env.TRAMA_ENCRYPTION_KEY){
    const line='TRAMA_ENCRYPTION_KEY='+randomBytes(32).toString('hex')
    source=/^TRAMA_ENCRYPTION_KEY=.*$/m.test(source)?source.replace(/^TRAMA_ENCRYPTION_KEY=.*$/m,line):source+'\n'+line+'\n'
    fs.writeFileSync(envPath,source)
  }else if(!/^[a-f0-9]{64}$/i.test(process.env.TRAMA_ENCRYPTION_KEY))throw new Error('TRAMA_ENCRYPTION_KEY existente é inválida; preserve a chave correta antes de continuar.')
  console.log('Chave local configurada em .env. Preserve-a; seu valor não é impresso.')
}
if(!local || provision){
  const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN
  const bucket=process.env.CLOUDFLARE_R2_PRIVATE_BUCKET||'umcaracaramelo-private'
  if(!account||!token)throw new Error('Configure CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN no servidor.')
  if(bucket===(process.env.CLOUDFLARE_R2_BUCKET||'umcaracaramelo'))throw new Error('O bucket privado não pode ser o bucket público de mídias.')
  const base='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(account)+'/r2/buckets'
  async function request(suffix,options={}){
    const response=await fetch(base+suffix,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)})
    const data=await response.json().catch(()=>null)
    if(!response.ok||data?.success===false)throw Object.assign(new Error('Cloudflare não confirmou a operação (HTTP '+response.status+').'),{status:response.status})
    return data.result
  }
  let exists=true
  try{await request('/'+encodeURIComponent(bucket))}catch(error){if(error.status===404)exists=false;else throw error}
  if(!exists&&provision){await request('',{method:'POST',body:JSON.stringify({name:bucket})});exists=true;console.log('Bucket privado criado: '+bucket)}
  if(!exists)console.log('Bucket privado ainda não existe. Use --provision para criá-lo: '+bucket)
  else{
    const managed=await request('/'+encodeURIComponent(bucket)+'/domains/managed')
    const custom=await request('/'+encodeURIComponent(bucket)+'/domains/custom')
    if(managed.enabled || (custom.domains??[]).some(domain=>domain.enabled))throw new Error('O bucket tem acesso público habilitado. Escolha um bucket privado antes de enviar arquivos.')
    console.log(JSON.stringify({bucket,private:true,r2_dev:false,public_custom_domains:false}))
    if(process.argv.includes('--verify')){
      const key='trama-check/'+randomBytes(12).toString('hex')
      const url=base+'/'+encodeURIComponent(bucket)+'/objects/'+key
      const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'}
      const bytes=Buffer.from('{"trama":"storage-check"}')
      try{
        const put=await fetch(url,{method:'PUT',headers,body:bytes,signal:AbortSignal.timeout(20000)})
        if(!put.ok)throw new Error('R2 não confirmou a escrita de teste: HTTP '+put.status)
        const get=await fetch(url,{headers,signal:AbortSignal.timeout(20000)})
        if(!get.ok||!Buffer.from(await get.arrayBuffer()).equals(bytes))throw new Error('R2 não devolveu os mesmos bytes no teste.')
        console.log('R2: escrita e leitura reais conferidas com objeto temporário de teste.')
      }finally{
        const deleted=await fetch(url,{method:'DELETE',headers,signal:AbortSignal.timeout(20000)})
        if(!deleted.ok&&deleted.status!==404)throw new Error('R2 não confirmou a limpeza do objeto de teste.')
        console.log('R2: objeto de teste removido.')
      }
    }
  }
}
