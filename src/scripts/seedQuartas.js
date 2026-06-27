import { pool } from '../db/pool.js';
import { MULTIPLICADOR } from '../utils/fase.js';

const FASE = 'quartas';
const MULT = MULTIPLICADOR[FASE];

const JOGOS = [
  { num: 97,  kickoff: '2026-07-09T20:00:00Z' }, // Venc.89 vs Venc.90 — Gillette Stadium, Foxborough
  { num: 98,  kickoff: '2026-07-10T19:00:00Z' }, // Venc.93 vs Venc.94 — SoFi Stadium, Inglewood
  { num: 99,  kickoff: '2026-07-11T21:00:00Z' }, // Venc.91 vs Venc.92 — Hard Rock Stadium, Miami
  { num: 100, kickoff: '2026-07-12T01:00:00Z' }, // Venc.95 vs Venc.96 — Arrowhead Stadium, Kansas City
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
  console.log(`Seed quartas OK — inseridos: ${inseridos}, atualizados: ${atualizados}`);
} catch (err) {
  console.error('Falha no seed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
