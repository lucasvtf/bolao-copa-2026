import { pool } from '../db/pool.js';
import { MULTIPLICADOR } from '../utils/fase.js';

const FASE = 'dezesseisavos';
const MULT = MULTIPLICADOR[FASE];

// Bracket original ao lado serve como referência pra editar os times depois.
// Sede também é só lembrete (não armazenamos no banco).
const JOGOS = [
  { num: 73, kickoff: '2026-06-28T19:00:00Z' }, // 2º A vs 2º B — SoFi Stadium, Inglewood
  { num: 74, kickoff: '2026-06-29T16:00:00Z' }, // 1º E vs 3º A/B/C/D/F — Gillette Stadium, Foxborough
  { num: 75, kickoff: '2026-06-29T22:30:00Z' }, // 1º F vs 2º C — Estádio BBVA Bancomer, Monterrey
  { num: 76, kickoff: '2026-06-30T00:00:00Z' }, // 1º C vs 2º F — NRG Stadium, Houston
  { num: 78, kickoff: '2026-06-30T17:00:00Z' }, // 2º E vs 2º I — AT&T Stadium, Arlington
  { num: 77, kickoff: '2026-06-30T21:00:00Z' }, // 1º I vs 3º C/D/F/G/H — MetLife Stadium, East Rutherford
  { num: 79, kickoff: '2026-07-01T01:00:00Z' }, // 1º A vs 3º C/E/F/H/I — Estádio Azteca, Cidade do México
  { num: 80, kickoff: '2026-07-01T16:00:00Z' }, // 1º L vs 3º E/H/I/J/K — Mercedes-Benz Stadium, Atlanta
  { num: 82, kickoff: '2026-07-01T20:00:00Z' }, // 1º G vs 3º A/E/H/I/J — Lumen Field, Seattle
  { num: 81, kickoff: '2026-07-02T00:00:00Z' }, // 1º D vs 3º B/E/F/I/J — Levi's Stadium, Santa Clara
  { num: 83, kickoff: '2026-07-02T16:00:00Z' }, // 2º K vs 2º L — BMO Field, Toronto
  { num: 84, kickoff: '2026-07-02T19:00:00Z' }, // 1º H vs 2º J — SoFi Stadium, Inglewood
  { num: 85, kickoff: '2026-07-03T03:00:00Z' }, // 1º B vs 3º E/F/G/I/J — BC Place, Vancouver
  { num: 88, kickoff: '2026-07-03T18:00:00Z' }, // 2º D vs 2º G — AT&T Stadium, Arlington
  { num: 86, kickoff: '2026-07-03T22:00:00Z' }, // 1º J vs 2º H — Hard Rock Stadium, Miami
  { num: 87, kickoff: '2026-07-04T01:30:00Z' }, // 1º K vs 3º D/E/I/J/L — Arrowhead Stadium, Kansas City
];

const UPSERT = `
  INSERT INTO jogos (external_id, fase, time_casa, time_fora, kickoff, multiplicador)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE
    SET fase          = EXCLUDED.fase,
        time_casa     = EXCLUDED.time_casa,
        time_fora     = EXCLUDED.time_fora,
        kickoff       = EXCLUDED.kickoff,
        multiplicador = EXCLUDED.multiplicador
    WHERE jogos.processado = FALSE
  RETURNING id, (xmax = 0) AS inserido
`;

try {
  let inseridos = 0;
  let atualizados = 0;
  for (const j of JOGOS) {
    const externalId = 26000000 + j.num;
    const { rows } = await pool.query(UPSERT, [externalId, FASE, 'TBD', 'TBD', j.kickoff, MULT]);
    if (rows.length === 0) continue;
    rows[0].inserido ? inseridos++ : atualizados++;
  }
  console.log(`Seed 16 avos OK — inseridos: ${inseridos}, atualizados: ${atualizados}`);
} catch (err) {
  console.error('Falha no seed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
