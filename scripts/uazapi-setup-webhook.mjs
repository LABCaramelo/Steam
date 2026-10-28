// Consulta e configura o Webhook da UAZAPI para a automação de boas-vindas do LAB.
// Uso:
//   node --env-file=.env scripts/uazapi-setup-webhook.mjs              (consulta webhook atual)
//   node --env-file=.env scripts/uazapi-setup-webhook.mjs --set [url]  (configura o webhook)

const url = (process.env.UAZAPI_URL || "").replace(/\/+$/, "");
const token = process.env.UAZAPI_TOKEN;

if (!url || !token) {
  console.error("❌ Preencha UAZAPI_URL e UAZAPI_TOKEN no arquivo .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const setIndex = args.indexOf("--set");
const defaultWebhookUrl = "https://www.umcaracaramelo.com.br/api/whatsapp-webhook";
const webhookUrlToSet = setIndex !== -1 ? (args[setIndex + 1] || defaultWebhookUrl) : null;

console.log("==================================================================");
console.log("🐕 UAZAPI · CONFIGURAÇÃO DO WEBHOOK DO LAB");
console.log(`Instância URL: ${url}`);
console.log("==================================================================\n");

if (webhookUrlToSet) {
  console.log(`Configurando webhook para: ${webhookUrlToSet}`);
  console.log(`Eventos monitorados: ["groups", "messages"]...\n`);

  const payload = {
    enabled: true,
    url: webhookUrlToSet,
    events: ["groups"],
  };

  try {
    const res = await fetch(`${url}/webhook`, {
      method: "POST",
      headers: { token, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`❌ UAZAPI retornou status ${res.status}: ${await res.text()}`);
    } else {
      const data = await res.json();
      console.log("✅ Webhook configurado com sucesso na UAZAPI!");
      console.log("Resposta:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("❌ Erro ao enviar requisição:", err.message);
  }
} else {
  console.log("Consultando configuração atual do webhook na UAZAPI...\n");
  try {
    let res = await fetch(`${url}/webhook`, {
      method: "GET",
      headers: { token, Accept: "application/json" },
    });

    if (res.status === 404 || res.status === 405) {
      res = await fetch(`${url}/webhook/find`, {
        method: "POST",
        headers: { token, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({}),
      });
    }

    if (!res.ok) {
      console.log(`ℹ️ Resposta da UAZAPI (${res.status}): ${await res.text()}`);
      console.log("\nPara configurar o webhook agora, execute:");
      console.log(`  node --env-file=.env scripts/uazapi-setup-webhook.mjs --set ${defaultWebhookUrl}`);
    } else {
      const data = await res.json();
      console.log("Configuração atual do Webhook:");
      console.log(JSON.stringify(data, null, 2));
      console.log("\nPara atualizar a URL do webhook, execute:");
      console.log(`  node --env-file=.env scripts/uazapi-setup-webhook.mjs --set https://seu-dominio.com/api/whatsapp-webhook`);
    }
  } catch (err) {
    console.error("❌ Erro na consulta:", err.message);
  }
}
