import { useState, useRef } from "react";
import type { Block, BlockType, CadernoPage, DatabaseData } from "../types";
import { BlockItem } from "./BlockItem";
import { SlashMenu } from "./SlashMenu";
import { CoverPicker } from "./CoverPicker";
import { IconPicker } from "./IconPicker";
import { DatabaseView } from "./DatabaseView";

interface DocumentEditorProps {
  page: CadernoPage;
  onUpdatePage: (updated: CadernoPage) => void;
}

export function DocumentEditor({ page, onUpdatePage }: DocumentEditorProps) {
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [slashMenuState, setSlashMenuState] = useState<{
    open: boolean;
    blockId: string;
    query: string;
    position: { top: number; left: number };
  } | null>(null);

  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Manipulação de blocos
  const handleUpdateBlock = (updated: Block) => {
    const nextBlocks = page.blocks.map((b) => (b.id === updated.id ? updated : b));
    onUpdatePage({ ...page, blocks: nextBlocks });
  };

  const handleDeleteBlock = (id: string) => {
    const nextBlocks = page.blocks.filter((b) => b.id !== id);
    onUpdatePage({
      ...page,
      blocks: nextBlocks.length > 0 ? nextBlocks : [{ id: `b-${Date.now()}`, type: "paragraph", content: "" }],
    });
  };

  const handleDuplicateBlock = (id: string) => {
    const idx = page.blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const target = page.blocks[idx];
    const duplicated: Block = {
      ...target,
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    const nextBlocks = [...page.blocks];
    nextBlocks.splice(idx + 1, 0, duplicated);
    onUpdatePage({ ...page, blocks: nextBlocks });
  };

  const handleMoveUp = (id: string) => {
    const idx = page.blocks.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    const nextBlocks = [...page.blocks];
    const temp = nextBlocks[idx];
    nextBlocks[idx] = nextBlocks[idx - 1];
    nextBlocks[idx - 1] = temp;
    onUpdatePage({ ...page, blocks: nextBlocks });
  };

  const handleMoveDown = (id: string) => {
    const idx = page.blocks.findIndex((b) => b.id === id);
    if (idx === -1 || idx >= page.blocks.length - 1) return;
    const nextBlocks = [...page.blocks];
    const temp = nextBlocks[idx];
    nextBlocks[idx] = nextBlocks[idx + 1];
    nextBlocks[idx + 1] = temp;
    onUpdatePage({ ...page, blocks: nextBlocks });
  };

  const handleAddBelow = (id: string, type: BlockType = "paragraph") => {
    const idx = page.blocks.findIndex((b) => b.id === id);
    const newBlock: Block = {
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      content: "",
      checked: false,
    };
    const nextBlocks = [...page.blocks];
    nextBlocks.splice(idx + 1, 0, newBlock);
    onUpdatePage({ ...page, blocks: nextBlocks });
  };

  const handleAddAtBottom = (type: BlockType = "paragraph") => {
    const newBlock: Block = {
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      content: "",
      checked: false,
    };
    onUpdatePage({ ...page, blocks: [...page.blocks, newBlock] });
  };

  // Slash Menu
  const handleOpenSlash = (blockId: string, rect: DOMRect) => {
    setSlashMenuState({
      open: true,
      blockId,
      query: "",
      position: {
        top: rect.bottom + window.scrollY + 6,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - 340),
      },
    });
  };

  const handleSelectSlash = (type: BlockType) => {
    if (!slashMenuState) return;
    const target = page.blocks.find((b) => b.id === slashMenuState.blockId);
    if (target) {
      // Remove o "/" do conteúdo
      const cleaned = target.content.replace(/\/$/, "");
      handleUpdateBlock({
        ...target,
        type,
        content: cleaned,
        checked: false,
        tableData:
          type === "table"
            ? {
                headers: ["Item", "Status", "Notas"],
                rows: [
                  ["", "", ""],
                  ["", "", ""],
                ],
              }
            : undefined,
      });
    }
    setSlashMenuState(null);
  };

  // Atualizar database se a página for base de dados
  const handleUpdateDatabase = (database: DatabaseData) => {
    onUpdatePage({
      ...page,
      database,
    });
  };

  return (
    <div className="caderno-editor-scroll">
      {/* Capa da Página */}
      {page.cover ? (
        <div className="caderno-page-cover" style={{ background: page.cover }}>
          <div className="caderno-cover-hover-controls">
            <button
              type="button"
              className="caderno-cover-ctl-btn"
              onClick={() => setShowCoverPicker(true)}
            >
              Alterar Capa
            </button>
            <button
              type="button"
              className="caderno-cover-ctl-btn"
              onClick={() => onUpdatePage({ ...page, cover: undefined })}
            >
              Remover Capa
            </button>
          </div>
        </div>
      ) : (
        <div className="caderno-cover-placeholder">
          <button
            type="button"
            className="caderno-add-cover-btn"
            onClick={() => setShowCoverPicker(true)}
          >
            + Adicionar Capa
          </button>
        </div>
      )}

      {/* Conteúdo Central */}
      <div className="caderno-editor-content">
        {/* Ícone e Botões Rápidos */}
        <div className="caderno-page-header-meta">
          {page.icon ? (
            <button
              type="button"
              className="caderno-page-icon-btn"
              title="Mudar ícone"
              onClick={() => setShowIconPicker(true)}
            >
              {page.icon}
            </button>
          ) : (
            <button
              type="button"
              className="caderno-add-icon-btn"
              onClick={() => setShowIconPicker(true)}
            >
              + Adicionar Ícone
            </button>
          )}
        </div>

        {/* Título da Página */}
        <div className="caderno-page-title-wrap">
          <textarea
            ref={titleRef}
            rows={1}
            className="caderno-page-title-input"
            value={page.title}
            placeholder="Página Sem Título..."
            onChange={(e) => {
              onUpdatePage({ ...page, title: e.target.value });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (page.blocks.length > 0) {
                  // foca no primeiro bloco
                } else {
                  handleAddAtBottom("paragraph");
                }
              }
            }}
          />
        </div>

        {/* Se for uma base de dados (Grid/Kanban) */}
        {page.isDatabase && page.database ? (
          <DatabaseView
            database={page.database}
            onUpdate={handleUpdateDatabase}
          />
        ) : (
          /* Editor de Blocos do Documento */
          <div className="caderno-blocks-list">
            {page.blocks.map((block, idx) => (
              <BlockItem
                key={block.id}
                block={block}
                index={idx}
                totalBlocks={page.blocks.length}
                onUpdate={handleUpdateBlock}
                onDelete={handleDeleteBlock}
                onDuplicate={handleDuplicateBlock}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onAddBelow={handleAddBelow}
                onOpenSlash={handleOpenSlash}
              />
            ))}

            <button
              type="button"
              className="caderno-add-block-bottom"
              onClick={() => handleAddAtBottom("paragraph")}
            >
              + Clique para adicionar um parágrafo ou digite '/' para comandos
            </button>
          </div>
        )}
      </div>

      {/* Slash Menu Flutuante */}
      {slashMenuState?.open && (
        <div
          style={{
            position: "absolute",
            top: slashMenuState.position.top,
            left: slashMenuState.position.left,
            zIndex: 1000,
          }}
        >
          <SlashMenu
            query={slashMenuState.query}
            onSelect={handleSelectSlash}
            onClose={() => setSlashMenuState(null)}
          />
        </div>
      )}

      {/* Modal de Capa */}
      {showCoverPicker && (
        <CoverPicker
          currentCover={page.cover}
          onSelect={(cover) => onUpdatePage({ ...page, cover })}
          onClose={() => setShowCoverPicker(false)}
        />
      )}

      {/* Modal de Ícone */}
      {showIconPicker && (
        <IconPicker
          onSelect={(icon) => onUpdatePage({ ...page, icon })}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  );
}
