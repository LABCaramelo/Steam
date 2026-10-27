import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public', 'tools');

const escapeXml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const tools = [
  { slug: 'kanban', name: 'Kanban', number: '02', accent: '#FF701A', category: 'ORGANIZAÇÃO / ROTINA', lines: ['Uma semana.', 'Um quadro.'] },
  { slug: 'prancheta', name: 'Prancheta', number: '03', accent: '#25BFFF', category: 'DESIGN / CANVAS', lines: ['Da ideia', 'à tela final.'] },
  { slug: 'automation', name: 'Automation', number: '04', accent: '#FF3D8D', category: 'FLUXOS / CONEXÕES', lines: ['Conecte.', 'Experimente.'] },
  { slug: 'academy', name: 'Academy', number: '05', accent: '#FF701A', category: 'FORMAÇÃO / LAB', lines: ['Aprenda.', 'Coloque em ação.'] },
  { slug: 'claquete', name: 'Claquete', number: '06', accent: '#FFD52A', category: 'CINEMA / VÍDEO & IA', lines: ['Do roteiro', 'ao corte final.'] },
  { slug: 'comunidade', name: 'Comunidade', number: '07', accent: '#7657FF', category: 'COMUNICAÇÃO / LAB', lines: ['Voz, canais', 'e conexões.'] },
  { slug: 'creative-os', name: 'Creative OS', number: '11', accent: '#FF701A', category: 'OPERAÇÕES & ESTRATÉGIA', lines: ['Menos ferramenta.', 'Mais sistema.'] },
];

