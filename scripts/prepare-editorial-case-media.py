"""Prepare the supplied 1080×1440 carousel montages without distorting their art."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "reference"
OUTPUT = ROOT / "public" / "assets" / "case" / "um-cara-caramelo-conteudo"
OUTPUT.mkdir(parents=True, exist_ok=True)

SERIES = [
    {
        "id": "trajetoria", "source": "Frame 1 (3).png", "title": "Uma resposta construída na prática",
        "theme": "Trajetória criativa e posicionamento",
        "message": "A multiplicidade de repertórios deixa de parecer dispersão quando encontra uma ideia que a conecta.",
        "role": "Apresenta uma narrativa pessoal que transforma a pergunta “o que você faz?” em posicionamento.",
        "intention": "Tornar a trajetória profissional compreensível e gerar identificação com quem também reúne diferentes repertórios.",
        "narrative": "A abertura confessional apresenta um incômodo; os slides acumulam experiências até a virada “interação”, seguida de um convite à conversa.",
        "visual": "O contraste entre cenas cinematográficas e páginas claras marca os capítulos. Laranja, roxo e ciano, lettering e intervenções gráficas dão unidade à sequência.",
        "contribution": "Conecta repertório, identidade pessoal e posicionamento sem reduzir a atuação a uma única ferramenta.",
        "learning": "Uma trajetória pode funcionar como argumento de posicionamento quando cada experiência ajuda a sustentar a mesma ideia.",
        "beats": ["Abertura", "Repertório", "Releitura do problema", "Virada narrativa", "Síntese do posicionamento", "Reflexão e convite"],
        "alts": [
            "Abertura do carrossel: “Eu passei anos tentando escolher uma profissão”, sobre ilustração em tons de laranja e roxo.",
            "Slide sobre a passagem por design, conteúdo, marketing, web, estratégia e tecnologia, com a pergunta “Mas o que você faz?”.",
            "Slide claro com a frase “Meu problema não era saber coisas demais. Era tentar me definir pela ferramenta”.",
            "Slide tipográfico com a virada: trocar “Qual profissão eu sou?” por “O que conecta tudo isso?”, respondendo “Interação”.",
            "Ilustração de Luiz desenhando ao lado de um notebook, com a frase “Hoje estou construindo esse lugar: interação”.",
            "Encerramento com a pergunta “O que você faz?” e convite para compartilhar a resposta nos comentários."
        ]
    },
    {
        "id": "identidade", "source": "Frame 2.png", "title": "Quando a profissão não cabe no rótulo",
        "theme": "Identidade profissional e repertório",
        "message": "A pergunta deixa de ser qual profissão escolher e passa a ser o que se consegue transformar em realidade.",
        "role": "Explora uma dúvida comum a profissionais multidisciplinares e organiza uma mudança de perspectiva.",
        "intention": "Criar identificação a partir da dificuldade de explicar uma atuação que atravessa diferentes disciplinas.",
        "narrative": "O desconforto inicial ganha contexto, passa pela sensação de falta de foco e termina em uma pergunta mais aberta sobre criação.",
        "visual": "Roxo, lilás e azul conectam cenas de fantasia e layouts editoriais. Setas, listas e balões tornam a progressão do raciocínio visível.",
        "contribution": "Aproxima a marca de criativos que se reconhecem na tensão entre especialização e repertório amplo.",
        "learning": "Nomear uma dúvida com precisão pode ser o ponto de partida para uma narrativa de identificação.",
        "beats": ["Abertura", "Origem do repertório", "Expansão e conflito", "Virada narrativa", "Releitura", "Nova perspectiva", "Reflexão e convite"],
        "alts": [
            "Abertura em roxo: “Eu acho que estou desaprendendo a ser designer”, com uma mão segurando um lápis.",
            "Slide claro explicando que design foi a primeira coisa que o autor realmente soube fazer, desde a adolescência.",
            "Lista de repertórios: motion, sites, social media, conteúdo, marketing, IA, automação e código.",
            "Silhueta diante de um muro colorido com a pergunta “Qual dessas coisas eu vou ser?” e a sensação de precisar escolher.",
            "Slide claro sobre usar design para dirigir coisas que antes o autor nem conseguia executar.",
            "Ilustração de Luiz olhando para o céu, sobre construir mais e não se definir pelas ferramentas.",
            "Encerramento com a pergunta “O que eu consigo transformar em realidade?” e convite à conversa."
        ]
    },
    {
        "id": "possibilidades", "source": "Frame 3.png", "title": "IA como ampliação de possibilidades",
        "theme": "Inteligência artificial, experimentação e execução",
        "message": "A IA aparece como meio para realizar ideias antes limitadas por repertório técnico ou recursos.",
        "role": "Documenta uma reflexão sobre experimentação e a passagem da ideia para novas formas de execução.",
        "intention": "Apresentar uma perspectiva sobre IA ligada à ampliação de possibilidades criativas, não apenas ao ganho de volume.",
        "narrative": "A série começa com uma ação inesperada, contrapõe produção em escala e possibilidade, exemplifica novas capacidades e fecha com uma tese pessoal.",
        "visual": "Azul-profundo e laranja se alternam com fundos de papel. Etiquetas, setas e frases manuscritas organizam exemplos e mudanças de ideia.",
        "contribution": "Relaciona tecnologia, curiosidade e autonomia criativa ao território de experimentação da marca.",
        "learning": "Uma ferramenta ganha relevância editorial quando a narrativa explicita o que ela permite pensar ou realizar.",
        "beats": ["Abertura", "Tema e curiosidade", "Contraste", "Virada narrativa", "Exemplificação", "Desenvolvimento visual", "Reflexão e conclusão"],
        "alts": [
            "Abertura em azul e laranja: “Eu comecei a fazer coisas que eu não sei fazer”.",
            "Slide claro com personagem e a frase “Talvez essa seja a parte da IA que mais me interessa”.",
            "Slide laranja contrapondo a utilidade de produzir mais ao que realmente entusiasma o autor.",
            "Slide claro sobre trocar “Eu não sei fazer isso” por “Tá, como a gente faz?”.",
            "Exemplos de novas possibilidades: código, automação, sites, experiências digitais e sistemas.",
            "Ilustração de uma pessoa subindo escadas em cenário azul e laranja, sobre desenvolver novas habilidades.",
            "Encerramento sobre usar IA para realizar o que antes não era possível e explorar pequenos passos."
        ]
    },
    {
        "id": "direcao", "source": "Frame 4.png", "title": "A IA executa. Você dirige.",
        "theme": "Da execução à direção criativa",
        "message": "Quando executar fica mais acessível, repertório, critério, intenção, visão e bom gosto ganham importância.",
        "role": "Sintetiza a defesa da direção como competência central em um contexto de execução automatizada.",
        "intention": "Defender a importância das decisões humanas na condução de ferramentas e processos de criação.",
        "narrative": "Uma frase-tese abre a série; capacidades da IA são reconhecidas antes da virada sobre decidir, seguida por argumentos e uma conclusão que retoma a abertura.",
        "visual": "Céus em gradiente e cenários ilustrados criam continuidade. O lettering da tese dialoga com listas e destaques editoriais em slides claros.",
        "contribution": "Conecta a conversa sobre IA ao posicionamento de direção criativa e estratégica.",
        "learning": "Uma tese forte pode estruturar toda a série e reaparecer no encerramento com mais significado.",
        "beats": ["Tese de abertura", "Reconhecimento da ferramenta", "Virada narrativa", "Argumento central", "Competências de direção", "Conclusão e retomada da tese"],
        "alts": [
            "Abertura com Luiz diante de um computador antigo em um campo e a frase “A IA executa. Você dirige”.",
            "Slide claro listando ações da IA: escreve, programa, pesquisa, cria imagem, organiza e automatiza.",
            "Luiz sentado diante de um céu colorido com perguntas sobre o que fazer, por que fazer e quando está bom.",
            "Slide claro com a frase “Execução sem direção é só produção”, acompanhada por elementos gráficos em ciano.",
            "Slide sobre o valor de repertório, critério, intenção, visão e bom gosto quando a execução fica mais barata.",
            "Encerramento com Luiz sentado em uma escada vermelha e a retomada de “A IA executa. Você dirige”."
        ]
    }
]

manifest = {"project": "Um Cara Caramelo — Estratégia Editorial", "classification": "Projeto autoral", "sourceNote": "Quatro montagens fornecidas pelo usuário. Cada montagem tem largura múltipla exata de 1080 px; os limites foram conferidos visualmente antes da separação.", "pillarClassification": "Não classificado por dia da semana: o calendário publicado não foi fornecido.", "series": []}
for series in SERIES:
    image = Image.open(SOURCE / series["source"]).convert("RGB")
    count = len(series["alts"])
    assert image.size == (1080 * count, 1440), (series["source"], image.size)
    slides = []
    for index in range(count):
        number = index + 1
        name = f"{series['id']}-{number:02d}.webp"
        slide = image.crop((index * 1080, 0, (index + 1) * 1080, 1440))
        slide.save(OUTPUT / name, "WEBP", quality=86, method=6)
        slides.append({"src": f"/assets/case/um-cara-caramelo-conteudo/{name}", "width": 1080, "height": 1440, "alt": series["alts"][index], "beat": series["beats"][index], "sourceFile": series["source"], "sourceOrder": number})
    item = {key: value for key, value in series.items() if key not in {"source", "alts", "beats"}}
    item.update({"categoryConfirmed": "Projeto autoral — estratégia de conteúdo, branding e comunidade", "editorialPillar": "Não classificado", "slides": slides})
    manifest["series"].append(item)

# Social preview composed from real covers, never used as a substitute for the slides.
og = Image.new("RGB", (1200, 630), "#101014")
for index, series in enumerate(SERIES):
    cover = Image.open(OUTPUT / f"{series['id']}-01.webp").convert("RGB")
    cover.thumbnail((300, 560))
    og.paste(cover, (index * 300, 35))
og.save(OUTPUT / "og-case.webp", "WEBP", quality=88, method=6)
(OUTPUT / "media-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Prepared {sum(len(s['slides']) for s in manifest['series'])} slides in {OUTPUT}")
