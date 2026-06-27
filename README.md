# Bolão Copa 2026 — Bot de Discord

Bot para um bolão da **fase de mata-mata** da Copa do Mundo de 2026 (16 avos → final).
Os participantes palpitam o placar de cada jogo, o bot calcula os pontos e
mantém um ranking automático no servidor.

---

## Como funciona

### Palpites

- Você palpita o **placar** do jogo (formato `2-1`, `2x1` ou `2:1`).
- Se for **empate**, o bot pergunta quem avança nos pênaltis através de dois
  botões (um pra cada time).
- O deadline pra palpitar é **1 hora antes** do kick-off.
- Você pode **atualizar** seu palpite a qualquer momento até o deadline —
  basta palpitar de novo no mesmo jogo.
- Jogos com times indefinidos (`TBD`, `1º Grupo A`, etc) ficam bloqueados pra
  palpite até serem definidos via `/admin-jogo editar`.

### Pontuação

O placar considerado é o do **tempo normal + prorrogação**. Pênaltis não
contam como gol — só decidem quem é o classificado.

| Acerto | Pontos base |
|---|---|
| Placar exato | **5** |
| Só o vencedor/classificado (placar errado) | **3** |
| Bônus por prever que iria pra pênaltis (palpite empate + jogo a pênaltis) | **+1** |
| Errou o classificado | **0** |

Os pontos base são multiplicados pelo **peso da fase**:

| Fase | Multiplicador | Exato | Vencedor |
|---|:-:|:-:|:-:|
| 16 avos | 1× | 5 | 3 |
| Oitavas | 2× | 10 | 6 |
| Quartas | 3× | 15 | 9 |
| Semi | 4× | 20 | 12 |
| 3º lugar | 1× | 5 | 3 |
| **Final** | **5×** | **25** | **15** |

---

## Comandos

### Pra todos

| Comando | O que faz |
|---|---|
| `/ping` | Testa a latência do bot. |
| `/palpitar jogo:<id> placar:<X-Y> [avanca:<time>]` | Registra ou atualiza o seu palpite. Em empate, o bot pergunta o avança via botões (ou aceita pelo parâmetro `avanca`). O autocomplete do `jogo` mostra só os que você ainda não palpitou; se você começar a digitar, busca em todos (já palpitados aparecem com ✅). |
| `/meus-palpites` | Lista seus palpites com status (aberto, aguardando processamento, ou já com pontos). |
| `/jogos [fase:<fase>]` | Lista os próximos jogos abertos, agrupados por fase, com kick-off em horário de 🇧🇷 e 🇵🇹. Filtra por fase se passar o argumento. ✅ marca os que você já palpitou. |
| `/ranking` | Ranking geral, top 20. |

### Admin (restrito por `ADMIN_USER_IDS` no `.env`)

| Comando | O que faz |
|---|---|
| `/admin-jogo add fase:<x> time_casa:<x> time_fora:<x> kickoff:<x>` | Cadastra um jogo manualmente. `kickoff` aceita `YYYY-MM-DD HH:MM` (Brasília) ou ISO 8601. |
| `/admin-jogo editar jogo_id:<id> [fase] [time_casa] [time_fora] [kickoff]` | Edita um jogo. Só os campos informados são atualizados. |
| `/admin-jogo deletar jogo_id:<id>` | Apaga o jogo + todos os palpites associados em cascata. |
| `/admin-resultado jogo_id:<id> placar_casa:<n> placar_fora:<n> [foi_penaltis] [classificado]` | Registra o placar final. Se for empate, exige `classificado` (validado contra os times do jogo). |
| `/admin-processar jogo_id:<id> [force]` | Calcula a pontuação dos palpites do jogo, atualiza `pontos_total` dos usuários e marca o jogo como processado. `force:true` reprocessa um jogo já processado. |
| `/admin-cron job:<diario\|matinal\|deadline>` | Dispara um cron na hora (pra testar sem esperar o horário). |

---

## Automação (crons)

Três tarefas agendadas rodam automaticamente quando o bot está online:

| Cron | Quando | O que faz |
|---|---|---|
| **diário** | 23:00 BRT | Puxa resultados da API football-data.org (se `FOOTBALL_API_KEY` definido), processa os jogos novos, posta resultados + ranking parcial no `CANAL_RESULTADOS`. |
| **matinal** | 09:00 BRT | Posta no `CANAL_PALPITES` a lista de jogos do dia, com kick-off e deadline em 🇧🇷 e 🇵🇹. |
| **deadline** | a cada minuto | Quando o deadline de um jogo passa, posta `🔒 Palpites de X x Y fechados` no `CANAL_PALPITES`. |

Todos têm proteção idempotente (flags no banco) — se o bot reiniciar, não
duplica posts.

---

## Setup local

