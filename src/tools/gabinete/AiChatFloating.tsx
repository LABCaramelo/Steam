import React, { useState } from "react";
import { IconMessageSquare, IconZap } from "./Icons";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
}

export const AiChatFloating: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      sender: "ai",
      text: "Olá, Luiz! Sou a inteligência de bastidor do Gabinete. O que vamos destravar hoje? Pode me pedir ganchos para carrosséis, roteiros de Reels no formato 5 passos ou revisão de copies.",
      time: "Agora",
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: "u-" + Date.now(),
      sender: "user",
      text: input,
      time: new Date().toLocaleTimeString().slice(0, 5),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");

    setTimeout(() => {
      let reply = "Entendido! Vamos estruturar isso com o rigor do Cérebro Caramelo. Lembre-se: 'Menos ferramenta. Mais sistema.' e 'Conteúdo não começa no post.'";

      if (currentInput.toLowerCase().includes("gancho") || currentInput.toLowerCase().includes("reels")) {
        reply = "Para esse tema, use a fórmula do Conflito & Mudança: Comece quebrando o senso comum no primeiro segundo (ex: 'Pare de fazer X achando que vai ter Y'). Em seguida, mostre a cena real e contraste com a solução canônica.";
      } else if (currentInput.toLowerCase().includes("carrossel")) {
        reply = "No Método HEAD: Lâmina 1 é Atenção pura (contraste visual + verbal). Lâminas 2 a 4 são Retenção em camadas sem texto denso. Lâmina final é o Toque com CTA protagonista para ManyChat ou salvamento.";
      } else if (currentInput.toLowerCase().includes("cliente") || currentInput.toLowerCase().includes("preço")) {
        reply = "Para precificação de Head de Conteúdo: separe a estratégia da execução operacional. O valor de referência para agências no plano Pro começa em R$ 3.500/mês por cliente com entregas fechadas de 8 a 12 peças.";
      }

      const aiMsg: Message = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: reply,
        time: new Date().toLocaleTimeString().slice(0, 5),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        className="mc-floating-chat"
        onClick={() => setIsOpen(!isOpen)}
        title="Inteligência do Gabinete"
      >
        <IconMessageSquare size={20} />
      </button>

      {/* Janela do Chat */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 360,
            height: 480,
            background: "var(--mc-ink-surface)",
            border: "1px solid var(--mc-ink-border)",
            borderRadius: "var(--mc-radius-lg)",
            display: "flex",
            flexDirection: "column",
            boxShadow: "var(--mc-shadow-lg)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              background: "var(--mc-sidebar-bg)",
              borderBottom: "1px solid var(--mc-ink-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconZap size={18} color="var(--mc-caramel)" />
              <div>
                <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--mc-text-title)" }}>
                  Gabinete IA
                </h4>
                <span style={{ fontSize: 10.5, color: "var(--mc-mint)", fontWeight: 600 }}>● Online no LAB</span>
              </div>
            </div>
            <button
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16 }}
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.sender === "user" ? "var(--mc-caramel)" : "var(--mc-ink)",
                  color: m.sender === "user" ? "#ffffff" : "var(--mc-text-title)",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  border: m.sender === "user" ? "none" : "1px solid var(--mc-ink-border)",
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{
              padding: "10px 12px",
              background: "var(--mc-ink)",
              borderTop: "1px solid var(--mc-ink-border)",
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type="text"
              placeholder="Pergunte ao Cérebro Caramelo..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff4e8",
                fontSize: 12.5,
              }}
            />
            <button
              type="submit"
              style={{
                background: "var(--mc-acid)",
                border: "none",
                borderRadius: 6,
                padding: "6px 10px",
                color: "#101014",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
};
