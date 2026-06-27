import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { FASES } from '../utils/fase.js';
import { formatKickoffDuplo } from '../utils/data.js';
import { comBandeira } from '../utils/bandeiras.js';

const LIMIT = 35;

export const data = new SlashCommandBuilder()
  .setName('jogos')
  .setDescription('Próximos jogos do mata-mata.')
  .addStringOption((o) =>
    o
      .setName('fase')
      .setDescription('Filtrar por fase (default: todas)')
      .addChoices(...FASES.map((f) => ({ name: f, value: f }))),
  );

export async function execute(interaction) {
  const fase = interaction.options.getString('fase');

  const { rows } = await pool.query(
    `SELECT j.id, j.fase, j.time_casa, j.time_fora, j.kickoff,
            (p.id IS NOT NULL) AS palpitou
       FROM jogos j
       LEFT JOIN palpites p ON p.jogo_id = j.id AND p.usuario_id = $1
      WHERE j.placar_casa IS NULL
        AND j.kickoff > now()
        AND ($2::text IS NULL OR j.fase = $2)
      ORDER BY j.kickoff ASC
      LIMIT $3`,
    [String(interaction.user.id), fase, LIMIT],
  );

  if (rows.length === 0) {
    return interaction.reply({
      content: fase ? `Nenhum jogo aberto na fase **${fase}**.` : 'Nenhum jogo aberto pra palpitar.',
      ephemeral: true,
    });
  }

  const grupos = new Map();
  for (const j of rows) {
    if (!grupos.has(j.fase)) grupos.set(j.fase, []);
    grupos.get(j.fase).push(j);
  }

  const blocos = [...grupos.entries()].map(([nomeFase, jogos]) => {
    const linhas = jogos.map((j) => {
      const marca = j.palpitou ? '✅' : '⏳';
      return `${marca} **#${j.id}** ${comBandeira(j.time_casa)} x ${comBandeira(j.time_fora)}\n   ${formatKickoffDuplo(j.kickoff)}`;
    });
    return `**${nomeFase}** (${jogos.length})\n${linhas.join('\n')}`;
  });

  const embed = new EmbedBuilder()
    .setTitle('⚽ Próximos jogos')
    .setDescription(blocos.join('\n\n'))
    .setFooter({ text: '✅ você já palpitou  ·  ⏳ palpite aberto  ·  deadline = 1h antes do kick-off' })
    .setColor(0x57f287);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}
