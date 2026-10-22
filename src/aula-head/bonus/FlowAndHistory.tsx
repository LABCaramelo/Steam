import { useState, type DragEvent, type KeyboardEvent } from "react";
import { Choices, Hint } from "../ui";
import type { BonusProps } from "./types";
import "./flow-history.css";

const platforms = [
  { name: "Google AI Studio", role: "A oficina", icon: "✦", text: "É onde construímos e continuamos editando a página com a IA.", action: "CRIAR E EDITAR", link: "https://aistudio.google.com/" },
  { name: "GitHub", role: "O histórico", icon: "↶", text: "Guarda o código e o registro das mudanças. Cada versão ajuda a entender o que mudou.", action: "SALVAR VERSÕES", link: "https://github.com/" },
  { name: "Vercel", role: "A hospedagem", icon: "▲", text: "Recebe o projeto, prepara os arquivos e disponibiliza o site para as pessoas acessarem.", action: "COLOCAR NO AR", link: "https://vercel.com/" },
  { name: "Squarespace Domains", role: "O registro do endereço", icon: "⌁", text: "É onde registramos e administramos o nome do domínio. A hospedagem continua na Vercel.", action: "REGISTRAR O DOMÍNIO", link: "https://domains.squarespace.com/" },
];
const pathSteps = ["CRIAR", "SALVAR VERSÕES", "HOSPEDAR", "CONECTAR DOMÍNIO"];
const pathTools = ["Google AI Studio", "GitHub", "Vercel", "Squarespace → Vercel"];

function PublicationGraph({ selected, select, running, reduced }: { selected: number; select: (index: number) => void; running: boolean; reduced: boolean }) {
  return <div className={`pmap-graph ${running ? "pmap-running" : ""} ${reduced ? "pmap-still" : ""}`} aria-label="Fluxo: Google AI Studio, GitHub, Vercel e site online. Squarespace fornece o domínio que aponta para a Vercel.">
    <svg className="pmap-connectors" viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
      <defs><marker id="pmap-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" /></marker></defs>
      <path className="pmap-wire" d="M220 80H280 M460 80H520 M700 80H760 M460 260H610V140" markerEnd="url(#pmap-arrow)" />
      <path className="pmap-signal" d="M220 80H280 M460 80H520 M700 80H760 M460 260H610V140" />
    </svg>
    {platforms.map((platform, i) => <button key={platform.name} className={`pmap-node pmap-node-${i} ${selected === i ? "is-active" : ""}`} onClick={() => select(i)} aria-pressed={selected === i}>
      <span className="pmap-node-icon" aria-hidden="true">{platform.icon}</span><strong>{platform.name}</strong><small>{platform.role}</small>
    </button>)}
    <div className="pmap-online"><span className="pmap-browser-bar">● ● ●</span><strong>{running ? "SITE ONLINE ✓" : "SITE ONLINE"}</strong><span className="pmap-site-art" aria-hidden="true"><i /><i /><i /></span></div>
    <div className="pmap-domain-label">SEU DOMÍNIO <span>aponta para a hospedagem ↑</span></div>
    <span className="pmap-address">https://www.seuprojeto.com <small>ENDEREÇO ILUSTRATIVO</small></span>
  </div>;
}

