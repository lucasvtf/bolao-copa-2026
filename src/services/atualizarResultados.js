import { pool } from '../db/pool.js';
import { fetchKnockoutMatches } from './footballData.js';

function extrairResultado(match, jogo) {
  const fullCasa = match.score?.fullTime?.home ?? 0;
  const fullFora = match.score?.fullTime?.away ?? 0;
  const extraCasa = match.score?.extraTime?.home ?? 0;
  const extraFora = match.score?.extraTime?.away ?? 0;

  const placarCasa = fullCasa + extraCasa;
  const placarFora = fullFora + extraFora;
  const foiPenaltis = match.score?.duration === 'PENALTY_SHOOTOUT';

  let classificado = null;
  if (placarCasa > placarFora) {
    classificado = jogo.time_casa;
  } else if (placarFora > placarCasa) {
    classificado = jogo.time_fora;
  } else if (foiPenaltis) {
    const penCasa = match.score?.penalties?.home ?? 0;
    const penFora = match.score?.penalties?.away ?? 0;
    classificado = penCasa > penFora ? jogo.time_casa : jogo.time_fora;
  }
  return { placarCasa, placarFora, foiPenaltis, classificado };
}

export async function atualizarResultados() {
  const matches = await fetchKnockoutMatches();
  const stats = { atualizados: 0, ignorados: 0, inconsistentes: 0 };

  for (const m of matches) {
    if (m.status !== 'FINISHED') {
      stats.ignorados++;
      continue;
    }
    const { rows } = await pool.query(
      `SELECT id, time_casa, time_fora, placar_casa
         FROM jogos WHERE external_id = $1`,
      [m.id],
    );
    if (rows.length === 0) {
      stats.ignorados++;
      continue;
    }
    const jogo = rows[0];
    if (jogo.placar_casa !== null) {
      stats.ignorados++;
      continue;
    }

    const r = extrairResultado(m, jogo);
    if (!r.classificado) {
      console.warn(`[atualizarResultados] jogo ${jogo.id} inconsistente, pulando`);
      stats.inconsistentes++;
      continue;
    }

    await pool.query(
      `UPDATE jogos
          SET placar_casa  = $1,
              placar_fora  = $2,
              classificado = $3,
              foi_penaltis = $4
        WHERE id = $5`,
      [r.placarCasa, r.placarFora, r.classificado, r.foiPenaltis, jogo.id],
    );
    stats.atualizados++;
  }
  return stats;
}
