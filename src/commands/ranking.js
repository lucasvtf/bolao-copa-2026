import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';

const TOP_N = 30;

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

  let posAtual = 0;
  let pontosAnterior = null;
  const linhas = rows.map((u, i) => {
    if (u.pontos_total !== pontosAnterior) {
      posAtual = i + 1;
      pontosAnterior = u.pontos_total;
    }
    const pos = String(posAtual).padStart(2, ' ');
    const medalha = posAtual === 1 ? '🥇' : posAtual === 2 ? '🥈' : posAtual === 3 ? '🥉' : '  ';
    return `${medalha} \`${pos}.\` <@${u.id}> — **${u.pontos_total}** pts`;
  });

  const embed = new EmbedBuilder()
    .setTitle('🏆 Ranking do bolão')
    .setDescription(linhas.join('\n'))
    .setColor(0xfee75c);

  await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
}
