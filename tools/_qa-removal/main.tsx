import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router-dom";
import { RemoveToolButton } from "./Removal";
import { allowRemoval, useFixture } from "./fixture";
import { PRANCHETA_APP } from "../../src/toolCatalog";
import "@caramelo/design-system/styles.css";
import "../../src/styles.css";
function TestPage() {
  const state=useFixture(); const location=useLocation();
  return <main style={{padding:40,maxWidth:900,margin:"auto"}}>
    <h1>Biblioteca — conferência local</h1><p>Dados fictícios. Nenhuma operação acessa o banco de produção.</p>
    <p>Rota: {location.pathname}</p><p>Chamadas: {state.calls}</p>
    <p>{state.owned ? "Prancheta na biblioteca · 3 arquivos de teste" : "Ferramenta removida · 0 arquivos de teste"}</p>
    <button className="btn" onClick={allowRemoval}>Permitir remoção de teste</button>
    {state.owned && <RemoveToolButton app={PRANCHETA_APP}/>}
    <p role="status">{state.toast}</p>
  </main>;
}
createRoot(document.getElementById("root")!).render(<MemoryRouter initialEntries={["/library/app/3"]}><TestPage/></MemoryRouter>);
