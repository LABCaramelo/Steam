import { useEffect, useRef } from 'react';
import { MONTAGEM_APP_ID } from '../../toolCatalog';
import { mountTool } from '../shared/mount';
import { useToolUser } from '../shared/kit';
import { MontagemApp } from './editor/App';
import './montagem.css';

function MontagemTool(){
  const root=useRef<HTMLDivElement>(null);
  const {id}=useToolUser();
  useEffect(()=>{
    document.body.classList.add('montagem-dark-theme');
    const app=new MontagemApp(root.current!,id);
    return ()=>{app.destroy();document.body.classList.remove('montagem-dark-theme');};
  },[id]);
  return <div id="montagem-editor" ref={root} aria-label="Montagem — editor de vídeo"/>;
}
mountTool({slug:'montagem',appid:MONTAGEM_APP_ID,name:'Montagem'},<MontagemTool/>);
