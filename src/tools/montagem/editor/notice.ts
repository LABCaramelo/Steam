export function notify(message:string){
  const notice=document.createElement('div');notice.className='montagem-notice';notice.setAttribute('role','status');notice.textContent=message;document.body.appendChild(notice);setTimeout(()=>notice.remove(),5000);
}
