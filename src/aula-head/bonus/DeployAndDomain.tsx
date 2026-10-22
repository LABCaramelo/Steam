import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "../ui";
import type { BonusProps } from "./types";
import "./deploy-domain.css";

const deployPhases = ["PREPARANDO", "CONSTRUINDO", "PUBLICANDO", "READY"];
const dnsPhases = ["DNS CONFIGURADO", "AGUARDANDO VERIFICAÇÃO", "DOMÍNIO VALIDADO", "HTTPS ATIVO"];
const deployGuide = [
  ["Entre na Vercel", "Acesse sua conta e confira a equipe e o plano usados no projeto."],
  ["Crie um projeto", "No painel, use Add New… → Project. O fluxo permite importar um repositório Git."],
  ["Conecte o GitHub", "Autorize o acesso necessário e confira se o repositório está disponível para a integração."],
  ["Escolha o repositório", "Selecione a Landing Page que você acabou de sincronizar no GitHub."],
  ["Confira o build", "Revise framework, pasta do projeto, comando de construção e pasta de saída. Priorize os padrões detectados quando corresponderem ao projeto."],
  ["Valide a compatibilidade", "Identifique frontend e backend, rotas de servidor, dependências e serviços externos. Configure variáveis no ambiente correto e mantenha segredos fora do navegador. Projetos do AI Studio podem exigir adaptações."],
  ["Inicie a publicação", "Use Deploy e acompanhe o resultado. Em caso de erro, leia os logs antes de tentar novamente."],
  ["Abra o endereço", "Use o endereço fornecido pela publicação concluída. Confira se você abriu Preview ou Production."],
  ["Teste a página", "Verifique desktop, celular, links, mídia e envio dos formulários ao destino correto. Ready confirma a publicação, não todos os testes."],
];
const domainBuyGuide = [
  ["Entre no Squarespace Domains", "Abra a plataforma oficial e acesse sua conta."],
  ["Pesquise o domínio", "Digite o nome e a extensão desejados na busca oficial."],
  ["Confira a disponibilidade", "Somente a consulta atual da plataforma pode confirmar se um domínio pode ser registrado."],
  ["Compare as opções", "Compare extensões, valor do registro e condições da oferta."],
  ["Confira a renovação", "Verifique o custo de renovação e o prazo. O domínio tem cobrança própria, separada da hospedagem."],
  ["Revise os dados", "Confira titular, contato, condições do registro e configurações oferecidas."],
  ["Decida e conclua", "Só conclua a compra na interface oficial após sua decisão explícita. Esta apresentação não compra nem registra domínios."],
];
const dnsGuide = [
  ["Na Vercel", "Abra o projeto → Settings → Domains. Adicione o domínio comprado e, se desejar, a versão com www. Leia os registros recomendados para esse domínio e projeto."],
  ["No Squarespace", "Abra o painel de domínios → selecione o domínio → DNS → Configurações DNS. Em Registros personalizados, use Adicionar registro, confira Tipo, Nome e Dados e salve. Pode ser necessário reautenticar."],
  ["Use os valores atuais", "Copie os valores exatos de Settings → Domains. O Squarespace também oferece presets para plataformas; confira se os registros resultantes correspondem ao seu projeto."],
  ["Verifique e teste", "Volte à Vercel, confira a configuração e aguarde a verificação e o HTTPS. A propagação DNS pode levar tempo. Teste o domínio depois da conclusão."],
];

function External({ href, children }: { href: string; children: ReactNode }) {
  return <a className="bonus-link" href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}
