// Script de teste e demonstração da automação de boas-vindas do LAB Caramelo.
// Uso:
//   node scripts/test-whatsapp-welcome.mjs --preview              (visualiza os 6 modelos)
//   node --env-file=.env scripts/test-whatsapp-welcome.mjs --send 5531985869015   (dispara no grupo de teste)

import { WELCOME_TEMPLATES } from "../server/whatsappWelcome.ts";

const args = process.argv.slice(2);
const isPreview = args.includes("--preview") || args.length === 0;
const sendIndex = args.indexOf("--send");
const targetPhone = sendIndex !== -1 ? args[sendIndex + 1] : null;

console.log("==================================================================");
console.log("🐕 LAB CARAMELO · AUTOMAÇÃO DE BOAS-VINDAS NO WHATSAPP (UAZAPI)");
console.log("==================================================================\n");

if (isPreview) {
  console.log(`Foram configurados ${WELCOME_TEMPLATES.length} modelos de mensagem autorais que se revezam:\n`);
  const sampleNumber = "5531985869015";

  WELCOME_TEMPLATES.forEach((tpl, idx) => {
    console.log(`------------------------------------------------------------------`);
    console.log(`[MODELO 0${idx + 1}] ${tpl.title} (ID: ${tpl.id})`);
    console.log(`------------------------------------------------------------------`);
    console.log(tpl.format(sampleNumber));
    console.log("\n");
  });

  console.log("Para disparar um teste real para o grupo configurado no .env, rode:");
  console.log("  node --env-file=.env scripts/test-whatsapp-welcome.mjs --send 5531985869015 [indice_opcional_0_a_5]\n");
}

if (targetPhone) {
  const url = (process.env.UAZAPI_URL || "").replace(/\/+$/, "");
  const token = process.env.UAZAPI_TOKEN;
  const groupJid = process.env.UAZAPI_GROUP_JID;

  if (!url || !token || !groupJid) {
    console.error("❌ Erro: UAZAPI_URL, UAZAPI_TOKEN e UAZAPI_GROUP_JID precisam estar configurados no .env");
    process.exit(1);
  }

  const modelIdx = args[sendIndex + 2] ? parseInt(args[sendIndex + 2], 10) : 0;
  const tpl = WELCOME_TEMPLATES[modelIdx] || WELCOME_TEMPLATES[0];
  const cleanNumber = targetPhone.replace(/\D/g, "");
  const messageText = tpl.format(cleanNumber);

  console.log(`Disparando Modelo [${tpl.id}] para o grupo ${groupJid}...`);
  console.log(`Mencionando: @${cleanNumber}\n`);

  try {
    const res = await fetch(`${url}/send/text`, {
      method: "POST",
      headers: { token, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        number: groupJid,
        text: messageText,
        mentions: cleanNumber,
      }),
    });

    if (!res.ok) {
      console.error(`❌ UAZAPI respondeu status ${res.status}: ${await res.text()}`);
    } else {
      const data = await res.json();
      console.log("✅ Mensagem de boas-vindas enviada com sucesso!");
      console.log("Resposta UAZAPI:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("❌ Falha na conexão com a UAZAPI:", err.message);
  }
}
