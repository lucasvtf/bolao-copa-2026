# Plano de Testes Manuais — Bolão Copa 2026

Roteiro pra validar o bot ponta a ponta com 2 usuários (você + irmão).
Marca os checkboxes conforme for testando.

---

## 0. Pré-requisitos

- [ ] Bot rodando (`npm start`) e logado no servidor de teste.
- [ ] Banco com schema atualizado (`npm run db:migrate`).
- [ ] Slash commands registrados (`npm run deploy`).
- [ ] Envs preenchidas no `.env`: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`,
      `DISCORD_GUILD_ID`, `DATABASE_URL`, `ADMIN_USER_IDS`,
      `CANAL_PALPITES`, `CANAL_RESULTADOS`.
- [ ] Irmão convidado pro servidor de teste (só estar no servidor já basta;
      ele **não** precisa ser admin).
- [ ] `/ping` responde pra você e pra ele.

---

## 1. Cadastrar 3 jogos de teste

Os jogos seedados (`TBD x TBD`) têm times indefinidos e a proteção do
`/palpitar` vai recusar palpite neles. Por isso, criar 3 jogos com times reais
pra cobrir todos os caminhos de pontuação. Ajusta as datas pra um dia em que
você e seu irmão estejam disponíveis (`AAAA-MM-DD HH:MM` é horário de Brasília).

```
/admin-jogo add fase:final    time_casa:Brasil   time_fora:Argentina kickoff:2026-06-19 20:00
/admin-jogo add fase:semi     time_casa:Portugal time_fora:Espanha   kickoff:2026-06-19 20:30
/admin-jogo add fase:quartas  time_casa:Itália   time_fora:França    kickoff:2026-06-19 21:00
```

- [ ] Os 3 jogos foram cadastrados.
- [ ] Anota os IDs retornados (vou chamar de `ID_BRA`, `ID_POR`, `ID_ITA`).
- [ ] As mensagens de confirmação mostram **bandeira ao lado do nome**:
      ex: `🇧🇷 Brasil x 🇦🇷 Argentina`.

### 1.1. Teste do `/admin-jogo deletar`

Cadastra um jogo dummy só pra apagar:

```
/admin-jogo add fase:oitavas time_casa:Teste1 time_fora:Teste2 kickoff:2026-12-31 23:59
```

Anota o ID retornado. Depois:

```
/admin-jogo deletar jogo_id:<ID_DUMMY>
```

- [ ] Resposta confirma o nome do jogo + diz que foi deletado.
- [ ] `/jogos` (ver seção 3) não mostra mais o jogo dummy.
- [ ] Tenta deletar de novo o mesmo ID → recusa: **"Jogo #X não encontrado"**.

---

## 2. Palpitar

### 2.1. Autocomplete enxuto

Antes de palpitar, **abre o `/palpitar` e clica em "jogo:" sem digitar nada**:

- [ ] Você vê apenas jogos cadastrados em que **ainda não palpitou** (lista enxuta).
- [ ] Não aparecem os jogos seedados com `TBD x TBD` que têm kickoff longe?
      (eles aparecem sim — ainda não palpitou neles. Só somem quando você palpita.)
- [ ] Digita "Brasil" → lista filtrada mostrando o Brasil x Argentina.
- [ ] No nome do jogo, vê bandeira: `#X 🇧🇷 Brasil x 🇦🇷 Argentina`.

### 2.2. Você palpita

```
/palpitar jogo:Brasil x Argentina  placar:3-1
/palpitar jogo:Portugal x Espanha  placar:1-1   → bot mostra dois botões → clica em 🇵🇹 Portugal
/palpitar jogo:Itália x França     placar:2-0
```

- [ ] Os 3 palpites foram registrados (mensagem com bandeiras nos nomes).
- [ ] Nos botões de empate, os nomes aparecem com bandeira.

### 2.3. Autocomplete depois de palpitar

Abre `/palpitar jogo:` sem digitar nada novamente:

- [ ] **Os 3 jogos que você palpitou sumiram** da lista (já não precisam mais aparecer por default).
- [ ] Digita "Brasil" → aparece com `✅` na frente, indicando que já palpitou:
      `✅ #X 🇧🇷 Brasil x 🇦🇷 Argentina`.
- [ ] Selecionar esse jogo e palpitar `placar:4-0` → mensagem **"atualizado"** (não "registrado").

### 2.4. Irmão palpita (palpites de propósito diferentes)

```
/palpitar jogo:Brasil x Argentina  placar:2-0
/palpitar jogo:Portugal x Espanha  placar:0-0   → clica em 🇪🇸 Espanha
/palpitar jogo:Itália x França     placar:0-1
```

- [ ] Os 3 palpites foram registrados.

### 2.5. Testes de validação

- [ ] `/palpitar jogo:#1` (jogo seedado com `TBD x TBD`) → recusa:
      **"Os times deste jogo ainda não foram definidos"**.
- [ ] Cadastra jogo com kickoff em ~30min e tenta palpitar → recusa:
      **"Deadline já passou..."** (mensagem mostra kickoff em 🇧🇷 e 🇵🇹).

---

## 3. Conferir palpites e jogos

### Você
```
/meus-palpites
```
- [ ] Mostra seus 3 palpites com **bandeiras nos times** + kickoff em ambos os fusos.

### Irmão
```
/meus-palpites
```
- [ ] Mostra os 3 palpites dele com bandeiras.