function Tabs({ labels, active, select, label }: { labels: string[]; active: number; select: (value: number) => void; label: string }) {
  return <nav className="bonus-toolbar deploy-tabs" aria-label={label}>{labels.map((text, index) => <button key={text} type="button" aria-pressed={index === active} className={index === active ? "selected" : ""} onClick={() => select(index)}>{text}</button>)}</nav>;
}
function Walkthrough({ steps, links }: { steps: string[][]; links?: ReactNode }) {
  const [step, setStep] = useState(0);
  return <div className="deploy-walkthrough">
    <div className="deploy-walk-dots" aria-label="Etapas do guia">{steps.map(([title], index) => <button key={title} type="button" aria-label={`${index + 1}. ${title}`} aria-pressed={step === index} className={index === step ? "selected" : ""} onClick={() => setStep(index)}>{String(index + 1).padStart(2, "0")}</button>)}</div>
    <div className="deploy-walk-copy" aria-live="polite"><span className="eyebrow">NA INTERFACE OFICIAL · {step + 1}/{steps.length}</span><h3>{steps[step][0]}</h3><p>{steps[step][1]}</p></div>
    <div className="bonus-toolbar"><button className="button" disabled={step === 0} onClick={() => setStep(step - 1)}>← Anterior</button><button className="button primary" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Próxima etapa →</button></div>
    {links && <div className="deploy-guide-links">{links}</div>}
  </div>;
}
function PhaseRail({ phases, phase }: { phases: string[]; phase: number }) {
  return <ol className="deploy-phases" aria-label={phase < 0 ? "Simulação ainda não iniciada" : `Etapa atual: ${phases[phase]}`} aria-live="polite">{phases.map((text, index) => <li key={text} className={index <= phase ? "active" : ""} aria-current={index === phase ? "step" : undefined}><span>{index < phase ? "✓" : String(index + 1).padStart(2, "0")}</span><b>{text}</b></li>)}</ol>;
}

const fieldInfo = [
  ["Repository", "landing-page-aluno", "O repositório do GitHub que contém o código a publicar."],
  ["Framework", "Detectado: Vite · exemplo", "O tipo de aplicação. Confira se a detecção automática corresponde ao seu projeto."],
  ["Root Directory", "Pasta do projeto · detectada", "A pasta onde a aplicação está. Nem todo repositório usa a raiz."],
  ["Build Command", "Detectado pelo framework", "A instrução que prepara os arquivos. Mantenha o padrão quando ele corresponder à aplicação."],
  ["Output Directory", "Detectada pelo framework", "Onde fica o resultado preparado para publicação. Varia conforme o framework."],
  ["Environment Variables", "Conferir no ambiente correto", "Configurações externas ao código. Segredos devem ficar no servidor e nunca ser expostos no navegador."],
];
const diagnostics = [
  ["Build Failed", "A preparação não terminou.", "Abra os logs da publicação e localize a primeira falha. Confira dependências, pasta do projeto e configurações. Corrija e publique novamente."],
  ["Missing Environment Variable", "Faltou uma configuração.", "Identifique a variável exigida e configure-a na Vercel para o ambiente correto. Não cole chaves no código do navegador. Depois, faça uma nova publicação."],
  ["Ready", "A versão foi publicada.", "Abra a página e teste suas funções. Confira o destino dos formulários, mídia, celular e o ambiente: Preview e Production têm finalidades diferentes."],
];

