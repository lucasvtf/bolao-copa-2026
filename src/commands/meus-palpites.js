import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { formatKickoffDuplo } from '../utils/data.js';
import { comBandeira } from '../utils/bandeiras.js';

const LIMIT = 25;

export const data = new SlashCommandBuilder()
  .setName('meus-palpites')
  .setDescription('Lista os seus palpites com status e pontos.');

export async function execute(interaction) {
  const { rows } = await pool.query(
    `SELECT j.id            AS jogo_id,
            j.fase,
            j.time_casa,
            j.time_fora,
            j.kickoff,
            j.placar_casa   AS placar_real_casa,
            j.placar_fora   AS placar_real_fora,
            j.classificado,
            j.processado,
            p.placar_casa   AS palpite_casa,
            p.placar_fora   AS palpite_fora,
            p.avanca,
            p.pontos
       FROM palpites p
       JOIN jogos j ON j.id = p.jogo_id
      WHERE p.usuario_id = $1
      ORDER BY j.kickoff ASC
      LIMIT $2`,
    [String(interaction.user.id), LIMIT],
  );

  if (rows.length === 0) {
    return interaction.reply({ content: 'Você ainda não palpitou em nenhum jogo.', ephemeral: true });
  }

  const linhas = rows.map((r) => {
    const palpite = `${r.palpite_casa}-${r.palpite_fora}${r.avanca ? ` (→ ${comBandeira(r.avanca)})` : ''}`;
    let status;
    if (r.processado) {
      const real = `${r.placar_real_casa}-${r.placar_real_fora}${r.classificado ? ` (→ ${comBandeira(r.classificado)})` : ''}`;
      status = `resultado **${real}** · **${r.pontos ?? 0} pts**`;
    } else if (r.placar_real_casa !== null) {
      status = `resultado **${r.placar_real_casa}-${r.placar_real_fora}** · _aguardando processamento_`;
    } else {
      status = `_${formatKickoffDuplo(r.kickoff)}_`;
    }
    return `**#${r.jogo_id}** ${comBandeira(r.time_casa)} x ${comBandeira(r.time_fora)} · _${r.fase}_\n→ palpite: \`${palpite}\` · ${status}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`Palpites de ${interaction.user.username}`)
    .setDescription(linhas.join('\n\n'))
    .setColor(0x5865f2);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
