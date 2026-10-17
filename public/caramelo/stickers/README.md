# Figurinhas canônicas do rastro Caramelo

28 adesivos extraídos da fonte original `rastro mouse.png`, na raiz do projeto.
As cores e a textura são os pixels originais: não houve redesenho ou geração.
Cada arquivo tem transparência e uma margem transparente de 6 px.

- `*.webp`: arquivos de distribuição com compressão sem perdas.
- `manifest.json`: dimensões, coordenadas na fonte e SHA-256 do arquivo original.

As cópias PNG sem perdas ficam em `artifacts/brand/stickers-png`. A montagem de
conferência fica em `artifacts/brand/sticker-qc/contact-sheet.jpg`; ela não integra
a sequência do rastro ou o pacote de distribuição.

O contrato TypeScript está em `src/brand/stickers.ts`. Os campos `file` contêm
apenas o basename; `resolveTrailStickers()` usa `/caramelo/stickers` por padrão.
Para publicar o conjunto, copie os arquivos WebP referidos no contrato para esse
diretório público, ou forneça outro diretório ao resolver.

Extração reproduzível: `scripts/extract-trail-stickers.py`, com Pillow e NumPy.
O script usa componentes conectados do alpha. Três pares de bordas brancas que
se encostam são separados por trajetórias manuais; as franjas de transparência
são atribuídas à região mais próxima, sem coletar os adesivos vizinhos.
Os detalhes azuis soltos do cão são mantidos junto a ele. O grupo de estrelas,
o sol dos arcos e o símbolo de conexões preservam suas composições originais.
