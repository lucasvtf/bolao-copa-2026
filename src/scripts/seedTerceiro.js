import { pool } from '../db/pool.js';
import { MULTIPLICADOR } from '../utils/fase.js';

const FASE = 'terceiro';
const MULT = MULTIPLICADOR[FASE];

const JOGOS = [
  { num: 103, kickoff: '2026-07-18T22:00:00Z' }, // Perd.101 vs Perd.102 — Hard Rock Stadium, Miami
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
  console.log(`Seed terceiro OK — inseridos: ${inseridos}, atualizados: ${atualizados}`);
} catch (err) {
  console.error('Falha no seed:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
