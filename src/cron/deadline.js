import cron from 'node-cron';
import { pool } from '../db/pool.js';
import { getCanal } from '../utils/canais.js';
import { comBandeira } from '../utils/bandeiras.js';

export function registerDeadline(client) {
  cron.schedule('* * * * *', () => rodarDeadline(client).catch((e) => console.error('[deadline]', e)));
  console.log('[cron] deadline registrado (1 min)');
}

export async function rodarDeadline(client) {
  const { rows: jogos } = await pool.query(`
    SELECT id, fase, time_casa, time_fora, kickoff
      FROM jogos
     WHERE placar_casa IS NULL
       AND aviso_deadline_postado = FALSE
       AND (kickoff - INTERVAL '1 hour') BETWEEN now() - INTERVAL '5 minutes' AND now()
     ORDER BY kickoff ASC
  `);

  if (jogos.length === 0) return;

  const canal = await getCanal(client, 'CANAL_PALPITES');

  for (const j of jogos) {
    if (canal) {
      await canal.send(`🔒 Palpites do **#${j.id} ${comBandeira(j.time_casa)} x ${comBandeira(j.time_fora)}** (${j.fase}) estão fechados.`);
    }
    await pool.query('UPDATE jogos SET aviso_deadline_postado = TRUE WHERE id = $1', [j.id]);
  }
}
