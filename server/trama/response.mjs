import {randomBytes} from 'node:crypto'
import {problem} from './engine/domain.js'

const formats=new Set(['application/json','application/xml','text/xml','text/html','text/plain','multipart/form-data'])
export function webhookResponse(response){
  const selected=String(response.content_type??response.contentType??'application/json').split(';')[0].trim().toLowerCase()
  if(!formats.has(selected))throw problem('Formato de retorno não suportado.',422,'RETURN_FORMAT_INVALID')
  const content=response.body??{}
  let body,type=selected+'; charset=utf-8'
  if(selected==='multipart/form-data'){
    if(!content||typeof content!=='object'||Array.isArray(content))throw problem('O retorno multipart precisa de um objeto com os campos.',422,'RETURN_BODY_INVALID')
    const boundary='trama-'+randomBytes(18).toString('hex')
    const fields=Object.entries(content)
    if(fields.length>100)throw problem('O retorno multipart admite até 100 campos.',422,'RETURN_BODY_INVALID')
    body=fields.map(([name,value])=>{
      const key=name.replace(/[\r\n]/g,'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')
      return '--'+boundary+'\r\nContent-Disposition: form-data; name="'+key+'"\r\n\r\n'+(typeof value==='string'?value:JSON.stringify(value))+'\r\n'
    }).join('')+'--'+boundary+'--\r\n'
    type=selected+'; boundary='+boundary
  }else if(selected==='application/json')body=JSON.stringify(content)
  else if(typeof content==='string')body=content
  else if(selected==='text/plain')body=JSON.stringify(content)
  else throw problem('O corpo deste formato precisa ser texto.',422,'RETURN_BODY_INVALID')
  if(Buffer.byteLength(body)>2*1024*1024)throw problem('O retorno excede 2 MB.',422,'RETURN_BODY_LIMIT')
  return{body,type}
}