const motif = (slug, color) => {
  if (slug === 'creative-os') {
    return `<g transform="translate(10, 15)">
      <rect x="25" y="30" width="390" height="250" rx="16" fill="#18181D" stroke="#FFF4E8" stroke-opacity=".15" stroke-width="3"/>
      <rect x="50" y="55" width="120" height="26" rx="8" fill="${color}" fill-opacity=".2"/>
      <circle cx="65" cy="68" r="6" fill="${color}"/>
      <text x="80" y="73" fill="${color}" font-size="12" font-weight="900">WORKSPACE</text>
      <rect x="50" y="100" width="155" height="70" rx="10" fill="#101014" stroke="#FFF4E8" stroke-opacity=".1" stroke-width="2"/>
      <rect x="65" y="115" width="70" height="10" rx="5" fill="${color}"/>
      <rect x="65" y="135" width="120" height="8" rx="4" fill="#FFF4E8" fill-opacity=".5"/>
      <rect x="65" y="150" width="90" height="8" rx="4" fill="#FFF4E8" fill-opacity=".3"/>
      <rect x="225" y="100" width="165" height="70" rx="10" fill="#101014" stroke="${color}" stroke-opacity=".4" stroke-width="2"/>
      <circle cx="245" cy="120" r="8" fill="#25BFFF"/>
      <text x="262" y="125" fill="#FFF4E8" font-size="12" font-weight="800">APROVAÇÃO</text>
      <rect x="245" y="140" width="125" height="18" rx="6" fill="${color}"/>
      <text x="307" y="153" fill="#101014" font-size="11" font-weight="900" text-anchor="middle">APROVADO ✓</text>
      <rect x="50" y="190" width="340" height="70" rx="10" fill="#101014" stroke="#FFF4E8" stroke-opacity=".1" stroke-width="2"/>
      <circle cx="75" cy="225" r="14" fill="${color}"/>
      <path d="M69 225l4 4 8-9" stroke="#101014" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="105" y="215" width="160" height="10" rx="5" fill="#FFF4E8" fill-opacity=".8"/>
      <rect x="105" y="232" width="100" height="8" rx="4" fill="#FFF4E8" fill-opacity=".4"/>
      <rect x="290" y="212" width="80" height="26" rx="6" fill="#25BFFF" fill-opacity=".18"/>
      <text x="330" y="229" fill="#25BFFF" font-size="11" font-weight="800" text-anchor="middle">REVISÃO</text>
    </g>`;
  }
  if (slug === 'comunidade') return `<g transform="translate(10, 20)"><rect x="30" y="40" width="380" height="230" rx="16" fill="#18181D" stroke="#FFF4E8" stroke-opacity=".15" stroke-width="3"/><rect x="60" y="70" width="160" height="24" rx="12" fill="${color}" fill-opacity=".2"/><circle cx="75" cy="82" r="6" fill="${color}"/><text x="92" y="86" fill="${color}" font-size="12" font-weight="800"># lounge-voz</text><g fill="${color}">${[140, 180, 220, 260, 300, 340].map((x, i) => `<rect x="${x}" y="${140 - [20, 45, 70, 35, 55, 15][i]}" width="16" height="${[40, 90, 140, 70, 110, 30][i]}" rx="8"/>`).join('')}</g><circle cx="90" cy="180" r="32" fill="#25BFFF"/><circle cx="90" cy="180" r="14" fill="#101014"/><rect x="50" y="290" width="340" height="60" rx="14" fill="#101014" stroke="${color}" stroke-width="3"/><circle cx="80" cy="320" r="14" fill="${color}"/><rect x="110" y="314" width="180" height="12" rx="6" fill="#FFF4E8" fill-opacity=".7"/></g>`;
  if (slug === 'kanban') return `<g fill="#18181d" stroke="#FFF4E8" stroke-opacity=".2">${[0, 1, 2].map((i) => `<rect x="${i * 148}" y="${i * 12}" width="130" height="320" rx="12"/><rect x="${i * 148 + 14}" y="${i * 12 + 20}" width="64" height="7" rx="3" fill="${color}" stroke="none"/>${[0, 1, 2].slice(0, 3 - i).map((j) => `<rect x="${i * 148 + 12}" y="${i * 12 + 54 + j * 76}" width="106" height="62" rx="7" fill="#FFF4E8" stroke="none"/><path d="M${i * 148 + 24} ${i * 12 + 75 + j * 76}h58m-58 13h38" stroke="#101014" stroke-opacity=".5" stroke-width="4"/>`).join('')}`).join('')}</g>`;
  if (slug === 'prancheta') return `<path d="M30 40H430V350H30Z" fill="#FFF4E8"/><path d="M64 78h332v230H64Z" fill="#101014"/><circle cx="174" cy="195" r="67" fill="${color}"/><path d="m214 260 74-139 74 139Z" fill="#FFF4E8"/><path d="M30 40H430V350H30Z" fill="none" stroke="${color}" stroke-width="4"/>${[[30,40],[430,40],[30,350],[430,350]].map(([x,y]) => `<rect x="${x-7}" y="${y-7}" width="14" height="14" fill="#101014" stroke="${color}" stroke-width="3"/>`).join('')}<path d="m350 285 24 66 11-23 25-8Z" fill="${color}" stroke="#101014" stroke-width="4"/>`;
  if (slug === 'automation') return `<g fill="none" stroke="${color}" stroke-width="5"><path d="M100 200H200Q225 200 225 120V95H340M225 200v80q0 25 30 25h85" stroke-dasharray="9 8"/></g><g fill="#FFF4E8">${[[20,150],[310,45],[310,255]].map(([x,y],i)=>`<rect x="${x}" y="${y}" width="110" height="100" rx="18"/><text x="${x+55}" y="${y+64}" fill="#101014" text-anchor="middle" font-size="48" font-weight="800">${['↗','＋','✓'][i]}</text>`).join('')}</g><circle cx="225" cy="200" r="24" fill="${color}"/><circle cx="225" cy="200" r="9" fill="#101014"/>`;
  if (slug === 'claquete') return `<g transform="rotate(-4 220 200)"><clipPath id="clap-top"><rect x="35" y="35" width="370" height="65" rx="8"/></clipPath><g clip-path="url(#clap-top)"><rect x="35" y="35" width="370" height="65" fill="#101014"/><path d="M70 35l-25 65m75-65l-25 65m75-65l-25 65m75-65l-25 65m75-65l-25 65" stroke="${color}" stroke-width="14"/></g><rect x="35" y="35" width="370" height="65" rx="8" fill="none" stroke="${color}" stroke-width="4"/><circle cx="52" cy="104" r="7" fill="#FFF4E8" stroke="#101014" stroke-width="3"/><rect x="35" y="115" width="370" height="235" rx="12" fill="#18181d" stroke="#FFF4E8" stroke-opacity=".2" stroke-width="3"/><rect x="55" y="135" width="330" height="145" rx="8" fill="#101014"/><path d="M67 155v-8h12M373 155v-8h-12M67 260v8h12M373 260v8h-12" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="75" cy="162" r="4.5" fill="#FF3D8D"/><text x="86" y="166" fill="#FFF4E8" font-size="10" font-weight="800" letter-spacing="1">REC 24FPS</text><circle cx="220" cy="208" r="40" fill="${color}" fill-opacity=".2" stroke="${color}" stroke-width="3"/><polygon points="213,194 235,208 213,222" fill="${color}"/><g fill="#FFF4E8" fill-opacity=".7" font-size="13" font-weight="700"><rect x="55" y="295" width="95" height="34" rx="6" fill="#FFF4E8" fill-opacity=".12"/><text x="102" y="316" text-anchor="middle" dominant-baseline="middle">CENA 01</text><rect x="160" y="295" width="95" height="34" rx="6" fill="#FFF4E8" fill-opacity=".12"/><text x="207" y="316" text-anchor="middle" dominant-baseline="middle">TAKE 01</text><rect x="265" y="295" width="120" height="34" rx="6" fill="${color}"/><text x="325" y="316" fill="#101014" font-weight="900" text-anchor="middle" dominant-baseline="middle">AÇÃO 4K</text></g></g>`;
  return `<g transform="rotate(-6 230 190)"><rect x="24" y="40" width="420" height="280" rx="12" fill="#FFF4E8"/><rect x="40" y="56" width="388" height="218" rx="6" fill="#101014"/><circle cx="234" cy="165" r="60" fill="${color}"/><path d="m219 133 47 32-47 32Z" fill="#101014"/><path d="M48 297H230" stroke="#101014" stroke-width="6"/><path d="M48 297H156" stroke="${color}" stroke-width="6"/></g><g fill="#FFF4E8" fill-opacity=".55"><rect x="60" y="360" width="250" height="8" rx="4"/><rect x="60" y="385" width="170" height="8" rx="4"/></g>`;
};

