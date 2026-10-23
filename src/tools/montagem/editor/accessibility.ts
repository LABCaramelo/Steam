/** Add semantics to the imperative editor's panels after each render. */
export function installEditorAccessibility(root:HTMLElement):()=>void {
  let serial=0;
  const decorate=()=>{
    root.querySelectorAll<HTMLElement>('.inspector-header').forEach(header=>{if(!header.querySelector('[data-close-inspector]')){const close=document.createElement('button');close.className='btn-icon inspector-mobile-close';close.dataset.closeInspector='true';close.textContent='×';close.setAttribute('aria-label','Fechar propriedades');header.appendChild(close);}});
    root.querySelectorAll<HTMLElement>('.asset-card,.audio-card-item,.preset-card,.sticker-card,.transition-card,.filter-card,.effect-card').forEach(card=>{
      if(!card.hasAttribute('tabindex')){card.tabIndex=0;card.setAttribute('role','button');}
    });
    root.querySelectorAll<HTMLButtonElement>('button[title]').forEach(button=>{if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label',button.title);});
    root.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea').forEach(input=>{
      if(input.type==='file'||input.hasAttribute('aria-label')||input.closest('label')||(input.id&&root.querySelector(`label[for="${input.id}"]`)))return;
      const text=input.closest('.prop-row,.prop-group')?.querySelector('.prop-label,.prop-group-title')?.textContent||input.title||input.id.replaceAll('-',' ');
      input.setAttribute('aria-label',text.trim()||`Controle ${++serial}`);
    });
  };
  const observer=new MutationObserver(decorate);observer.observe(root,{childList:true,subtree:true});decorate();
  const keyboard=(e:KeyboardEvent)=>{const card=(e.target as Element).closest<HTMLElement>('[role="button"]');if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();card.click();}};
  root.addEventListener('keydown',keyboard);
  return ()=>{observer.disconnect();root.removeEventListener('keydown',keyboard);};
}
