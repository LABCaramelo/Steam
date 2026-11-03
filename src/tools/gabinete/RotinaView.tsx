import React, { useState, useEffect } from "react";
import type { RoutineTask, Workspace } from "./types";
import type { GabineteRepository } from "./repo";
import { IconCamera, IconTrash } from "./Icons";

interface Props {
  workspace: Workspace;
  repo: GabineteRepository;
}

export const RotinaView: React.FC<Props> = ({ workspace, repo }) => {
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [note, setNote] = useState("");
  const [stories, setStories] = useState<number[]>([3]);
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2026);
  const [_loading, setLoading] = useState(true);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const loadData = async () => {
    try {
      const [tList, nText, sList] = await Promise.all([
        repo.getRoutineTasks(workspace.id),
        repo.getRoutineNote(workspace.id),
        repo.getRoutineStories(workspace.id, month, year),
      ]);
      setTasks(tList);
      setNote(nText);
      setStories(sList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspace.id, month, year]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await repo.addRoutineTask({ workspace_id: workspace.id, title: newTaskTitle.trim() });
    setNewTaskTitle("");
    loadData();
  };

  const handleToggleDay = async (task: RoutineTask, dayKey: keyof RoutineTask["days"]) => {
    const updatedDays = { ...task.days, [dayKey]: !task.days[dayKey] };
    await repo.updateRoutineTask(task.id, { days: updatedDays });
    loadData();
  };

  const handleDeleteTask = async (id: string) => {
    await repo.deleteRoutineTask(id);
    loadData();
  };

  const handleSaveNote = async (val: string) => {
    setNote(val);
    await repo.saveRoutineNote(workspace.id, val);
  };

  const handleToggleStoryDay = async (day: number) => {
    const updated = await repo.toggleRoutineStory(workspace.id, day, month, year);
    setStories(updated);
  };

  // Calendar calculations for November 2026: Nov 1, 2026 is Sunday (day 0)
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayIndex = new Date(year, month - 1, 1).getDay();

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px" }}>
      {/* Header com Tag ESCALA */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: "rgba(255,244,232,0.4)" }}>#</span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,244,232,0.5)" }}>
            ESCALA
          </span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px 0", color: "#fff4e8" }}>
          Rotina
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,244,232,0.6)" }}>
          Tabela semanal de tarefas recorrentes da equipe.
        </p>
      </div>

      {/* Tabela Semanal de Rotina */}
      <div
        style={{
          background: "#14141c",
          border: "1px solid rgba(255,244,232,0.08)",
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2.5fr repeat(6, 1fr) 50px",
            background: "#181824",
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,244,232,0.08)",
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: "rgba(255,244,232,0.6)",
            textTransform: "uppercase",
            alignItems: "center",
          }}
        >
          <div>TAREFA</div>
          <div style={{ textAlign: "center" }}>SEGUNDA</div>
          <div style={{ textAlign: "center" }}>TERÇA</div>
          <div style={{ textAlign: "center" }}>QUARTA</div>
          <div style={{ textAlign: "center" }}>QUINTA</div>
          <div style={{ textAlign: "center" }}>SEXTA</div>
          <div style={{ textAlign: "center" }}>SÁBADO</div>
          <div></div>
        </div>

        {/* Linhas de Tarefas */}
        {tasks.length === 0 ? (
          <div
            style={{
              padding: "36px 16px",
              textAlign: "center",
              color: "rgba(255,244,232,0.4)",
              fontSize: 13,
            }}
          >
            Nenhuma tarefa cadastrada — adicione uma abaixo.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2.5fr repeat(6, 1fr) 50px",
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,244,232,0.04)",
                alignItems: "center",
                fontSize: 13,
                color: "#fff4e8",
              }}
            >
              <div style={{ fontWeight: 600 }}>{task.title}</div>
              {(["seg", "ter", "qua", "qui", "sex", "sab"] as const).map((day) => (
                <div key={day} style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleDay(task, day)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      border: task.days[day]
                        ? "1px solid #c8d44e"
                        : "1px solid rgba(255,244,232,0.2)",
                      background: task.days[day] ? "rgba(200, 212, 78, 0.2)" : "transparent",
                      color: "#c8d44e",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {task.days[day] ? "✓" : ""}
                  </button>
                </div>
              ))}
              <div style={{ textAlign: "right" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,244,232,0.3)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                  title="Excluir tarefa"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Input de Adicionar Tarefa */}
        <form
          onSubmit={handleAddTask}
          style={{
            padding: "12px 16px",
            background: "rgba(255,244,232,0.02)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <input
            type="text"
            placeholder="Nova tarefa..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            style={{
              flex: 1,
              background: "#181822",
              border: "1px solid rgba(255,244,232,0.12)",
              borderRadius: 6,
              padding: "8px 12px",
              color: "#fff4e8",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              background: "#c8d44e",
              color: "#101014",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
            }}
          >
            + Adicionar
          </button>
        </form>
      </div>

      {/* Bloco de NOTA */}
      <div style={{ marginBottom: 28 }}>
        <h3
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "rgba(255,244,232,0.6)",
            margin: "0 0 8px 0",
            textTransform: "uppercase",
          }}
        >
          NOTA
        </h3>
        <div
          style={{
            background: "#14141c",
            border: "1px solid rgba(255,244,232,0.08)",
            borderRadius: 8,
            padding: 12,
          }}
        >
          <textarea
            value={note}
            onChange={(e) => handleSaveNote(e.target.value)}
            placeholder="Anotações gerais da rotina semanal, avisos da agência ou prioridades de alinhamento..."
            rows={4}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff4e8",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* STORIES perfil da Luiz */}
      <div
        style={{
          background: "#14141c",
          border: "1px solid rgba(255,244,232,0.08)",
          borderRadius: 8,
          padding: 18,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "rgba(255,244,232,0.6)" }}><IconCamera size={16} /></span>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", color: "#fff4e8" }}>
              STORIES
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,244,232,0.5)" }}>
              perfil da {workspace.name || "Luiz"}
            </span>
          </div>

          {/* Navegador de Mês */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                if (month === 1) {
                  setMonth(12);
                  setYear(year - 1);
                } else {
                  setMonth(month - 1);
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,244,232,0.5)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ‹
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff4e8" }}>
              {monthNames[month - 1]} De {year}
            </span>
            <button
              type="button"
              onClick={() => {
                if (month === 12) {
                  setMonth(1);
                  setYear(year + 1);
                } else {
                  setMonth(month + 1);
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,244,232,0.5)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* Grade do Calendário */}
        <div>
          {/* Cabeçalho dos Dias */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              fontSize: 10,
              fontWeight: 800,
              color: "rgba(255,244,232,0.4)",
              letterSpacing: "0.06em",
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            <div>DOM</div>
            <div>SEG</div>
            <div>TER</div>
            <div>QUA</div>
            <div>QUI</div>
            <div>SEX</div>
            <div>SÁB</div>
          </div>

          {/* Células de Dias */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
            }}
          >
            {/* Espaços vazios antes do dia 1 */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={"empty-" + i} style={{ height: 42 }} />
            ))}

            {/* Dias do mês */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = stories.includes(dayNum);
              return (
                <button
                  key={"day-" + dayNum}
                  type="button"
                  onClick={() => handleToggleStoryDay(dayNum)}
                  style={{
                    height: 42,
                    background: isSelected ? "rgba(200, 212, 78, 0.16)" : "#181822",
                    border: isSelected
                      ? "1px solid rgba(200, 212, 78, 0.5)"
                      : "1px solid rgba(255,244,232,0.04)",
                    borderRadius: 6,
                    color: isSelected ? "#c8d44e" : "#fff4e8",
                    fontWeight: isSelected ? 800 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                  title={isSelected ? "Story planejado / postado" : "Clique para marcar story"}
                >
                  <span>{dayNum}</span>
                  {isSelected && (
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "#c8d44e",
                        marginTop: 2,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
