import { Isotype, MagneticButton } from "@caramelo/design-system";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner, pickTextFile, useToast, useToolUser } from "../shared/kit";
import { IconBoard, IconUpload } from "../shared/icons";
import { BoardScreen } from "./BoardScreen";
import { positionBetween, type KanbanRepo } from "./repo";
import { ROUTINE_KEY, ROUTINE_TEMPLATE, contentFromFile, parseBoardFile } from "./template";
import type { Board, BoardFile } from "./types";

const lastBoardKey = (userId: string) => `lab:kanban:board:${userId}`;

export interface BoardsApi {
  boards: Board[];
  saving: boolean;
  create: (file: BoardFile, template?: string | null) => Promise<Board | null>;
  update: (id: string, patch: Partial<Pick<Board, "name" | "description" | "background" | "starred" | "position">>) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  open: (id: string) => void;
}

/** The person's boards. The first visit offers the Rotina Superprodutiva template or a blank board. */
export function KanbanApp({ repo }: { repo: KanbanRepo }) {
  const user = useToolUser();
  const toast = useToast();
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(lastBoardKey(user.id));
    } catch {
      return null;
    }
  });
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const updates = useRef<Promise<unknown>>(Promise.resolve());
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [updating, setUpdating] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadError(false);
    repo
      .listBoards()
      .then((rows) => { if (alive) setBoards(rows); })
      .catch(() => {
        if (alive) setLoadError(true);
      });
    return () => { alive = false; };
  }, [repo, attempt]);

  const open = useCallback(
    (id: string) => {
      setCurrentId(id);
      try {
        localStorage.setItem(lastBoardKey(user.id), id);
      } catch {
        // storage blocked: the first board opens next time
      }
    },
    [user.id],
  );

  const create = async (file: BoardFile, template: string | null = null) => {
    if (creatingRef.current) return null;
    creatingRef.current = true;
    setCreating(true);
    let createdId: string | null = null;
    try {
      const id = crypto.randomUUID();
      const board = await repo.createBoard({
        id,
        name: file.name.slice(0, 120) || "Novo quadro",
        description: file.description,
        background: file.background,
        template,
        position: positionBetween(boards?.at(-1)?.position),
      });
      createdId = id;
      await repo.insertContent(contentFromFile(id, file));
      setBoards((list) => [...(list ?? []), board]);
      open(id);
      return board;
    } catch {
      let cleaned = true;
      if (createdId) {
        try { await repo.deleteBoard(createdId); }
        catch { cleaned = false; }
      }
      toast(cleaned ? "Não foi possível criar o quadro. Nenhum quadro incompleto foi mantido." : "A criação falhou e o quadro parcial não pôde ser removido. Recarregue a página para revisá-lo.", "error");
      return null;
    } finally {
      setCreating(false);
      creatingRef.current = false;
    }
  };

  const update: BoardsApi["update"] = (id, patch) => {
    setUpdating((count) => count + 1);
    const job = updates.current.then(async () => {
      try {
        await repo.updateBoard(id, patch);
        setBoards((list) => list?.map((board) => board.id === id ? { ...board, ...patch, updated_at: new Date().toISOString() } : board).sort((a, b) => a.position - b.position) ?? null);
        return true;
      } catch {
        toast("Não foi possível salvar o quadro. A alteração não foi aplicada.", "error");
        return false;
      } finally {
        setUpdating((count) => count - 1);
      }
    });
    updates.current = job;
    return job;
  };

  const remove = async (id: string) => {
    await updates.current;
    await repo.deleteBoard(id);
    setBoards((list) => list?.filter((b) => b.id !== id) ?? null);
    if (currentId === id) setCurrentId(null);
  };

  const importFile = async () => {
    const picked = await pickTextFile(".json,application/json");
    if (!picked) return;
    try {
      const file = parseBoardFile(picked.text);
      const board = await create(file);
      if (board) toast(`Quadro "${board.name}" importado.`, "success");
    } catch {
      toast("O arquivo escolhido não é um quadro válido.", "error");
    }
  };

  if (loadError) return (
    <div className="tk-empty" role="alert">
      <h2>Seus quadros não carregaram</h2>
      <p>Confira a conexão e o acesso ao banco do Kanban. Seus dados foram preservados.</p>
      <button className="cm-btn cm-btn--accent" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</button>
    </div>
  );

  if (!boards) {
    return (
      <div className="tk-loading" role="status">
        <Spinner /> Carregando seus quadros…
      </div>
    );
  }

  const current = boards.find((b) => b.id === currentId) ?? boards[0];
  const api: BoardsApi = { boards, saving: creating || updating > 0, create, update, remove, open };

  if (!current) {
    return (
      <main className="kb-welcome">
        <div className="kb-welcome__card cm-surface cm-surface--spotlight">
          <Isotype size={52} decorative interactive />
          <span className="tk-eyebrow">KANBAN · LAB</span>
          <h1 className="kb-welcome__title">Organize a sua semana.</h1>
          <p className="kb-welcome__lead">
            Comece pelo template <b>Rotina Superprodutiva</b>, com blocos de horário de segunda a domingo, ou monte um quadro do zero. Tudo fica salvo no seu banco do
            Kanban, só para você.
          </p>
          <div className="kb-welcome__actions">
            <MagneticButton variant="accent" size="lg" disabled={creating} onClick={() => create(ROUTINE_TEMPLATE, ROUTINE_KEY)}>
              {creating ? "Criando…" : "Usar o template"}
            </MagneticButton>
            <button className="cm-btn" disabled={creating} onClick={() => create(blankBoard())}>
              <IconBoard /> Quadro em branco
            </button>
            <button className="cm-btn cm-btn--ghost" disabled={creating} onClick={importFile}>
              <IconUpload /> Importar JSON
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <BoardScreen key={current.id} repo={repo} board={current} boards={api} onImport={importFile} creating={creating} />;
}

export function blankBoard(name = "Novo quadro"): BoardFile {
  return {
    format: "lab-kanban",
    version: 1,
    name,
    description: "",
    background: "stage",
    labels: [
      { key: "prioridade", name: "Prioridade", color: "caramel" },
      { key: "ideia", name: "Ideia", color: "sky" },
      { key: "bloqueado", name: "Bloqueado", color: "danger" },
    ],
    lists: [
      { name: "A fazer", banner: false, cards: [] },
      { name: "Fazendo", banner: false, cards: [] },
      { name: "Feito", banner: false, cards: [] },
    ],
  };
}
