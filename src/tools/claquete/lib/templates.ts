import { uid } from '../shared/project';
import type { MediaNode, Project, TextNode } from '../shared/types';

// Quick-start entries on the home screen. Prompted ones hand the text to the
// agent; template ones seed the canvas (like the onboarding workflows found
// in the original bundle: "Generate your first image", "Examples", ...).

export const TEMPLATES = [
  { id: 'script', label: 'Conceito e narrativa', name: 'Conceito e narrativa', prompt: 'Quero desenvolver um conceito visual a partir de uma narrativa. Me ajude a estruturar: decupe o texto em imagens-chave e planos no canvas.' },
  { id: 'prompt', label: 'Do prompt à geração', name: 'Exploração de prompt', prompt: 'Quero ir de uma ideia curta a um conjunto de imagens e variações em vídeo. Proponha 3 direções visuais diferentes e me deixe escolher.' },
  { id: 'chars', label: 'Criar personagens', name: 'Personagens', prompt: 'Vamos criar os personagens do meu filme. Faça perguntas rápidas sobre o tom e gere fichas de personagem (model sheets) consistentes.' },
  { id: 'style', label: 'Começar a partir de um estilo', name: 'Exploração de estilo', prompt: 'Quero começar definindo o visual do filme. Gere 4 frames de teste em estilos bem diferentes para o mesmo momento e me deixe escolher um para travar como estilo do projeto.' },
  { id: 'blank', label: 'Tela em branco', name: 'Sem título', prompt: '' },
  { id: 'tour', label: 'Tour guiado', name: 'Tour guiado', prompt: '', template: 'tour' },
] as { id: string; label: string; name: string; prompt: string; template?: string }[];

function note(content: string, x: number, y: number, color: TextNode['data']['color'] = 'yellow'): TextNode {
  return { id: uid(), type: 'text', position: { x, y }, data: { color, content, dimensions: { width: 300, height: 200 } } };
}

export function applyTemplate(id: string, p: Project) {
  if (id !== 'tour') return;
  const n1 = note('# 1. Gere uma imagem\n\n- Clique no nó ao lado\n- Escreva um prompt ou use o exemplo\n- Aperte **Gerar**', 0, 0);
  const img: MediaNode = {
    id: uid(),
    type: 'image',
    position: { x: 360, y: 0 },
    data: {
      status: 'idle',
      user_input_title: 'Primeira imagem',
      generationSettings: { actionType: 'Image', inputs: { model: 'soul-v2', prompt: 'A lone figure on an empty night train platform, wet concrete reflecting sodium lights, wide shot, 35mm, cinematic noir', aspect_ratio: '16:9' } },
    },
  };
  const n2 = note('# 2. Gere variações em vídeo\n\n- Conecte a imagem gerada ao nó de vídeo\n- Descreva a ação ou movimento de câmera\n- Aperte **Gerar**', 0, 300, 'blue');
  const vid: MediaNode = {
    id: uid(),
    type: 'video',
    position: { x: 820, y: 0 },
    data: { status: 'idle', user_input_title: 'Primeiro plano', generationSettings: { actionType: 'ImageToVideo', inputs: { model: 'kling-3.0-standard', prompt: 'Slow dolly in toward the figure, light rain begins to fall, distant train horn', duration: '5' } } },
  };
  const n3 = note('# 3. Estruture e expanda\n\n- Adicione notas de texto, áudios e seções\n- Abra a aba **História** para organizar conceitos e prompts\n\nOu peça assistência ao Agente Criativo no painel à direita.', 0, 560, 'green');
  for (const n of [n1, img, n2, vid, n3]) p.nodes[n.id] = n;
  p.edges.push({ id: uid(), source: img.id, target: vid.id, data: { mediaInputId: 'startFrame' } });
}
