import { pool } from '../db/pool.js';
import { fetchKnockoutMatches } from './footballData.js';
import { apiStageToFase, MULTIPLICADOR } from '../utils/fase.js';

const UPSERT = `
  INSERT INTO jogos (external_id, fase, time_casa, time_fora, kickoff, multiplicador)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (external_id) WHERE external_id IS NOT NULL
  DO UPDATE SET
    fase          = EXCLUDED.fase,
    time_casa     = EXCLUDED.time_casa,
    time_fora     = EXCLUDED.time_fora,
    kickoff       = EXCLUDED.kickoff,
    multiplicador = EXCLUDED.multiplicador
  WHERE jogos.processado = FALSE
  RETURNING id, (xmax = 0) AS inserido
`;

function nomeTime(team) {
  return team?.shortName || team?.name || team?.tla || 'TBD';
}

export async function importarJogos() {
  const matches = await fetchKnockoutMatches();
  const stats = { inseridos: 0, atualizados: 0, ignorados: 0 };

  for (const m of matches) {
    const fase = apiStageToFase(m.stage);
    if (!fase) {
      stats.ignorados++;
      continue;
    }
    const params = [
      m.id,
      fase,
      nomeTime(m.homeTeam),
      nomeTime(m.awayTeam),
      m.utcDate,
      MULTIPLICADOR[fase],
    ];
    const { rows } = await pool.query(UPSERT, params);
    if (rows.length === 0) {
      stats.ignorados++;
    } else if (rows[0].inserido) {
      stats.inseridos++;
    } else {
      stats.atualizados++;
    }
  }
  return stats;
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
               process.argv[1]?.endsWith('importMatches.js');

if (isMain) {
  try {
    const s = await importarJogos();
    console.log(`Import OK — inseridos: ${s.inseridos}, atualizados: ${s.atualizados}, ignorados: ${s.ignorados}`);
  } catch (err) {
    console.error('Falha no import:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
