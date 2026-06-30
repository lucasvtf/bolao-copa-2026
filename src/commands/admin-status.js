import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { pool } from '../db/pool.js';
import { requireAdmin } from '../utils/admin.js';
import { comBandeira } from '../utils/bandeiras.js';
import { formatKickoff } from '../utils/data.js';

export const data = new SlashCommandBuilder()
  .setName('admin-status')
  .setDescription('Lista o status de todos os jogos (admin).');

export async function execute(interaction) {
  if (!(await requireAdmin(interaction))) return;

  const { rows } = await pool.query(
    `SELECT id, fase, time_casa, time_fora, kickoff,
            placar_casa, placar_fora, classificado, processado, resultado_postado
       FROM jogos
      ORDER BY kickoff ASC`,
  );

  const processados = [];
  const aguardandoProc = [];
  const aguardandoJogo = [];

  for (const j of rows) {
    const titulo = `\`#${String(j.id).padStart(2, ' ')}\` ${comBandeira(j.time_casa)} x ${comBandeira(j.time_fora)} · _${j.fase}_`;
    if (j.processado) {
      const flag = j.resultado_postado ? '' : ' ⚠️ não postado';
      processados.push(`${titulo} → **${j.placar_casa}-${j.placar_fora}**${flag}`);
    } else if (j.placar_casa !== null) {
      aguardandoProc.push(`${titulo} → **${j.placar_casa}-${j.placar_fora}**`);
    } else {
      aguardandoJogo.push(`${titulo} · ${formatKickoff(j.kickoff)}`);
    }
  }

  const blocos = [];
  if (processados.length) blocos.push(`**✅ Processados (${processados.length})**\n${processados.join('\n')}`);
  if (aguardandoProc.length) blocos.push(`**⏳ Aguardando processamento (${aguardandoProc.length})**\n${aguardandoProc.join('\n')}`);
  if (aguardandoJogo.length) blocos.push(`**📅 Aguardando jogo (${aguardandoJogo.length})**\n${aguardandoJogo.join('\n')}`);

  const embed = new EmbedBuilder()
    .setTitle(`Status dos jogos (${rows.length})`)
    .setDescription(blocos.join('\n\n').slice(0, 4096))
    .setColor(0x5865f2);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
