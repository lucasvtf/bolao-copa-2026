import { pool } from '../db/pool.js';
import { MULTIPLICADOR } from '../utils/fase.js';

const FASE = 'oitavas';
const MULT = MULTIPLICADOR[FASE];

const JOGOS = [
  { num: 90, kickoff: '2026-07-04T17:00:00Z' }, // Venc.73 vs Venc.75 — NRG Stadium, Houston
  { num: 89, kickoff: '2026-07-04T21:00:00Z' }, // Venc.74 vs Venc.77 — Lincoln Financial Field, Filadélfia
  { num: 91, kickoff: '2026-07-05T20:00:00Z' }, // Venc.76 vs Venc.78 — MetLife Stadium, East Rutherford
  { num: 92, kickoff: '2026-07-06T00:00:00Z' }, // Venc.79 vs Venc.80 — Estádio Azteca, Cidade do México
  { num: 93, kickoff: '2026-07-06T19:00:00Z' }, // Venc.83 vs Venc.84 — AT&T Stadium, Arlington
  { num: 94, kickoff: '2026-07-07T00:00:00Z' }, // Venc.81 vs Venc.82 — Lumen Field, Seattle
  { num: 95, kickoff: '2026-07-07T16:00:00Z' }, // Venc.86 vs Venc.88 — Mercedes-Benz Stadium, Atlanta
  { num: 96, kickoff: '2026-07-07T20:00:00Z' }, // Venc.85 vs Venc.87 — BC Place, Vancouver
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
  console.log(`Seed oitavas OK — inseridos: ${inseridos}, atualizados: ${atualizados}`);
} catch (err) {
  console.error('Falha no seed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
