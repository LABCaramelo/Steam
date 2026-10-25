/**
 * Caramelo Seed v1: Runtime Passivo de Proveniência e Descoberta (Versão Canônica v1)
 * https://www.umcaracaramelo.com.br/seed/v1/caramelo.js
 *
 * Contrato de Privacidade Estrito:
 * - Zero cookies, zero localStorage, zero sessionStorage, zero tracking de usuário.
 * - Modo CORS com credenciais estritamente omitidas (credentials: 'omit').
 * - Registra exclusivamente a associação entre a Seed do prompt e o domínio público hospedeiro.
 */
(function () {
  try {
    var script = document.currentScript || document.querySelector('script[data-seed]');
    if (!script) return;
    var seed = script.getAttribute('data-seed');
    var domain = window.location.hostname;
    if (!seed || !domain) return;
    
    // Ignora ambientes locais de desenvolvimento
    var d = domain.toLowerCase();
    if (d === 'localhost' || d === '127.0.0.1' || d.endsWith('.local') || d.endsWith('.test')) return;

    // Envio com Content-Type text/plain (CORS simple request) para eliminar preflight OPTIONS
    fetch('https://www.umcaracaramelo.com.br/api/seed/v1/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        seed: String(seed).trim(),
        domain: d
      }),
      mode: 'cors',
      credentials: 'omit',
      keepalive: true
    });
  } catch (e) {}
})();
