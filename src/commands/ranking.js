import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';

const TOP_N = 20;

export const data = new SlashCommandBuilder()
  .setName('ranking')
  .setDescription('Ranking geral do bolão.');

export async function execute(interaction) {
  const { rows } = await pool.query(
    `SELECT id, username, pontos_total
       FROM usuarios
      ORDER BY pontos_total DESC, username ASC
      LIMIT $1`,
    [TOP_N],
  );

  if (rows.length === 0) {
    return interaction.reply({ content: 'Ninguém pontuou ainda.', ephemeral: true });
  }

  const linhas = rows.map((u, i) => {
    const pos = String(i + 1).padStart(2, ' ');
    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    return `${medalha} \`${pos}.\` <@${u.id}> — **${u.pontos_total}** pts`;
  });

  const embed = new EmbedBuilder()
    .setTitle('🏆 Ranking do bolão')
    .setDescription(linhas.join('\n'))
    .setColor(0xfee75c);

  await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}