### Geral
```
/jogos
/jogos fase:final
```
- [ ] `/jogos` sem filtro mostra todas as fases agrupadas.
- [ ] Jogos têm bandeiras: `⏳ #X 🇧🇷 Brasil x 🇦🇷 Argentina`.
- [ ] Jogos em que você já palpitou aparecem com ✅, os outros com ⏳.
- [ ] Horários em ambos os fusos (🇧🇷 e 🇵🇹).
- [ ] Com filtro, mostra só os da fase escolhida.

---

## 4. Simular fim dos jogos

Pra testar lançamento de resultado sem esperar a data chegar, edita o kickoff
pra ontem (assim o deadline passa e o jogo "termina"):

```
/admin-jogo editar jogo_id:ID_BRA kickoff:2026-06-16 20:00
/admin-jogo editar jogo_id:ID_POR kickoff:2026-06-16 20:30
/admin-jogo editar jogo_id:ID_ITA kickoff:2026-06-16 21:00
```

### Lançar resultados

```
/admin-resultado jogo_id:ID_BRA placar_casa:3 placar_fora:1
/admin-resultado jogo_id:ID_POR placar_casa:1 placar_fora:1 foi_penaltis:True classificado:Portugal
/admin-resultado jogo_id:ID_ITA placar_casa:1 placar_fora:0
```

- [ ] Os 3 resultados foram salvos.
- [ ] Mensagens de confirmação mostram bandeiras no placar (🇧🇷 3 x 1 🇦🇷, etc).

### Testes de validação

- [ ] Tenta lançar empate sem `classificado`:
      `/admin-resultado jogo_id:ID_POR placar_casa:0 placar_fora:0` → recusa.
- [ ] Tenta com classificado fora dos times:
      `/admin-resultado jogo_id:ID_POR placar_casa:1 placar_fora:1 classificado:Argentina` →
      recusa **"precisa ser 🇵🇹 Portugal ou 🇪🇸 Espanha"**.

---

## 5. Processar pontuação

```
/admin-processar jogo_id:ID_BRA
/admin-processar jogo_id:ID_POR
/admin-processar jogo_id:ID_ITA
```

### Pontos esperados

| Jogo | Resultado real | Você (palpite) | Pontos seus | Irmão (palpite) | Pontos irmão |
|---|---|---|---|---|---|
| 🇧🇷 Brasil 3×1 🇦🇷 Argentina · final · ×5 | vitória Brasil | 3-1 (placar exato) | **5×5 = 25** | 2-0 (vencedor certo, placar errado) | **3×5 = 15** |
| 🇵🇹 Portugal 1×1 🇪🇸 Espanha · semi · ×4 · pênaltis | classificado: Portugal | 1-1 → Portugal | **(5+1)×4 = 24** | 0-0 → Espanha | **(0+1)×4 = 4** |
| 🇮🇹 Itália 1×0 🇫🇷 França · quartas · ×3 | vitória Itália | 2-0 (vencedor certo, placar errado) | **3×3 = 9** | 0-1 (vencedor errado) | **0** |

### Totais esperados
- **Você: 25 + 24 + 9 = 58 pts**
- **Irmão: 15 + 4 + 0 = 19 pts**

- [ ] Os pontos retornados pelo `/admin-processar` batem com a tabela.
- [ ] A resposta mostra o nome do jogo com bandeiras.
- [ ] Tenta reprocessar um jogo (`/admin-processar jogo_id:ID_BRA`) →
      deve recusar **"Jogo já foi processado"**.
- [ ] `/admin-processar jogo_id:ID_BRA force:True` → reprocessa.

---

## 6. Conferir ranking e visão final

```
/ranking
```
- [ ] 🥇 Você — 58 pts
- [ ] 🥈 Irmão — 19 pts

```
/meus-palpites
```
- [ ] Cada um vê os 3 palpites com `resultado X-Y · N pts`, com bandeiras.

---

## 7. Crons (automação)

### 7.1. Diário

```
/admin-cron job:diario
```
- [ ] Posta no `CANAL_RESULTADOS` os 3 jogos com placar + top palpiteiros + ranking.
- [ ] Os posts mostram bandeiras nos placares (🇧🇷 3 x 1 🇦🇷).
- [ ] Tenta rodar de novo → não duplica posts.

### 7.2. Matinal

Cadastra um jogo com kickoff pra **hoje** (qualquer horário do dia em BRT):

```
/admin-jogo add fase:oitavas time_casa:Teste3 time_fora:Teste4 kickoff:2026-06-17 23:00
/admin-cron job:matinal
```
- [ ] Posta no `CANAL_PALPITES` os jogos do dia com horário em ambos os fusos.

### 7.3. Deadline (a cada minuto)

Pra testar, cadastra jogo cujo deadline seja **agora**:

```
/admin-jogo add fase:oitavas time_casa:Teste5 time_fora:Teste6 kickoff:<+1h05min>
```

Espera ~6 min (a janela do cron é 5 min):

- [ ] Aparece no `CANAL_PALPITES`:
      **"🔒 Palpites do #X Teste5 x Teste6 estão fechados"**.

---

## 8. Limpeza pós-teste

Antes da Copa real começar, zera o banco e seed do zero:

```
node src/db/reset.js --confirmar
npm run seed:tudo
```

- [ ] `/ranking` vazio.
- [ ] `/jogos` mostra 32 jogos do mata-mata começando em `#1`, com bandeiras.

---

## Checkpoint final

Se todos os checkboxes acima estão marcados, o bot tá pronto pra produção.
Se algum valor não bateu, manda screenshot que eu investigo.