export function DeploySimulator({ lab, demo, reduced }: BonusProps) {
  const tab = Number(lab.demo["bonus-deploy-tab"] ?? 0);
  const [stage, setStage] = useState<"empty" | "repos" | "config" | "deploy">("empty");
  const [field, setField] = useState(0);
  const [scenario, setScenario] = useState(0);
  const [diagnostic, setDiagnostic] = useState(0);
  const [notice, setNotice] = useState("");
  const [phase, setPhase] = useState(-1);
  const [updatePhase, setUpdatePhase] = useState(-1);
  const [environment, setEnvironment] = useState(0);
  useEffect(() => {
    if (tab !== 0 || stage !== "deploy" || reduced || phase < 0 || phase >= 3) return;
    const timer = window.setTimeout(() => setPhase(value => Math.min(value + 1, 3)), 850);
    return () => window.clearTimeout(timer);
  }, [phase, reduced, stage, tab]);
  useEffect(() => {
    if (tab !== 1 || reduced || updatePhase < 0 || updatePhase >= 4) return;
    const timer = window.setTimeout(() => setUpdatePhase(value => Math.min(value + 1, 4)), 850);
    return () => window.clearTimeout(timer);
  }, [updatePhase, reduced, tab]);
  function deploy() {
    if (scenario !== 0) {
      setNotice(scenario === 1 ? "Diagnóstico: o backend do exemplo usa recursos incompatíveis. Adapte rotas e dependências antes de publicar. Nenhum deploy foi iniciado." : "Diagnóstico: uma variável necessária está ausente. Configure-a no ambiente correto, proteja o segredo e publique novamente.");
      return;
    }
    setNotice(""); setPhase(0); setStage("deploy");
  }
  return <div className="bonus-slide deploy-slide">
    <Tabs labels={["01 · Publicar", "02 · Atualizar", "03 · Diagnosticar", "Guia prático"]} active={tab} select={value => demo("bonus-deploy-tab", value)} label="Experiências da publicação" />
    <div className="bonus-panel deploy-workspace">
      <span className="deploy-simulation">SIMULAÇÃO EDUCATIVA · nenhum repositório é conectado</span>
      {tab === 0 && stage === "empty" && <div className="deploy-start">
        <div className="deploy-pipeline" aria-label="GitHub, Vercel, Build, Deploy, Site online">{["GITHUB", "VERCEL", "BUILD", "DEPLOY", "SITE ONLINE"].map((text, index) => <div key={text}><span>{["⌘", "▲", "◇", "↗", "◎"][index]}</span><b>{text}</b>{index < 4 && <i aria-hidden="true">→</i>}</div>)}</div>
        <div className="deploy-definitions"><p><b>Build</b> prepara os arquivos.</p><p><b>Deploy</b> coloca uma versão no ar.</p></div>
        <button className="button primary" onClick={() => setStage("repos")}>Importar repositório →</button>
      </div>}
      {tab === 0 && stage === "repos" && <div className="deploy-repos"><span className="eyebrow">GITHUB · REPOSITÓRIOS FICTÍCIOS</span><h2>Qual projeto vamos publicar?</h2>{["landing-page-aluno", "experimentos-visuais", "portfolio-rascunho"].map((repo, index) => <button key={repo} className="deploy-repo" onClick={() => index === 0 ? (setStage("config"), setNotice("")) : setNotice("Para esta demonstração, escolha landing-page-aluno.")}><span>⌘</span><b>{repo}</b><span>Importar ↗</span></button>)}<p className="bonus-note" role="status">{notice || "Uma lista real depende das permissões concedidas ao GitHub."}</p></div>}
      {tab === 0 && stage === "config" && <div className="deploy-config">
        <div className="deploy-fields">{fieldInfo.map(([title, value], index) => <button key={title} className={field === index ? "selected" : ""} aria-pressed={field === index} onClick={() => setField(index)}><small>{title}</small><b>{value}</b></button>)}<p className="deploy-field-help" aria-live="polite">{fieldInfo[field][2]}</p></div>
        <div className="deploy-preflight"><span className="eyebrow">ANTES DE PUBLICAR</span><h3>O projeto é compatível?</h3><p>Reconheça os campos. As configurações são detectadas quando possível.</p><div className="deploy-scenarios" aria-label="Cenário de compatibilidade">{["Frontend compatível", "Backend incompatível", "Variável ausente"].map((text, index) => <button key={text} aria-pressed={scenario === index} className={scenario === index ? "selected" : ""} onClick={() => { setScenario(index); setNotice(""); }}>{text}</button>)}</div><p className="deploy-preflight-summary">{scenario === 0 ? "Exemplo verificado: apenas frontend, build funcional, dependências compatíveis e sem segredos no navegador." : scenario === 1 ? "Exemplo com servidor: suas rotas e dependências exigem adaptação ao ambiente da Vercel." : "Exemplo com API: uma configuração necessária ainda não foi fornecida ao ambiente."}</p><button className="button primary" onClick={deploy}>Conferir e simular Deploy →</button><p className="bonus-note deploy-notice" role="status">{notice || "A pré-checagem real inclui frontend/backend, rotas, serviços externos, variáveis, segredos e build."}</p></div>
      </div>}
      {tab === 0 && stage === "deploy" && <div className="deploy-publishing"><span className="deploy-vercel">▲</span><PhaseRail phases={deployPhases} phase={phase} /><div className="deploy-address" aria-live="polite">{phase === 3 ? <><b>Uma versão está online.</b><code>https://landing-page-aluno.vercel.app</code><small>Endereço ilustrativo · abra e teste o endereço real da sua publicação.</small></> : <><b>{deployPhases[phase]}…</b><small>Construindo o exemplo compatível.</small></>}</div><div className="bonus-toolbar">{reduced && phase < 3 && <button className="button primary" onClick={() => setPhase(phase + 1)}>Avançar simulação →</button>}<button className="button" onClick={() => { setStage("config"); setPhase(-1); }}>↶ Rever configuração</button></div></div>}
      {tab === 1 && <div className="deploy-update"><div className="deploy-environments">{["Production", "Preview"].map((text, index) => <button key={text} aria-pressed={environment === index} className={environment === index ? "selected" : ""} onClick={() => { setEnvironment(index); setUpdatePhase(-1); }}>{text}</button>)}</div><p className="deploy-env-copy">{environment === 0 ? "Production serve o site principal. Alterações precisam chegar à branch configurada para produção." : "Preview permite conferir uma alteração em um endereço de teste. Ela não substitui automaticamente o site principal."}</p><div className="deploy-headline-preview"><span className="eyebrow">{environment === 0 ? "SITE PRINCIPAL · EXEMPLO" : "PRÉVIA DE TESTE · EXEMPLO"}</span><h2>{updatePhase === 4 ? "Uma ideia com direção." : "Meu título original."}</h2><small>{updatePhase < 4 ? "A versão publicada continua igual até o processo terminar." : environment === 0 ? "Atualização ilustrativa em produção após sincronização e build bem-sucedidos." : "Atualização apenas na prévia. A produção permanece com o título original."}</small></div><PhaseRail phases={["AI STUDIO", "GITHUB", "NOVO COMMIT", "VERCEL", environment === 0 ? "PRODUÇÃO" : "PREVIEW"]} phase={updatePhase} /><div className="bonus-toolbar"><button className="button primary" disabled={updatePhase >= 0 && updatePhase < 4} onClick={() => setUpdatePhase(0)}>Atualizar headline ↗</button>{reduced && updatePhase >= 0 && updatePhase < 4 && <button className="button" onClick={() => setUpdatePhase(updatePhase + 1)}>Próxima etapa →</button>}</div></div>}
      {tab === 2 && <div className="deploy-diagnostics"><div className="deploy-diagnostic-list">{diagnostics.map(([title], index) => <button key={title} aria-pressed={diagnostic === index} className={diagnostic === index ? "selected" : ""} onClick={() => setDiagnostic(index)}><span>{index === 2 ? "✓" : "!"}</span>{title}<i>→</i></button>)}</div><div className="deploy-diagnostic-copy" aria-live="polite"><span className="eyebrow">{diagnostics[diagnostic][0]}</span><h2>{diagnostics[diagnostic][1]}</h2><p>{diagnostics[diagnostic][2]}</p><External href="https://vercel.com/docs/deployments/troubleshoot-a-build">Consultar diagnóstico oficial</External></div></div>}
      {tab === 3 && <Walkthrough steps={deployGuide} links={<><External href="https://vercel.com/new">Abrir Vercel</External><External href="https://vercel.com/docs/git">Git e publicações</External><External href="https://vercel.com/docs/deployments/environments">Preview / Production</External></>} />}
    </div>
    <p className="bonus-note deploy-plan">Hobby: uso pessoal não comercial. Projetos comerciais exigem plano compatível. <External href="https://vercel.com/docs/plans">Conferir planos</External></p>
  </div>;
}

const checklistGroups = [
  { title: "PROJETO", items: ["Landing Page finalizada", "Repositório conectado ao GitHub", "Arquivos sincronizados corretamente"] },
  { title: "HOSPEDAGEM", items: ["Projeto conectado à Vercel", "Build realizado com sucesso", "Site aberto e testado no endereço da Vercel"] },
  { title: "DOMÍNIO", items: ["Domínio registrado", "Domínio adicionado à Vercel", "Registros DNS configurados no Squarespace", "Domínio validado", "HTTPS ativo", "Redirecionamento www / sem www configurado, quando aplicável"] },
  { title: "VERIFICAÇÃO FINAL", items: ["Página abre no desktop", "Página abre no celular", "Links e botões funcionam", "Formulários enviam dados ao destino correto", "Imagens e vídeos carregam", "Não existem erros visíveis", "Atualizações do GitHub chegam à produção após publicação bem-sucedida", "Plano de hospedagem é adequado ao uso do projeto"] },
];
const dnsRecords = [
  { type: "A", host: "@", purpose: "domínio raiz", values: ["A", "@", "IP INFORMADO PELA VERCEL"] },
  { type: "CNAME", host: "www", purpose: "subdomínio www", values: ["CNAME", "www", "HOSTNAME INFORMADO PELA VERCEL"] },
];
const dnsLabels = ["TIPO", "NOME", "VALOR / DADOS"];

export function DomainSimulator({ lab, demo, reduced }: BonusProps) {
  const tab = Number(lab.demo["bonus-domain-tab"] ?? 0);
  const [query, setQuery] = useState("minhamarca");
  const [searched, setSearched] = useState("minhamarca");
  const [customAddress, setCustomAddress] = useState(false);
  const [guide, setGuide] = useState<"buy" | "dns" | "checklist" | null>(null);
  const [dnsView, setDnsView] = useState(0);
  const [record, setRecord] = useState(0);
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [dnsNotice, setDnsNotice] = useState("");
  const [dnsPhase, setDnsPhase] = useState(-1);
  const [primary, setPrimary] = useState(0);
  const [group, setGroup] = useState(0);
  const [finale, setFinale] = useState(false);
  const recordKey = `bonus-domain-record-${record}`;
  const stored = lab.demo[recordKey];
  const assignments = Array.isArray(stored) ? stored : [-1, -1, -1];
  const checkStored = lab.demo["bonus-domain-checks"];
  const checks = Array.isArray(checkStored) ? checkStored : Array(20).fill(0) as number[];
  const count = checks.filter(Boolean).length;
  const domainName = `${searched}.com`;
  useEffect(() => {
    if (tab !== 1 || dnsView !== 1 || reduced || dnsPhase < 0 || dnsPhase >= 3) return;
    const timer = window.setTimeout(() => setDnsPhase(value => Math.min(value + 1, 3)), 950);
    return () => window.clearTimeout(timer);
  }, [dnsPhase, dnsView, reduced, tab]);
  function assign(slot: number, value: number) {
    if (value < 0 || value > 2) return;
    demo(recordKey, assignments.map((existing, index) => index === slot ? value : existing));
    setDnsNotice(""); setDnsPhase(-1);
  }
  function validateDNS() {
    const a = lab.demo["bonus-domain-record-0"];
    const cname = lab.demo["bonus-domain-record-1"];
    const correct = [a, cname].every(values => Array.isArray(values) && values.every((value, index) => value === index) && values.length === 3);
    setDnsNotice(correct ? "Associação correta. Vamos acompanhar os estados ilustrativos de verificação." : "Confira os dois registros. Tipo, Nome e Valor devem corresponder exatamente ao que a Vercel informou.");
    if (correct) setDnsPhase(0);
  }
  function check(index: number) { demo("bonus-domain-checks", checks.map((value, item) => item === index ? (value ? 0 : 1) : value)); }
  function checklist(all: boolean) {
    let offset = 0;
    return <div className={`domain-checks ${all ? "domain-checks-full" : ""}`}>{checklistGroups.map((section, sectionIndex) => {
      const start = offset; offset += section.items.length;
      if (!all && sectionIndex !== group) return null;
      return <section key={section.title}><h3>{section.title}</h3>{section.items.map((text, item) => <label key={text}><input type="checkbox" checked={Boolean(checks[start + item])} onChange={() => check(start + item)} /><span>{text}</span></label>)}</section>;
    })}</div>;
  }
  if (finale) return <div className={`bonus-slide domain-finale ${reduced ? "is-reduced" : ""}`}>
    <div className="domain-final-flow" aria-label="Google AI Studio, GitHub, Vercel, Squarespace, seu domínio, Landing Page online"><span>GOOGLE AI STUDIO</span><i>→</i><span>GITHUB</span><i>→</i><span>VERCEL</span><span className="domain-final-branch">SQUARESPACE → SEU DOMÍNIO ↗</span></div>
    <div className="domain-final-message"><span className="eyebrow">SUA LANDING PAGE ESTÁ ONLINE · JORNADA DE PUBLICAÇÃO</span><h2>Você começou com uma ideia.<br /><em>Agora ela tem um lugar na internet.</em></h2><p>A IA EXECUTA. <strong>VOCÊ DIRIGE.</strong></p></div>
    <p className="bonus-note">Conclusão da revisão didática. A apresentação não verifica nem publica um site real.</p><button className="button" onClick={() => setFinale(false)}>↶ Voltar à revisão</button>
  </div>;
  return <div className="bonus-slide domain-slide">
    <Tabs labels={["01 · Domínio", "02 · DNS", "03 · Endereço principal", "04 · Checklist"]} active={tab} select={value => demo("bonus-domain-tab", value)} label="Experiências do domínio" />
    <div className="bonus-panel domain-workspace">
      <span className="deploy-simulation">SIMULAÇÃO EDUCATIVA · nenhum domínio ou DNS real é alterado</span>
      {tab === 0 && <div className="domain-search-view"><div className={`domain-address-swap ${customAddress ? "is-custom" : ""}`}><span className="eyebrow">{customAddress ? "COM SEU ENDEREÇO" : "ENDEREÇO DA HOSPEDAGEM"}</span><code>{customAddress ? `https://www.${domainName}` : "https://landing-page-aluno.vercel.app"}</code><button className="button" onClick={() => setCustomAddress(value => !value)}>{customAddress ? "↶ Ver endereço anterior" : "Visualizar domínio próprio →"}</button></div><div className="domain-search"><form onSubmit={event => { event.preventDefault(); const slug = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 40); setSearched(slug || "minhamarca"); }}><label htmlFor="bonus-domain-search">Qual endereço você gostaria de usar?</label><div><input id="bonus-domain-search" value={query} maxLength={60} onChange={event => setQuery(event.target.value)} autoComplete="off" placeholder="minhamarca" /><button className="button primary" type="submit">Simular busca →</button></div></form><div className="domain-examples">{["com", "design", "studio"].map(extension => <span key={extension}><b>{searched}.{extension}</b><small>Exemplo ilustrativo</small></span>)}</div><p className="bonus-note">Exemplos demonstrativos. Consulte disponibilidade e preços reais no Squarespace. Domínio e renovação têm custo próprio.</p><div className="bonus-toolbar"><button className="button" onClick={() => setGuide("buy")}>Guia de compra · 7 etapas ↗</button><External href="https://domains.squarespace.com/">Squarespace Domains</External></div></div><p className="domain-service-note"><b>Squarespace registra o endereço.</b> A Vercel continua hospedando a página.</p></div>}
      {tab === 1 && <div className="domain-dns-view"><div className="domain-dns-tabs"><button aria-pressed={dnsView === 0} className={dnsView === 0 ? "selected" : ""} onClick={() => setDnsView(0)}>Entender o caminho</button><button aria-pressed={dnsView === 1} className={dnsView === 1 ? "selected" : ""} onClick={() => setDnsView(1)}>Associar registros</button><button onClick={() => setGuide("dns")}>Guia nas plataformas ↗</button></div>{dnsView === 0 ? <div className="domain-dns-diagram"><div className="domain-dns-path">{["PESSOA DIGITA O ENDEREÇO", "CONSULTA DNS", "ENCONTRA A VERCEL", "VERCEL ENTREGA O SITE", "LANDING PAGE APARECE"].map((text, index) => <div key={text}><span>{String(index + 1).padStart(2, "0")}</span><b>{text}</b>{index < 4 && <i aria-hidden="true">→</i>}</div>)}</div><h2>DNS ajuda o endereço<br /><em>a encontrar o destino.</em></h2><p>O domínio identifica. A hospedagem entrega a página.</p><button className="button primary" onClick={() => setDnsView(1)}>Conectar as plataformas →</button></div> : <div className="domain-dns-association"><div className="domain-record-tabs">{dnsRecords.map((item, index) => <button key={item.type} aria-pressed={record === index} className={record === index ? "selected" : ""} onClick={() => { setRecord(index); setSelectedToken(null); }}><b>{item.type}</b> · {item.purpose}</button>)}</div><div className="domain-dns-columns"><section className="domain-dns-source"><h3>▲ VERCEL <small>Settings → Domains</small></h3><p>Registros recomendados para o projeto</p><div className="domain-token-tray">{[2, 0, 1].map(index => <button key={index} draggable type="button" aria-pressed={selectedToken === index} className={selectedToken === index ? "selected" : ""} onClick={() => setSelectedToken(index)} onDragStart={event => { event.dataTransfer.setData("text/plain", String(index)); event.dataTransfer.effectAllowed = "copy"; }}><span>⠿</span>{dnsRecords[record].values[index]}</button>)}</div><small>Arraste uma ficha ou selecione-a e toque no campo de destino. Os menus também funcionam pelo teclado.</small></section><section className="domain-dns-target"><h3>SQUARESPACE <small>DNS → Configurações DNS</small></h3>{dnsLabels.map((label, index) => <label key={label} className="domain-drop" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={event => { event.preventDefault(); const token = event.dataTransfer.getData("text/plain"); if (/^[0-2]$/.test(token)) assign(index, Number(token)); }}><span>{label}</span><div><button className="domain-place-token" disabled={selectedToken === null} aria-label={`Colocar ficha selecionada em ${label}`} onClick={() => selectedToken !== null && assign(index, selectedToken)}>↓</button><select aria-label={`${dnsRecords[record].type}: ${label}`} value={assignments[index]} onChange={event => assign(index, Number(event.target.value))}><option value={-1}>Selecione ou arraste</option>{dnsRecords[record].values.map((value, token) => <option key={value} value={token}>{value}</option>)}</select></div></label>)}</section></div>{dnsPhase >= 0 ? <div className="domain-verification"><PhaseRail phases={dnsPhases} phase={dnsPhase} />{reduced && dnsPhase < 3 && <button className="button" onClick={() => setDnsPhase(dnsPhase + 1)}>Avançar verificação simulada →</button>}</div> : <button className="button primary domain-validate" onClick={validateDNS}>Validar os dois registros →</button>}<p className="bonus-note domain-dns-notice" role="status">{dnsNotice || "Use sempre os valores atuais fornecidos pelo projeto na Vercel. IP e hostname aqui são placeholders."}</p></div>}</div>}
      {tab === 2 && <div className="domain-primary-view"><span className="eyebrow">QUAL SERÁ O ENDEREÇO PRINCIPAL?</span><div className="domain-primary-choices">{[domainName, `www.${domainName}`].map((value, index) => <button key={value} aria-pressed={primary === index} className={primary === index ? "selected" : ""} onClick={() => setPrimary(index)}><span>{index === 0 ? "SEM WWW" : "COM WWW"}</span><b>{value}</b><small>{primary === index ? "✓ Principal" : "Escolher como principal"}</small></button>)}</div><div className="domain-redirect" aria-live="polite"><code>{primary === 0 ? `www.${domainName}` : domainName}</code><span>REDIRECIONAMENTO →</span><code>{primary === 0 ? domainName : `www.${domainName}`}</code></div><p>Tenha as duas versões funcionando e escolha uma como principal. Configure o redirecionamento na Vercel depois de adicionar os endereços.</p><p className="bonus-note">DNS encontra o destino. Redirecionamento envia uma URL para outra. São configurações diferentes.</p><External href="https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting">Guia oficial de redirecionamento</External></div>}
      {tab === 3 && <div className="domain-checklist-view"><div className="domain-checklist-heading"><div><span className="eyebrow">REVISÃO FINAL</span><h2>{count}<em> / 20</em></h2></div><button className="button" onClick={() => setGuide("checklist")}>Expandir checklist ↗</button></div><progress max={20} value={count} aria-label={`${count} de 20 itens revisados`} /><div className="domain-check-groups">{checklistGroups.map((section, index) => <button key={section.title} aria-pressed={group === index} className={group === index ? "selected" : ""} onClick={() => setGroup(index)}>{section.title}</button>)}</div>{checklist(false)}<div className="domain-checklist-end"><p className="bonus-note">Marque após conferir. Não há registro do seu projeto nem verificação automática.</p><button className="button primary" disabled={count < 20} onClick={() => setFinale(true)}>Concluir a jornada →</button></div></div>}
    </div>
    <p className="bonus-note domain-warning">{tab === 1 ? "Preserve MX e registros de e-mail. Propagação e HTTPS dependem da configuração correta; os estados acima são simulados." : "O domínio pode ser registrado no Squarespace e hospedado na Vercel. A apresentação não realiza compras."} {tab === 1 && <External href="https://support.squarespace.com/hc/pt/articles/31119879125645-Registros-DNS-para-hospedagem-na-web">DNS oficial</External>}</p>
    {guide === "buy" && <Modal title="Domínio próprio · guia de compra" close={() => setGuide(null)}><Walkthrough steps={domainBuyGuide} links={<External href="https://domains.squarespace.com/">Consultar no Squarespace</External>} /></Modal>}
    {guide === "dns" && <Modal title="Conectar domínio · guia nas plataformas" close={() => setGuide(null)}><Walkthrough steps={dnsGuide} links={<><External href="https://vercel.com/docs/domains/set-up-custom-domain">Vercel / Domínios</External><External href="https://support.squarespace.com/hc/pt/articles/31119879125645-Registros-DNS-para-hospedagem-na-web">Squarespace / DNS</External></>} /></Modal>}
    {guide === "checklist" && <Modal title={`Revisão de publicação · ${count}/20`} close={() => setGuide(null)} wide><div className="domain-check-modal"><p>Confira cada item no seu site e nas plataformas. O checklist serve à revisão desta aula e não publica, testa ou documenta seu projeto.</p>{checklist(true)}<div className="bonus-toolbar"><span>{count}/20 revisados</span><button className="button primary" disabled={count < 20} onClick={() => { setGuide(null); setFinale(true); }}>Concluir a jornada →</button></div></div></Modal>}
  </div>;
}
