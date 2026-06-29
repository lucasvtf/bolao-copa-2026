import { SlashCommandBuilder } from 'discord.js';
import { requireAdmin } from '../utils/admin.js';
import { processarJogo, ProcessamentoError } from '../services/processarJogo.js';
import { comBandeira } from '../utils/bandeiras.js';
import { logarAcao } from '../db/audit.js';

export const data = new SlashCommandBuilder()
  .setName('admin-processar')
  .setDescription('Calcula a pontuação dos palpites de um jogo (admin).')
  .addIntegerOption((o) => o.setName('jogo_id').setDescription('ID do jogo').setRequired(true))
  .addBooleanOption((o) => o.setName('force').setDescription('Reprocessar mesmo se já processado'));

export async function execute(interaction) {
  if (!(await requireAdmin(interaction))) return;

  const jogoId = interaction.options.getInteger('jogo_id');
  const force = interaction.options.getBoolean('force') ?? false;

  try {
    const r = await processarJogo(jogoId, { force });

    await logarAcao(interaction, 'processar', {
      jogoId,
      detalhes: { force, palpites: r.processados },
    });

    const top = [...r.detalhes]
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, 30)
      .map((d) => `<@${d.usuario_id}>: ${d.pontos} pts`)
      .join('\n') || '_(nenhum palpite)_';

    await interaction.reply({
      content: [
        `Jogo #${r.jogo.id} **${comBandeira(r.jogo.time_casa)} ${r.jogo.placar_casa} x ${r.jogo.placar_fora} ${comBandeira(r.jogo.time_fora)}** processado.`,
        `Palpites: ${r.processados} · multiplicador: ${r.jogo.multiplicador}×`,
        '',
        top,
      ].join('\n'),
      ephemeral: true,
    });
  } catch (err) {
    if (err instanceof ProcessamentoError) {
      return interaction.reply({ content: err.message, ephemeral: true });
    }
    throw err;
  }
}
