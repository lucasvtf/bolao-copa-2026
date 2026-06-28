# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Discord bot (discord.js v14, ESM, Node 18+) for a **knockout-stage** World Cup 2026 betting pool ("bolão"). Players predict match scores, the bot scores them and keeps an auto-updating ranking. Postgres backend (Neon). User-facing strings are in Brazilian Portuguese — match that when editing.

## Commands

```bash
npm start              # run the bot (src/index.js)
npm run deploy         # register slash commands to the guild (run after changing any command `data`)
npm run db:migrate     # apply src/db/schema.sql (idempotent — CREATE/ALTER IF NOT EXISTS)
npm run db:check       # inspect db state
npm run db:reset       # drop/recreate
npm run import         # import fixtures from football-data.org
npm run seed:tudo      # seed all phases (or seed:16, seed:oitavas, seed:quartas, seed:semis, seed:terceiro, seed:final)
npm test               # node --test on src/utils/pontuacao.test.js (the only test)
```

`.env` is required (copy `.env.example`): `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DATABASE_URL`, `CANAL_PALPITES`/`CANAL_RESULTADOS`/`CANAL_RANKING` (channel IDs), `FOOTBALL_API_KEY` (optional), `ADMIN_USER_IDS` (comma-separated).

## Architecture

**Command auto-loading** — `src/index.js` and `src/deploy-commands.js` both scan `src/commands/*.js`. A command module exports `data` (a `SlashCommandBuilder`) and `execute`, and optionally `autocomplete` and `handleComponent`. Adding a file there is all it takes to register a command; **no central registry**. After changing a command's `data`, re-run `npm run deploy` or Discord won't see the new shape.

**Interaction routing** (`index.js` `InteractionCreate`): chat-input → `execute`; autocomplete → `autocomplete`; buttons/select-menus → routed by the **first `:`-delimited segment of `customId`** to that command's `handleComponent`. So component custom IDs are namespaced like `palpitar:empate:<jogoId>:<casa>:<fora>:<idx>` — the leading token must equal the command name.

**Scoring** — `src/utils/pontuacao.js` `calcularPontos(palpite, jogo)` is the single source of truth and the only unit-tested code. Score = base × phase multiplier. Base: exact score 5, correct qualifier only 3, +1 bonus for predicting a draw that went to penalties. Penalty shootouts decide the qualifier but **do not count as goals** (score = normal time + extra time). Phase multipliers live in `src/utils/fase.js` `MULTIPLICADOR` (16-avos ×1 … final ×5, terceiro ×1).

**Processing flow** — `src/services/processarJogo.js` `processarJogo(jogoId, {force})` runs in a transaction with `SELECT ... FOR UPDATE`: scores every palpite, recomputes each affected user's `pontos_total` as `SUM(palpites.pontos)` (so it's idempotent and `force`-reprocessable), marks `jogos.processado = TRUE`. Always mutate scores through this function, not ad-hoc SQL, to keep `pontos_total` consistent.

**Crons** (`src/cron/`, registered on `ClientReady` via `registerCrons`, timezone `America/Sao_Paulo`):
- `diario.js` — 23:00 BRT: pull results from football-data.org (if `FOOTBALL_API_KEY`), process new games, post results + partial ranking.
- `matinal.js` — 09:00 BRT: post the day's games to `CANAL_PALPITES`.
- `deadline.js` — every minute: post "palpites fechados" when a game's deadline passes.

Crons are **idempotent via boolean flags on `jogos`** (`resultado_postado`, `aviso_deadline_postado`) so a restart never double-posts. Preserve this pattern when touching cron logic. `/admin-cron` triggers a cron on demand for testing.

**Data model** (`src/db/schema.sql`): `usuarios` (Discord ID as `BIGINT` PK, denormalized `pontos_total`), `jogos` (a match; `fase` + `multiplicador` constrained; `external_id` links to the API; `classificado` = qualifier, required on draws), `palpites` (`UNIQUE(usuario_id, jogo_id)` — predictions are upserted via `ON CONFLICT`), `audit_log` (admin actions, written by `src/db/audit.js` `logarAcao`, best-effort/never throws).

## Conventions

- **Deadline**: predictions close `DEADLINE_HORAS = 1` hour before kickoff (defined in `palpitar.js`).
- **Times indefinidos**: games with `TBD` / `1º Grupo A`-style team names are blocked for predictions until edited via `/admin-jogo editar` (regex `INDEFINIDO_RE` in `palpitar.js`).
- **Dates**: `src/utils/data.js` — `parseKickoff` accepts `"YYYY-MM-DD HH:MM"` as **Brasília local time** (-03:00) or ISO 8601 with offset; `formatKickoffDuplo` renders both 🇧🇷 (São Paulo) and 🇵🇹 (Lisbon).
- **DB access**: import `pool`/`query` from `src/db/pool.js` (auto-enables SSL for Neon URLs). Use parameterized queries.
- **Admin gate**: `requireAdmin(interaction)` / `isAdmin(userId)` from `src/utils/admin.js`, checked against `ADMIN_USER_IDS`.
- Team-name display goes through `comBandeira` (`src/utils/bandeiras.js`) to prepend flag emoji. Embeds posting `<@id>` mentions set `allowedMentions: { parse: [] }` to avoid pinging.