export function PublicationMap({ lab, demo, reduced }: BonusProps) {
  const tab = Number(lab.demo["bonus-map-tab"] ?? 0);
  const selected = Number(lab.demo["bonus-map-platform"] ?? 0);
  const analogy = Number(lab.demo["bonus-map-analogy"] ?? 0);
  const orderValue = lab.demo["bonus-map-order"];
  const order = Array.isArray(orderValue) ? orderValue : [1, 3, 0, 2];
  const checked = Boolean(lab.demo["bonus-map-checked"]);
  const correct = order.every((value, i) => value === i);
  const [dragged, setDragged] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (from < 0 || to < 0 || from >= order.length || to >= order.length || from === to) return;
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]);
    demo("bonus-map-order", next);
    demo("bonus-map-checked", false);
  };
  const reorderKey = (event: KeyboardEvent<HTMLLIElement>, position: number) => {
    if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    move(position, position + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1));
  };
  const drop = (event: DragEvent<HTMLLIElement>, position: number) => {
    event.preventDefault(); if (dragged !== null) move(dragged, position); setDragged(null);
  };
  return <div className="bonus-slide pmap-slide">
    <Choices labels={["01 · O mapa", "02 · Monte o caminho", "03 · Endereço ≠ hospedagem"]} selected={tab} onChange={n => demo("bonus-map-tab", n)} />
    {tab === 0 && <div className="pmap-explore">
      <PublicationGraph selected={selected} select={n => demo("bonus-map-platform", n)} running={checked && correct} reduced={reduced} />
      <aside className="bonus-panel pmap-detail" aria-live="polite"><span className="pmap-kicker">{platforms[selected].action}</span><span className="pmap-detail-icon" aria-hidden="true">{platforms[selected].icon}</span><h2>{platforms[selected].role}.</h2><p>{platforms[selected].text}</p><a className="bonus-link" href={platforms[selected].link} target="_blank" rel="noreferrer">Abrir {platforms[selected].name} ↗</a><small>Toque em cada plataforma para descobrir sua função.</small></aside>
    </div>}
    {tab === 1 && <div className="pmap-order-view">
      <div className="pmap-order-heading"><div><span className="pmap-kicker">DA CRIAÇÃO À PUBLICAÇÃO</span><h2>Qual é o próximo passo?</h2></div><span>Arraste os cards ou use as setas.</span></div>
      <ol className="pmap-order" aria-label="Organizar as etapas da publicação">
        {order.map((step, position) => <li key={step} draggable tabIndex={0} onDragStart={e => { setDragged(position); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(position)); }} onDragOver={e => e.preventDefault()} onDrop={e => drop(e, position)} onDragEnd={() => setDragged(null)} onKeyDown={e => reorderKey(e, position)} className={dragged === position ? "is-dragging" : ""} aria-label={`Posição ${position + 1}: ${pathSteps[step]}. Use as setas para mover.`}>
          <span className="pmap-position">0{position + 1}<span aria-hidden="true">⠿</span></span><strong>{pathSteps[step]}</strong><small>{pathTools[step]}</small><div className="pmap-reorder"><button onClick={() => move(position, position - 1)} disabled={position === 0} aria-label={`Mover ${pathSteps[step]} para antes`}>←</button><button onClick={() => move(position, position + 1)} disabled={position === 3} aria-label={`Mover ${pathSteps[step]} para depois`}>→</button></div>
        </li>)}
      </ol>
      <div className="bonus-toolbar pmap-check"><button className="button primary" onClick={() => demo("bonus-map-checked", true)}>Conferir caminho →</button><span role="status">{checked ? correct ? "Caminho conectado. A ideia ganhou um endereço!" : "Quase! Primeiro criamos, depois registramos versões, hospedamos e conectamos o domínio." : "Quatro etapas. Uma página acessível para outras pessoas."}</span></div>
      {checked && correct ? <div className={`pmap-mini-flow ${reduced ? "pmap-still" : ""}`} aria-label="Publicação demonstrativa concluída">{["AI Studio", "GitHub", "Vercel", "seuprojeto.com"].map((name, i) => <span key={name} style={{ "--flow-delay": `${i * .35}s` } as React.CSSProperties}>{name}<b aria-hidden="true">{i === 3 ? "✓" : "→"}</b></span>)}</div> : <p className="bonus-note">Aqui montamos o fluxo didático. O domínio pode ser registrado antes; ele será conectado à hospedagem ao final.</p>}
    </div>}
    {tab === 2 && <div className="pmap-analogy">
      <div className={`pmap-house-scene pmap-house-selected-${analogy}`}><span className="pmap-scene-caption">UMA ANALOGIA PARA GUARDAR</span><button className="pmap-house-address" onClick={() => demo("bonus-map-analogy", 1)} aria-pressed={analogy === 1}><span>ENDEREÇO</span><strong>seuprojeto.com</strong><small>Domínio</small></button><button className="pmap-house" onClick={() => demo("bonus-map-analogy", 0)} aria-pressed={analogy === 0}><span className="pmap-roof" /><span className="pmap-house-front"><i /><i /><b /><strong>SEU SITE</strong></span></button><button className="pmap-ground" onClick={() => demo("bonus-map-analogy", 2)} aria-pressed={analogy === 2}><strong>HOSPEDAGEM</strong><span>Onde a casa existe e funciona.</span></button></div>
      <aside className="pmap-analogy-detail"><Choices labels={["A casa", "O endereço", "O local"]} selected={analogy} onChange={n => demo("bonus-map-analogy", n)} /><h2>{["A casa é a página.", "O domínio é o endereço.", "Hospedagem é onde funciona."][analogy]}</h2><p>{["É a experiência que as pessoas encontram ao visitar: textos, imagens, botões e interações.", "É o nome que as pessoas digitam. Registramos esse nome no Squarespace Domains e o conectamos à Vercel.", "Na nossa aula, a Vercel mantém o site disponível na internet. O domínio ajuda as pessoas a chegar até ele."][analogy]}</p><Hint>Você pode registrar o endereço em uma empresa e hospedar o site em outra.</Hint></aside>
    </div>}
    <p className="bonus-note pmap-simulation">Infográfico e endereço ilustrativos. Esta apresentação explica o caminho; nenhuma conta ou publicação é alterada aqui.</p>
  </div>;
}

