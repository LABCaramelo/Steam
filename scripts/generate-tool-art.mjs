import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', 'public', 'tools');
const tools = [
  { slug: 'kanban', name: 'Kanban', number: '02', accent: '#FF701A', category: 'ORGANIZAÇÃO / ROTINA', lines: ['Uma semana.', 'Um quadro.'] },
  { slug: 'prancheta', name: 'Prancheta', number: '03', accent: '#25BFFF', category: 'DESIGN / CANVAS', lines: ['Da ideia', 'à tela final.'] },
  { slug: 'automation', name: 'Automation', number: '04', accent: '#FF3D8D', category: 'FLUXOS / CONEXÕES', lines: ['Conecte.', 'Experimente.'] },
  { slug: 'academy', name: 'Academy', number: '05', accent: '#FF701A', category: 'FORMAÇÃO / LAB', lines: ['Aprenda.', 'Coloque em ação.'] },
];
const motif = (slug, color) => {
  if (slug === 'kanban') return `<g fill="#18181d" stroke="#FFF4E8" stroke-opacity=".2">${[0, 1, 2].map((i) => `<rect x="${i * 148}" y="${i * 12}" width="130" height="320" rx="12"/><rect x="${i * 148 + 14}" y="${i * 12 + 20}" width="64" height="7" rx="3" fill="${color}" stroke="none"/>${[0, 1, 2].slice(0, 3 - i).map((j) => `<rect x="${i * 148 + 12}" y="${i * 12 + 54 + j * 76}" width="106" height="62" rx="7" fill="#FFF4E8" stroke="none"/><path d="M${i * 148 + 24} ${i * 12 + 75 + j * 76}h58m-58 13h38" stroke="#101014" stroke-opacity=".5" stroke-width="4"/>`).join('')}`).join('')}</g>`;
  if (slug === 'prancheta') return `<path d="M30 40H430V350H30Z" fill="#FFF4E8"/><path d="M64 78h332v230H64Z" fill="#101014"/><circle cx="174" cy="195" r="67" fill="${color}"/><path d="m214 260 74-139 74 139Z" fill="#FFF4E8"/><path d="M30 40H430V350H30Z" fill="none" stroke="${color}" stroke-width="4"/>${[[30,40],[430,40],[30,350],[430,350]].map(([x,y]) => `<rect x="${x-7}" y="${y-7}" width="14" height="14" fill="#101014" stroke="${color}" stroke-width="3"/>`).join('')}<path d="m350 285 24 66 11-23 25-8Z" fill="${color}" stroke="#101014" stroke-width="4"/>`;
  if (slug === 'automation') return `<g fill="none" stroke="${color}" stroke-width="5"><path d="M100 200H200Q225 200 225 120V95H340M225 200v80q0 25 30 25h85" stroke-dasharray="9 8"/></g><g fill="#FFF4E8">${[[20,150],[310,45],[310,255]].map(([x,y],i)=>`<rect x="${x}" y="${y}" width="110" height="100" rx="18"/><text x="${x+55}" y="${y+64}" fill="#101014" text-anchor="middle" font-size="48" font-weight="800">${['↗','＋','✓'][i]}</text>`).join('')}</g><circle cx="225" cy="200" r="24" fill="${color}"/><circle cx="225" cy="200" r="9" fill="#101014"/>`;
  return `<g transform="rotate(-6 230 190)"><rect x="24" y="40" width="420" height="280" rx="12" fill="#FFF4E8"/><rect x="40" y="56" width="388" height="218" rx="6" fill="#101014"/><circle cx="234" cy="165" r="60" fill="${color}"/><path d="m219 133 47 32-47 32Z" fill="#101014"/><path d="M48 297H230" stroke="#101014" stroke-width="6"/><path d="M48 297H156" stroke="${color}" stroke-width="6"/></g><g fill="#FFF4E8" fill-opacity=".55"><rect x="60" y="360" width="250" height="8" rx="4"/><rect x="60" y="385" width="170" height="8" rx="4"/></g>`;
};
const svg = (tool, kind) => {
  const [w,h] = ({ hero:[1920,620], header:[920,430], capsule:[600,900], icon:[64,64] })[kind];
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${tool.name} — Um Cara Caramelo</title><desc id="desc">${tool.category}. ${tool.lines.join(' ')}</desc><defs><pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#FFF4E8" opacity=".07"/></pattern></defs><rect width="${w}" height="${h}" fill="#101014"/>`;
  if (kind === 'icon') return `${head}<rect x="4" y="4" width="56" height="56" rx="12" fill="${tool.accent}"/><text x="32" y="44" fill="#101014" text-anchor="middle" font-family="Arial,sans-serif" font-size="37" font-weight="900">${tool.name[0]}</text></svg>`;
  const capsule = kind === 'capsule';
  const hero = kind === 'hero';
  const x = hero ? 110 : capsule ? 44 : 44;
  const nameSize = hero ? 112 : capsule ? tool.name.length > 8 ? 58 : 72 : tool.name.length > 8 ? 58 : 70;
  const nameY = hero ? 260 : capsule ? 172 : 160;
  const mx = hero ? 1160 : capsule ? 55 : 510;
  const my = hero ? 80 : capsule ? 340 : 58;
  const scale = hero ? 1.15 : capsule ? 1.03 : .8;
  return `${head}<rect width="${w}" height="${h}" fill="url(#dots)"/><path d="M${w*.76} 0H${w}V${h}H${w*.95}Z" fill="${tool.accent}" fill-opacity=".1"/><path d="M${x} ${capsule ? 245 : hero ? 392 : 240}H${hero ? 1020 : capsule ? 555 : 435}" stroke="#FFF4E8" stroke-opacity=".18"/><g font-family="Arial,Helvetica,sans-serif"><text x="${x}" y="${capsule ? 70 : hero ? 90 : 55}" fill="${tool.accent}" font-size="${hero ? 18 : 11}" font-weight="700" letter-spacing="3">LAB / ${tool.number}</text><text x="${x-4}" y="${nameY}" fill="#FFF4E8" font-size="${nameSize}" font-weight="900" letter-spacing="-3">${tool.name}<tspan fill="${tool.accent}">.</tspan></text><text x="${x}" y="${nameY+50}" fill="#FFF4E8" fill-opacity=".6" font-size="${hero ? 19 : 11}" letter-spacing="2">${tool.category}</text><g transform="translate(${mx} ${my}) scale(${scale})">${motif(tool.slug,tool.accent)}</g><text x="${x}" y="${capsule ? 790 : hero ? 485 : 310}" fill="#FFF4E8" font-size="${capsule ? 31 : hero ? 36 : 22}" font-weight="800" letter-spacing="-.7">${tool.lines[0]}</text><text x="${x}" y="${capsule ? 830 : hero ? 530 : 340}" fill="${tool.accent}" font-size="${capsule ? 31 : hero ? 36 : 22}" font-weight="800" letter-spacing="-.7">${tool.lines[1]}</text><text x="${x}" y="${h-25}" fill="#FFF4E8" fill-opacity=".38" font-size="${hero ? 11 : 9}" font-weight="700" letter-spacing="2">UM CARA CARAMELO®</text></g></svg>\n`;
};
for (const tool of tools) {
  const dir = path.join(root,tool.slug,'art'); fs.mkdirSync(dir,{recursive:true});
  for (const kind of ['hero','capsule','header','icon']) fs.writeFileSync(path.join(dir,`${kind}.svg`),svg(tool,kind));
}
console.log('16 artes SVG das ferramentas atualizadas.');
