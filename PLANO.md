# Bolão Copa do Mundo 2026 — Bot de Discord

Documento de contexto e planejamento. Lê este arquivo inteiro antes de começar.
A ideia é construir um bot de Discord para um bolão **só da fase de mata-mata**
da Copa do Mundo 2026 (16 avos → final). Como a Copa 2026 tem 48 seleções,
32 times se classificam pro mata-mata, então a primeira fase é a de 16 avos.

---

## Stack

- **Runtime:** Node.js 18+ (ESM, `"type": "module"`)
- **Lib Discord:** discord.js v14 (slash commands)
- **Banco:** PostgreSQL no Neon (free tier, serverless, na nuvem) — driver `pg`
- **Agendamento:** node-cron
- **Resultados:** API football-data.org (free tier) com fallback de entrada manual
- **Deploy:** Railway / Render free tier / Fly.io (a decidir na última etapa)

---

## Regras do bolão (decisões já fechadas)

### Escopo
- Apenas mata-mata: 16 avos, oitavas, quartas, semifinais, disputa de 3º lugar e final.
- Fase de grupos fica de fora.

### Como funciona o palpite (Modelo B)
- O participante palpita o **placar** do jogo.
- O **"quem avança" é implícito** quando o palpite tem um vencedor.
  Ex: `2-0` → já se sabe que o time da casa avança.
- O **"quem avança" só é pedido quando o palpite é empate**, porque aí o placar
  sozinho não diz quem passa.
  Ex: `/palpitar brasil-uruguai 1-1` → bot pergunta quem avança nos pênaltis,
  ou aceita direto: `/palpitar brasil-uruguai 1-1 brasil`.

### Resultado considerado
- Placar = tempo normal **+ prorrogação**.
- Pênaltis **não** entram como gol no placar; a disputa de pênaltis só decide
  quem é o classificado.
- Exemplo: jogo 1-1, decidido nos pênaltis 4-3 para o Brasil →
  placar para fins de bolão é 1-1, classificado é o Brasil.

### Pontuação
- **5 pts** — placar exato (tempo normal + prorrogação)
- **3 pts** — acertou o vencedor / classificado (placar errado)
- **1 pt bônus** — previu corretamente que o jogo iria para os pênaltis
- **0 pts** — errou o classificado

### Multiplicador por fase
- 16 avos: 1x
- Oitavas: 2x
- Quartas: 3x
- Semifinais: 4x
- Final: 5x
- Disputa de 3º lugar: 1x

### Deadline
- Palpites de cada jogo fecham **1 hora antes** do horário de início (kick-off).

---

## Modelo de dados (esboço)

### `usuarios`
| coluna | tipo | nota |
|---|---|---|
| id | bigint PK | Discord user ID |
| username | text | nome de exibição |
| pontos_total | int | cache do total (ou calcular sob demanda) |
| created_at | timestamptz | |

### `jogos`
| coluna | tipo | nota |
|---|---|---|
| id | serial PK | |
| fase | text | oitavas / quartas / semi / final / terceiro |
| time_casa | text | |
| time_fora | text | |
| kickoff | timestamptz | horário de início |
| placar_casa | int null | preenchido após o jogo |
| placar_fora | int null | preenchido após o jogo |
| classificado | text null | quem avançou (relevante em empate/pênaltis) |
| foi_penaltis | bool | se foi decidido nos pênaltis |
| processado | bool | se a pontuação já foi calculada |
| multiplicador | int | 1, 2, 3 ou 4 conforme a fase |

### `palpites`
| coluna | tipo | nota |
|---|---|---|
| id | serial PK | |
| usuario_id | bigint FK | |
| jogo_id | int FK | |
| placar_casa | int | |
| placar_fora | int | |
| avanca | text null | só preenchido quando o palpite é empate |
| pontos | int null | calculado após o jogo |
| created_at | timestamptz | |
| UNIQUE(usuario_id, jogo_id) | | um palpite por jogo por pessoa |

---

## Comandos

| comando | descrição |
|---|---|
| `/ping` | teste de latência (já feito) |
| `/palpitar [jogo] [placar] [avanca?]` | registra/atualiza palpite; valida deadline; pede `avanca` se for empate |
| `/meus-palpites` | lista os palpites da rodada atual com status |
| `/ranking` | ranking geral (e/ou da rodada) |
| `/jogos` | próximos jogos com deadline de palpite |