### Pré-requisitos
- Node.js 18+
- Conta no [Neon](https://neon.tech) (PostgreSQL gratuito)
- App criado no [Discord Developer Portal](https://discord.com/developers/applications) (bot + escopos `bot` e `applications.commands`)
- (Opcional) Conta gratuita em [football-data.org](https://www.football-data.org/client/register) pra integração com a API

### Instalação

```bash
npm install
cp .env.example .env
# preenche o .env com seus tokens e IDs
npm run db:migrate
npm run deploy
npm start
```

### Variáveis de ambiente

| Variável | Pra quê |
|---|---|
| `DISCORD_TOKEN` | Token do bot. |
| `DISCORD_CLIENT_ID` | Application ID. |
| `DISCORD_GUILD_ID` | ID do servidor onde os comandos são registrados. |
| `DATABASE_URL` | Connection string do Postgres (Neon). |
| `ADMIN_USER_IDS` | IDs Discord (separados por vírgula) que podem usar `/admin-*`. |
| `CANAL_PALPITES` | Canal onde aparecem avisos de jogos do dia e deadlines. |
| `CANAL_RESULTADOS` | Canal onde aparecem placares e ranking parcial. |
| `CANAL_RANKING` | Canal de ranking (opcional). |
| `FOOTBALL_API_KEY` | Chave da football-data.org (opcional — sem ela, o cron diário só processa resultados lançados manualmente). |

---

## Scripts npm

### Operação

| Comando | Pra quê |
|---|---|
| `npm start` | Sobe o bot. |
| `npm run deploy` | Registra os slash commands no `DISCORD_GUILD_ID`. |
| `npm test` | Roda os testes da função de pontuação. |

### Banco

| Comando | Pra quê |
|---|---|
| `npm run db:check` | Testa a conexão com o Postgres (`SELECT now()`). |
| `npm run db:migrate` | Aplica o schema (idempotente, pode rodar várias vezes). |
| `node src/db/reset.js --confirmar` | **Apaga tudo** (jogos, palpites, usuários) e reseta os IDs. |

### Dados dos jogos

| Comando | Pra quê |
|---|---|
| `npm run import` | Puxa jogos do mata-mata da API football-data.org (precisa de `FOOTBALL_API_KEY`). |
| `npm run seed:16` | Cadastra os 16 jogos das 16 avos com `TBD x TBD`. |
| `npm run seed:oitavas` | 8 jogos das oitavas. |
| `npm run seed:quartas` | 4 jogos das quartas. |
| `npm run seed:semis` | 2 jogos das semifinais. |
| `npm run seed:terceiro` | 1 jogo da disputa de 3º lugar. |
| `npm run seed:final` | 1 jogo da final. |
| `npm run seed:tudo` | Roda os 6 seeds acima em sequência (32 jogos no total). |

---

## Estrutura do projeto

```
bot discord/
├── PLANO.md                       documento de planejamento original
├── TESTES.md                      roteiro de testes manuais
├── Dockerfile                     pra deploy
├── package.json
└── src/
    ├── index.js                   inicialização do bot, carga dinâmica de comandos, crons
    ├── deploy-commands.js         registra slash commands na guild
    ├── commands/
    │   ├── ping.js
    │   ├── palpitar.js            com autocomplete e botões de empate
    │   ├── jogos.js
    │   ├── meus-palpites.js
    │   ├── ranking.js
    │   ├── admin-jogo.js          add / editar / deletar
    │   ├── admin-resultado.js
    │   ├── admin-processar.js
    │   └── admin-cron.js
    ├── services/
    │   ├── footballData.js        cliente da API football-data.org
    │   ├── importMatches.js       importa jogos da API
    │   ├── atualizarResultados.js puxa resultados de jogos finalizados
    │   └── processarJogo.js       aplica pontuação (transacional)
    ├── cron/
    │   ├── index.js               registra os 3 crons
    │   ├── diario.js              23h BRT
    │   ├── matinal.js             09h BRT
    │   └── deadline.js            a cada minuto
    ├── db/
    │   ├── pool.js                pool pg + SSL automático
    │   ├── schema.sql             3 tabelas + flags
    │   ├── migrate.js
    │   ├── reset.js               TRUNCATE
    │   ├── check.js
    │   └── usuarios.js            upsert
    ├── scripts/
    │   ├── seed16avos.js
    │   ├── seedOitavas.js
    │   ├── seedQuartas.js
    │   ├── seedSemis.js
    │   ├── seedTerceiro.js
    │   └── seedFinal.js
    └── utils/
        ├── admin.js               requireAdmin
        ├── fase.js                FASES + multiplicadores + mapa da API
        ├── data.js                parseKickoff + formatadores BR/PT
        ├── canais.js              busca canal por env
        ├── bandeiras.js           ~70 países com aliases
        └── pontuacao.js           função pura + testes em pontuacao.test.js
```

---

## Modelo de dados

- **`usuarios`**: `id` (Discord), `username`, `pontos_total`, `created_at`.
- **`jogos`**: `id`, `external_id` (API), `fase`, `time_casa`, `time_fora`,
  `kickoff`, `placar_casa`, `placar_fora`, `classificado`, `foi_penaltis`,
  `processado`, `multiplicador`, e flags `aviso_deadline_postado` /
  `resultado_postado` (pra idempotência dos crons).
- **`palpites`**: `id`, `usuario_id`, `jogo_id`, `placar_casa`, `placar_fora`,
  `avanca`, `pontos`, `created_at`, `updated_at`. Único por
  `(usuario_id, jogo_id)`.

---

## Deploy

Checklist genérico no `PLANO.md` cobre Railway, Fly.io e VPS. O `Dockerfile`
está pronto pra qualquer host que aceite imagem Docker.
