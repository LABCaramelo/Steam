import { NavLink, useParams } from "react-router-dom";
import { useLibrary } from "../api";
import { ModalWindow, Select, Toggle } from "../components/Modal";
import { formatBytes, formatDate } from "../format";
import { useUi } from "../ui";

// Sections mirror AppProperties.* in the client's route table (/app/:appid/properties/<section>).
const SECTIONS: [string, string][] = [
  ["general", "Geral"],
  ["compatibility", "Compatibilidade"],
  ["updates", "Atualizações"],
  ["localfiles", "Arquivos instalados"],
  ["language", "Idioma"],
  ["betas", "Betas"],
  ["controller", "Controle"],
  ["dlc", "Conteúdo adicional"],
  ["privacy", "Privacidade"],
  ["customization", "Personalização"],
];

export function AppPropertiesModal({ onClose }: { onClose: () => void }) {
  const { appid, section = "general" } = useParams();
  const { app } = useLibrary();
  const ui = useUi();
  const a = app(Number(appid));
  if (!a) return null;

  let body;
  switch (section) {
    case "localfiles":
      body = a.installed ? (
        <>
          <dl className="info-grid">
            <dt>Tamanho no disco</dt>
            <dd>{formatBytes(a.sizeOnDisk)}</dd>
            <dt>Pasta</dt>
            <dd className="mono">
              {a.libraryPath}\steamapps\common\{a.installdir}
            </dd>
            <dt>Build</dt>
            <dd className="mono">{a.buildid}</dd>
            <dt>Atualizado em</dt>
            <dd>{formatDate(a.lastUpdated)}</dd>
          </dl>
          <div className="btn-row">
            <button className="btn" onClick={() => ui.toast("Procurar arquivos: abra a pasta acima no Explorador.")}>
              Procurar…
            </button>
            <button className="btn" onClick={() => ui.toast("A verificação de integridade só existe no cliente real.")}>
              Verificar integridade dos arquivos
            </button>
          </div>
        </>
      ) : (
        <p className="muted">Este jogo não está instalado.</p>
      );
      break;
    case "updates":
      body = (
        <>
          <Select
            label="Atualizações automáticas"
            value="always"
            options={[
              { value: "always", label: "Sempre manter este jogo atualizado" },
              { value: "launch", label: "Só atualizar ao iniciar" },
              { value: "priority", label: "Alta prioridade" },
            ]}
            onChange={() => ui.toast("Preferência salva só nesta sessão.")}
          />
          <Toggle label="Permitir downloads em segundo plano" checked onChange={() => ui.toast("Preferência salva só nesta sessão.")} />
        </>
      );
      break;
    case "general":
      body = (
        <>
          <dl className="info-grid">
            <dt>Nome</dt>
            <dd>{a.name}</dd>
            <dt>ID do app</dt>
            <dd className="mono">{a.appid}</dd>
            <dt>Desenvolvedor</dt>
            <dd>{a.developer ?? "—"}</dd>
          </dl>
          <Toggle label="Ativar a sobreposição Steam durante o jogo" checked onChange={() => ui.toast("Preferência salva só nesta sessão.")} />
          <label className="field field--column">
            <div className="field__label">Opções de inicialização</div>
            <input className="input mono" placeholder="ex.: -novid -console" />
          </label>
        </>
      );
      break;
    default:
      body = <p className="muted">As opções desta seção dependem do cliente real.</p>;
  }

  return (
    <ModalWindow
      title={a.name}
      onClose={onClose}
      nav={SECTIONS.map(([slug, label]) => (
        <NavLink key={slug} to={`/app/${a.appid}/properties/${slug}`} replace className={({ isActive }) => (isActive ? "is-active" : "")}>
          {label}
        </NavLink>
      ))}
    >
      <div className="settings-page">
        <h2 className="settings-page__title">{SECTIONS.find(([s]) => s === section)?.[1] ?? "Propriedades"}</h2>
        {body}
      </div>
    </ModalWindow>
  );
}
