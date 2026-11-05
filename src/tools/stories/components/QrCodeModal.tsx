import { useState, useEffect } from "react";
import { X, Copy, Check, Smartphone, Wifi } from "lucide-react";
import QRCode from "qrcode";

interface QrCodeModalProps {
  onClose: () => void;
}

export function QrCodeModal({ onClose }: QrCodeModalProps) {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Local IP address detected
  const localIp = "192.168.100.11";
  const port = window.location.port || "5180";
  const mobileNetworkUrl = `http://${localIp}:${port}/tools/stories`;

  useEffect(() => {
    QRCode.toDataURL(mobileNetworkUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: "#101014",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error("Erro ao gerar QR Code:", err));
  }, [mobileNetworkUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileNetworkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="stories-drawer-overlay" onClick={onClose}>
      <div className="qrcode-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Smartphone size={24} color="#25BFFF" />
            <h2>Acessar pelo Celular (Wi-Fi)</h2>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="qrcode-modal__body">
          <p className="qrcode-instruction">
            Aponte a câmera do seu celular para o QR Code abaixo para abrir o Stories Maker diretamente no seu smartphone:
          </p>

          <div className="qrcode-box">
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code para acesso mobile" className="qrcode-img" />
            ) : (
              <div className="qrcode-placeholder">Gerando QR Code...</div>
            )}
          </div>

          <div className="network-link-box">
            <span className="network-link-text">{mobileNetworkUrl}</span>
            <button
              type="button"
              className="network-copy-btn"
              onClick={handleCopy}
              title="Copiar Link"
            >
              {copied ? <Check size={18} color="#25BFFF" /> : <Copy size={18} />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>

          <div className="mobile-tips-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FF701A" }}>
              <Wifi size={18} />
              <strong>Dicas de Uso no Celular:</strong>
            </div>
            <ul>
              <li>Certifique-se de que o celular está conectado na mesma rede Wi-Fi do computador.</li>
              <li>A interface foi 100% projetada para toques, gestos e formato nativo 9:16 de tela cheia.</li>
              <li>Ao exportar no celular, o arquivo pode ser salvo diretamente no Rolo da Câmera ou compartilhado no Instagram.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
