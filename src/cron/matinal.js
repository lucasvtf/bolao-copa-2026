import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { importarJogos } from '../services/importMatches.js';
import { getCanal } from '../utils/canais.js';
import { formatKickoffDuplo } from '../utils/data.js';
import { comBandeira } from '../utils/bandeiras.js';

export function registerMatinal(client) {
  cron.schedule('0 9 * * *', () => rodarMatinal(client).catch((e) => console.error('[matinal]', e)), {
    timezone: 'America/Sao_Paulo',
  });
  console.log('[cron] matinal registrado (9h BRT)');
}

export async function rodarMatinal(client) {
  if (process.env.FOOTBALL_API_KEY && process.env.IMPORTAR_NO_MATINAL === 'true') {
    try {
      const result = await importarJogos();
      console.log('[matinal] importarJogos:', result);
    } catch (err) {
      console.error('[matinal] API falhou (segue com jogos manuais):', err.message);
    }
  }

  const { rows: jogos } = await pool.query(`
    SELECT id, fase, time_casa, time_fora, kickoff
      FROM jogos
     WHERE placar_casa IS NULL
       AND (kickoff AT TIME ZONE 'America/Sao_Paulo')::date
           = (now() AT TIME ZONE 'America/Sao_Paulo')::date
     ORDER BY kickoff ASC
  `);

  if (jogos.length === 0) {
    console.log('[matinal] sem jogos hoje');
    return;
  }
  const canal = await getCanal(client, 'CANAL_PALPITES');
  if (!canal) return;

  const linhas = jogos.map((j) => {
    const deadline = new Date(new Date(j.kickoff).getTime() - 3600 * 1000);
    return [
      `**#${j.id}** ${comBandeira(j.time_casa)} x ${comBandeira(j.time_fora)} · _${j.fase}_`,
      `→ kick-off ${formatKickoffDuplo(j.kickoff)}`,
      `→ deadline ${formatKickoffDuplo(deadline)}`,
    ].join('\n');
  });

  const embed = new EmbedBuilder()
    .setTitle('☀️ Jogos de hoje')
    .setDescription(linhas.join('\n\n'))
    .setFooter({ text: 'Use /palpitar pra registrar seu palpite.' })
    .setColor(0xfee75c);
  await canal.send({ embeds: [embed] });
}
