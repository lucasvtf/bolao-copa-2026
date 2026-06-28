import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { atualizarResultados } from '../services/atualizarResultados.js';
import { processarJogo } from '../services/processarJogo.js';
import { getCanal } from '../utils/canais.js';
import { comBandeira } from '../utils/bandeiras.js';

export function registerDiario(client) {
  cron.schedule('0 23 * * *', () => rodarDiario(client).catch((e) => console.error('[diario]', e)), {
    timezone: 'America/Sao_Paulo',
  });
  console.log('[cron] diário registrado (23h BRT)');
}

export async function rodarDiario(client) {
  if (process.env.FOOTBALL_API_KEY) {
    try {
      const s = await atualizarResultados();
      console.log('[diario] atualizarResultados:', s);
    } catch (err) {
      console.error('[diario] API falhou (segue com resultados manuais):', err.message);
    }
  }

  const { rows: jogos } = await pool.query(`
    SELECT id, fase, time_casa, time_fora, placar_casa, placar_fora,
           classificado, foi_penaltis, multiplicador, processado
      FROM jogos
     WHERE placar_casa IS NOT NULL
       AND resultado_postado = FALSE
     ORDER BY kickoff ASC
  `);

  if (jogos.length === 0) {
    console.log('[diario] nada pra postar');
    return;
  }

  const canalResultados = await getCanal(client, 'CANAL_RESULTADOS');
  const canalRanking = await getCanal(client, 'CANAL_RANKING');

  for (const jogo of jogos) {
    let detalhes = [];
    if (!jogo.processado) {
      try {
        const r = await processarJogo(jogo.id);
        detalhes = r.detalhes;
      } catch (err) {
        console.error('[diario] processarJogo:', err.message);
        continue;
      }
    } else {
      const { rows } = await pool.query(
        'SELECT usuario_id, pontos FROM palpites WHERE jogo_id = $1',
        [jogo.id],
      );
      detalhes = rows;
    }
    if (canalResultados) await canalResultados.send(montarPostResultado(jogo, detalhes));
    await pool.query('UPDATE jogos SET resultado_postado = TRUE WHERE id = $1', [jogo.id]);
  }

  if (canalRanking) await canalRanking.send(await montarPostRanking());
}

function montarPostResultado(jogo, detalhes) {
  const top = [...detalhes]
    .filter((d) => (d.pontos ?? 0) > 0)
    .sort((a, b) => (b.pontos ?? 0) - (a.pontos ?? 0))
    .slice(0, 5)
    .map((d, i) => `\`${i + 1}.\` <@${d.usuario_id}> — **${d.pontos}** pts`)
    .join('\n');

  const linhas = [
    `Fase: **${jogo.fase}** (×${jogo.multiplicador})`,
    `Classificado: **${comBandeira(jogo.classificado)}**${jogo.foi_penaltis ? ' · pênaltis' : ''}`,
    '',
    top || '_Ninguém pontuou_',
  ];

  const embed = new EmbedBuilder()
    .setTitle(`🏁 ${comBandeira(jogo.time_casa)} ${jogo.placar_casa} x ${jogo.placar_fora} ${comBandeira(jogo.time_fora)}`)
    .setDescription(linhas.join('\n'))
    .setColor(0x57f287);

  return { embeds: [embed], allowedMentions: { parse: [] } };
}

async function montarPostRanking() {
  const { rows } = await pool.query(
    `SELECT id, pontos_total FROM usuarios
      ORDER BY pontos_total DESC, username ASC
      LIMIT 30`,
  );
  let posAtual = 0;
  let pontosAnterior = null;
  const linhas = rows.length
    ? rows.map((u) => {
        if (u.pontos_total !== pontosAnterior) {
          posAtual += 1;
          pontosAnterior = u.pontos_total;
        }
        const pos = String(posAtual).padStart(2, ' ');
        const medalha = posAtual === 1 ? '🥇' : posAtual === 2 ? '🥈' : posAtual === 3 ? '🥉' : '  ';
        return `${medalha} \`${pos}.\` <@${u.id}> — **${u.pontos_total}** pts`;
      })
    : ['_(vazio)_'];

  const embed = new EmbedBuilder()
    .setTitle('🏆 Ranking parcial')
    .setDescription(linhas.join('\n'))
    .setColor(0xfee75c);
  return { embeds: [embed], allowedMentions: { parse: [] } };
}