---

## Roadmap (etapas)

- [x] **Etapa 0 — Decisões** (este documento)
- [x] **Etapa 1 — Setup do projeto**
      Estrutura de pastas, dependências, `index.js` com carga dinâmica de
      comandos, `deploy-commands.js`, comando `/ping`. Bot sobe e responde.
- [x] **Etapa 2 — Banco de dados**
      Conta no Neon, connection string no `.env`, schema das 3 tabelas,
      módulo de conexão (`src/db/`), migration inicial. Bot conecta no banco.
- [x] **Etapa 3 — Fonte de resultados**
      Integrar football-data.org; carregar os jogos do mata-mata para a
      tabela `jogos`. Fallback: comando admin de entrada manual de resultado.
- [x] **Etapa 4 — Comando de palpite**
      `/palpitar` com lógica de empate → pede classificado; validação de
      deadline; upsert em `palpites`.
- [x] **Etapa 5 — Processamento de resultados**
      Função de pontuação cobrindo todos os cenários (placar exato, vencedor,
      classificado via pênaltis, bônus pênalti, multiplicador de fase).
      Idealmente com testes unitários da função de pontuação.
- [x] **Etapa 6 — Ranking e consultas**
      `/ranking`, `/meus-palpites`, `/jogos` com embeds formatados.
- [x] **Etapa 7 — Automação (cron)**
      Abrir rodada, fechar palpites 1h antes, postar resultado + ranking
      automaticamente nos canais configurados.
- [x] **Etapa 8 — Deploy**
      Dockerfile pronto + checklist abaixo. Escolha do host fica pra depois.

> Fazer na ordem, validando cada etapa antes de avançar.

---

## Estrutura de pastas (Etapa 1, já criada)

```
bolao-copa/
├── package.json
├── .env.example
├── .gitignore
├── PLANO.md            ← este arquivo
└── src/
    ├── index.js              ← sobe o bot, carrega comandos dinamicamente
    ├── deploy-commands.js    ← registra os slash commands no servidor
    ├── commands/
    │   └── ping.js
    ├── services/             ← (resultados, football-data) — vem na Etapa 3
    ├── db/                   ← (conexão + queries) — vem na Etapa 2
    └── utils/                ← (pontuação, formatação de embeds)
```

---

## Variáveis de ambiente (`.env`)

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DATABASE_URL=                 # connection string do Neon (sslmode=require)
CANAL_PALPITES=
CANAL_RESULTADOS=
CANAL_RANKING=
FOOTBALL_API_KEY=            # football-data.org (opcional no início)
```

---

## Deploy (checklist genérico)

Pré-requisito comum a qualquer host: ter um repositório Git (GitHub) com o código.

### Antes de subir
1. Setar **todas** as envs do `.env.example` no painel da plataforma.
2. Rodar `npm run db:migrate` uma vez contra o banco de produção (local mesmo,
   apontando `DATABASE_URL` pro Neon de prod).
3. Rodar `npm run deploy` (slash commands) uma vez apontando pro guild de prod.

### Railway
1. New Project → Deploy from GitHub repo.
2. Adicionar as variáveis na aba **Variables**.
3. Railway detecta o `Dockerfile` automaticamente. Deploy.

### Fly.io
1. `fly launch` (na pasta) — escolhe nome, **não** cria DB (usa o Neon).
2. `fly secrets set DISCORD_TOKEN=... DATABASE_URL=... ...` (todas as envs).
3. `fly deploy`.

### VPS / Oracle Free Tier
1. `git clone` no servidor.
2. Instalar Node 20 + criar `.env`.
3. `npm ci && npm run db:migrate && npm run deploy`.
4. Subir com `pm2 start src/index.js --name bolao-copa` (ou systemd).

---

## Notas / convenções

- Estilo de código: conciso e direto, sem over-engineering.
- Comentários só onde a intenção não é óbvia.
- Tudo em ESM (`import`/`export`).
- Mensagens do bot em português (pt-BR).
- A função de cálculo de pontuação deve ser **pura e testável**
  (recebe palpite + resultado, devolve pontos), separada do código do Discord.