const versions = [
  { label: "Hero criada", title: "Meu título original", description: "A primeira fotografia: proposta principal e um botão de ação.", date: "09:00" },
  { label: "Copy finalizada", title: "Meu título original", description: "A mensagem ganhou contexto: problema, solução e entregas.", date: "09:24" },
  { label: "Design System aplicado", title: "Meu título original", description: "Cores, tipografia e botões seguem a mesma direção visual.", date: "10:10" },
  { label: "Animações implementadas", title: "Meu título original", description: "O movimento ajuda a conduzir a leitura, sem esconder o conteúdo.", date: "11:02" },
  { label: "Headline atualizada", title: "Meu novo título", description: "Uma mudança simples, salva com uma descrição que explica a alteração.", date: "11:15" },
];
const syncSteps = [
  { title: "Abra seu projeto", label: "Google AI Studio", detail: "No Build mode, abra a Landing Page que você construiu. Confira a prévia antes de enviar o código.", visual: "Landing Page / Build" },
  { title: "Encontre a integração", label: "Settings → GitHub", detail: "Abra Settings e a aba GitHub. Ali você acompanha a conexão e o estado de sincronização do projeto.", visual: "Settings / GitHub" },
  { title: "Conecte sua conta", label: "Autorize o acesso necessário", detail: "Siga a autorização do GitHub e confira quais repositórios o AI Studio poderá acessar.", visual: "GitHub / autorização" },
  { title: "Escolha o repositório", label: "Novo ou existente", detail: "Crie ou vincule um repositório para este projeto. É nele que o código e suas versões serão guardados.", visual: "landing-page-aluno" },
  { title: "Envie o código", label: "AI Studio → GitHub", detail: "Use a sincronização da integração para enviar as mudanças. Confira a mensagem que descreve o conjunto de alterações.", visual: "Enviar alterações →" },
  { title: "Confira no GitHub", label: "Arquivos + primeiro commit", detail: "Abra o repositório e verifique se os arquivos e o registro da versão aparecem no histórico.", visual: "src / package.json / README" },
  { title: "Faça uma alteração", label: "De volta ao AI Studio", detail: "Peça uma mudança pequena na headline. Confira o resultado na prévia antes de sincronizar novamente.", visual: "“Atualize o título principal”" },
  { title: "Salve a nova versão", label: "Sincronize e confira", detail: "Envie a alteração ao GitHub. No repositório, confira o novo commit e o texto que explica o que mudou.", visual: "✓ Headline atualizada" },
];

function PageSnapshot({ version, small = false, reduced = false }: { version: number; small?: boolean; reduced?: boolean }) {
  return <div className={`history-snapshot history-look-${Math.min(3, version)} ${small ? "history-thumbnail" : ""} ${reduced ? "history-still" : ""}`} aria-hidden={small || undefined}>
    <span className="history-page-top"><b>ESTÚDIO DIREÇÃO</b><span>● ● ●</span></span><div className="history-page-hero"><span className="history-page-kicker">UMA PÁGINA. UMA DIREÇÃO.</span><strong>{versions[version].title}</strong><p>Clareza para transformar uma ideia em ação.</p><span className="history-page-cta">Quero dar o próximo passo ↗</span><i className="history-page-orbit" aria-hidden="true">✦</i></div>
    {version >= 1 && <div className="history-page-content"><div><span>O PROBLEMA</span><b>Muitas ideias. Pouco caminho.</b></div><div><span>A SOLUÇÃO</span><b>Uma experiência que conduz.</b></div><div><span>A ENTREGA</span><b>Do primeiro olhar à ação.</b></div></div>}
    {!small && <span className="history-mock-label">PRÉVIA SIMULADA · V{version + 1}</span>}
  </div>;
}