const svg = (tool, kind) => {
  const [w, h] = ({ hero: [1920, 620], header: [920, 430], capsule: [600, 900], icon: [64, 64] })[kind];
  const safeTitle = escapeXml(`${tool.name} — Um Cara Caramelo`);
  const safeDesc = escapeXml(`${tool.category}. ${tool.lines.join(' ')}`);
  const safeName = escapeXml(tool.name);
  const safeCategory = escapeXml(tool.category);
  const safeLine0 = escapeXml(tool.lines[0]);
  const safeLine1 = escapeXml(tool.lines[1]);

  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${safeTitle}</title><desc id="desc">${safeDesc}</desc><defs><pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#FFF4E8" opacity=".07"/></pattern></defs><rect width="${w}" height="${h}" fill="#101014"/>`;
  if (kind === 'icon') return `${head}<rect x="4" y="4" width="56" height="56" rx="12" fill="${tool.accent}"/><text x="32" y="44" fill="#101014" text-anchor="middle" font-family="Arial,sans-serif" font-size="37" font-weight="900">${safeName[0]}</text></svg>`;

  const capsule = kind === 'capsule';
  const hero = kind === 'hero';
  const x = hero ? 110 : capsule ? 44 : 44;
  const nameSize = hero ? 112 : capsule ? (tool.name.length > 8 ? 58 : 72) : (tool.name.length > 8 ? 58 : 70);
  const nameY = hero ? 260 : capsule ? 172 : 160;
  const mx = hero ? 1160 : capsule ? 55 : 510;
  const my = hero ? 80 : capsule ? 340 : 58;
  const scale = hero ? 1.15 : capsule ? 1.03 : 0.8;

  return `${head}<rect width="${w}" height="${h}" fill="url(#dots)"/><path d="M${w * 0.76} 0H${w}V${h}H${w * 0.95}Z" fill="${tool.accent}" fill-opacity=".1"/><path d="M${x} ${capsule ? 245 : hero ? 392 : 240}H${hero ? 1020 : capsule ? 555 : 435}" stroke="#FFF4E8" stroke-opacity=".18"/><g font-family="Arial,Helvetica,sans-serif"><text x="${x}" y="${capsule ? 70 : hero ? 90 : 55}" fill="${tool.accent}" font-size="${hero ? 18 : 11}" font-weight="700" letter-spacing="3">LAB / ${tool.number}</text><text x="${x - 4}" y="${nameY}" fill="#FFF4E8" font-size="${nameSize}" font-weight="900" letter-spacing="-3">${safeName}<tspan fill="${tool.accent}">.</tspan></text><text x="${x}" y="${nameY + 50}" fill="#FFF4E8" fill-opacity=".6" font-size="${hero ? 19 : 11}" letter-spacing="2">${safeCategory}</text><g transform="translate(${mx} ${my}) scale(${scale})">${motif(tool.slug, tool.accent)}</g><text x="${x}" y="${capsule ? 790 : hero ? 485 : 310}" fill="#FFF4E8" font-size="${capsule ? 31 : hero ? 36 : 22}" font-weight="800" letter-spacing="-.7">${safeLine0}</text><text x="${x}" y="${capsule ? 830 : hero ? 530 : 340}" fill="${tool.accent}" font-size="${capsule ? 31 : hero ? 36 : 22}" font-weight="800" letter-spacing="-.7">${safeLine1}</text><text x="${x}" y="${h - 25}" fill="#FFF4E8" fill-opacity=".38" font-size="${hero ? 11 : 9}" font-weight="700" letter-spacing="2">UM CARA CARAMELO®</text></g></svg>\n`;
};

for (const tool of tools) {
  const dir = path.join(root, tool.slug, 'art');
  fs.mkdirSync(dir, { recursive: true });
  for (const kind of ['hero', 'capsule', 'header', 'icon']) {
    fs.writeFileSync(path.join(dir, `${kind}.svg`), svg(tool, kind));
  }
}
console.log('Artes SVG das ferramentas atualizadas com sucesso.');