export function VersionHistory({ lab, demo, reduced }: BonusProps) {
  const tab = Number(lab.demo["bonus-history-tab"] ?? 0);
  const hasV5 = Boolean(lab.demo["bonus-history-v5"]);
  const selected = Math.min(hasV5 ? 4 : 3, Number(lab.demo["bonus-history-selected"] ?? 3));
  const walkthrough = Number(lab.demo["bonus-history-step"] ?? 0);
  const restoreChoice = Number(lab.demo["bonus-history-restore-choice"] ?? 1);
  const restored = Number(lab.demo["bonus-history-restored"] ?? -1);
  const available = versions.slice(0, hasV5 ? 5 : 4);
  const save = () => { demo("bonus-history-v5", true); demo("bonus-history-selected", 4); };
  return <div className="bonus-slide history-slide">
    <Choices labels={["01 · Máquina do tempo", "02 · Nova versão", "03 · Conectar ao GitHub", "04 · E se eu errar?"]} selected={tab} onChange={n => demo("bonus-history-tab", n)} />
    {tab === 0 && <div className="history-time-machine">
      <div className="history-timeline" aria-label="Versões ilustrativas da Landing Page">{available.map((version, i) => <button key={version.label} className={`history-version ${selected === i ? "is-selected" : ""}`} aria-pressed={selected === i} onClick={() => demo("bonus-history-selected", i)}><span className="history-version-marker">V{i + 1}<small>{version.date}</small></span><PageSnapshot version={i} small reduced /><strong>{version.label}</strong></button>)}</div>
      <div className="history-preview-row"><PageSnapshot version={selected} reduced={reduced} /><aside className="history-version-detail" aria-live="polite"><span className="history-kicker">FOTOGRAFIA DO PROJETO · V{selected + 1}</span><h2>{versions[selected].label}.</h2><p>{versions[selected].description}</p><Hint>Versão é uma fotografia do estado do projeto naquele momento.</Hint><span className="history-view-only">Explorar uma versão não altera nem restaura a página.</span></aside></div>
    </div>}
    {tab === 1 && <div className="history-save-view"><div className="history-change"><div><span className="history-kicker">ANTES · V4</span><h2>Meu título original</h2></div><span className="history-change-arrow" aria-hidden="true">↓</span><div className={hasV5 ? "history-saved" : ""}><span className="history-kicker">DEPOIS · {hasV5 ? "V5 SALVA ✓" : "ALTERAÇÃO AINDA NÃO SALVA"}</span><h2>Meu novo título</h2></div><button className="button primary" disabled={hasV5} onClick={save}>{hasV5 ? "V5 salva nesta demonstração ✓" : "Salvar nova versão →"}</button></div><aside className="bonus-panel history-commit-card" aria-live="polite"><span className="history-commit-icon" aria-hidden="true">{hasV5 ? "✓" : "+"}</span><span className="history-kicker">UM REGISTRO COM CONTEXTO</span><h2>{hasV5 ? "V5 · Headline atualizada" : "Uma mudança. Uma nova versão."}</h2><p>Um <em>commit</em> registra um conjunto de alterações no código. Sua descrição ajuda a identificar o que mudou.</p>{hasV5 ? <button className="text-button" onClick={() => demo("bonus-history-tab", 0)}>Ver V5 na linha do tempo →</button> : <span className="history-view-only">Clique em salvar para adicionar V5 à timeline simulada.</span>}</aside></div>}
    {tab === 2 && <div className="history-walkthrough"><ol className="history-walk-steps" aria-label="Etapas para conectar o projeto ao GitHub">{syncSteps.map((step, i) => <li key={step.title}><button onClick={() => demo("bonus-history-step", i)} aria-current={walkthrough === i ? "step" : undefined}><span>{String(i + 1).padStart(2, "0")}</span><strong>{step.title}</strong>{i < walkthrough && <b aria-hidden="true">✓</b>}</button></li>)}</ol><div className="bonus-panel history-walk-detail"><span className="history-kicker">PASSO {walkthrough + 1} DE 8 · {syncSteps[walkthrough].label}</span><div className="history-interface"><span className="history-interface-bar">● ● ● <b>ESQUEMA ILUSTRATIVO</b></span><div className="history-interface-content"><span>{walkthrough < 2 || walkthrough === 6 ? "✦ AI Studio" : "↶ GitHub"}</span><strong>{syncSteps[walkthrough].visual}</strong>{walkthrough === 5 && <div className="history-files"><i>▤ src/</i><i>▤ package.json</i><i>▤ README.md</i><small>1 commit · código sincronizado</small></div>}{walkthrough === 7 && <span className="history-sync-complete">AI Studio ↔ GitHub</span>}</div></div><p className="history-walk-copy" aria-live="polite">{syncSteps[walkthrough].detail}</p><div className="bonus-stepper"><button disabled={walkthrough === 0} onClick={() => demo("bonus-history-step", walkthrough - 1)}>← Anterior</button><span>{walkthrough + 1}/8</span><button disabled={walkthrough === 7} onClick={() => demo("bonus-history-step", walkthrough + 1)}>Próximo →</button></div><a className="bonus-link" href="https://ai.google.dev/gemini-api/docs/aistudio-build-mode#develop-externally" target="_blank" rel="noreferrer">Conferir a documentação atual do AI Studio ↗</a></div><p className="bonus-note history-pull-note">O caminho também funciona de volta: a aba GitHub em Settings permite trazer alterações do repositório para o AI Studio. Revise o estado da sincronização.</p></div>}
    {tab === 3 && <div className="history-restore-view"><div className="history-without bonus-panel"><span className="history-kicker">SEM HISTÓRICO ORGANIZADO</span><div className="history-lost-pages" aria-hidden="true"><span>final</span><span>final_2</span><span>final_agora</span><strong>?</strong></div><h2>Qual era a versão aprovada?</h2><p>Substituir arquivos sem registrar as mudanças torna o caminho de volta difícil de encontrar.</p></div><div className="history-with bonus-panel"><span className="history-kicker">COM HISTÓRICO</span><h2>Localize. Confira. Restaure.</h2><div className="history-restore-choices" aria-label="Escolher uma versão anterior">{versions.slice(0, 4).map((version, i) => <button key={version.label} className={restoreChoice === i ? "is-selected" : ""} aria-pressed={restoreChoice === i} onClick={() => demo("bonus-history-restore-choice", i)}>V{i + 1}<small>{version.label}</small></button>)}</div><p>Escolhida: <strong>V{restoreChoice + 1} · {versions[restoreChoice].label}</strong></p><button className="button primary" onClick={() => demo("bonus-history-restored", restoreChoice)}>Restaurar V{restoreChoice + 1} na demonstração ↶</button><div className="history-restore-status" role="status">{restored < 0 ? "Selecionar uma versão só permite consultá-la. A restauração exige uma ação explícita." : `✓ Estado da V${restored + 1} restaurado nesta simulação. No projeto real, confira as mudanças e registre a restauração em uma nova versão.`}</div>{restored >= 0 && <div className="history-restored-preview"><PageSnapshot version={restored} small reduced /></div>}</div></div>}
    <div className="history-bottom-notes"><p className="bonus-note history-secrets"><strong>Segredos ficam fora do código.</strong> Senhas, tokens e chaves privadas devem usar segredos de ambiente no servidor; repositório privado também não é cofre de credenciais.</p><div><a className="bonus-link" href="https://docs.github.com/en/pull-requests/reference/commits" target="_blank" rel="noreferrer">Commits ↗</a><a className="bonus-link" href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository" target="_blank" rel="noreferrer">Segredos ↗</a></div></div>
    <span className="bonus-note history-simulation">Simulação educativa. Sem conexão com contas, envio de código ou restauração de um repositório real.</span>
  </div>;
}
